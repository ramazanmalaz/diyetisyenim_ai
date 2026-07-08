import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * RevenueCat Webhook — abonelik olaylarını dinler.
 *
 * RevenueCat Dashboard → Project → Integrations → Webhooks:
 *   Endpoint URL  : https://uzmandiyet.com/api/webhooks/revenuecat
 *   Authorization : <REVENUECAT_WEBHOOK_SECRET değeri>
 *
 * İşlenen olaylar:
 *   INITIAL_PURCHASE → premium aktif (expiration_at_ms tarihine kadar)
 *   RENEWAL          → premium uzatıldı
 *   UNCANCELLATION   → iptal geri alındı, premium devam ediyor
 *   EXPIRATION       → abonelik sona erdi, premium kaldırıldı
 *   CANCELLATION     → dönem sonunda iptal; premium_until değişmez (EXPIRATION kaldırır)
 */

type RcEventType =
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "CANCELLATION"
  | "UNCANCELLATION"
  | "EXPIRATION"
  | "BILLING_ISSUE"
  | "SUBSCRIBER_ALIAS"
  | "TRANSFER"
  | string;

type RcEvent = {
  type: RcEventType;
  id: string;
  app_user_id: string;
  product_id: string;
  price: number | null;
  currency: string | null;
  /** Unix milisaniye — abonelik bitiş tarihi (EXPIRATION olayında null olabilir) */
  expiration_at_ms: number | null;
  period_type: "NORMAL" | "TRIAL" | "INTRO" | string;
};

type RcPayload = {
  api_version: string;
  event: RcEvent;
};

/** Abonelik süresine göre kaç gün premium tanımlıyoruz (kayıt için). */
function premiumDays(productId: string): number {
  if (productId.includes("annual")) return 365;
  return 30;
}

export async function POST(request: NextRequest) {
  // ── İmza doğrulama ──────────────────────────────────────────────────────────
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  const authHeader = request.headers.get("Authorization");
  if (!secret || authHeader !== secret) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // ── Payload parse ───────────────────────────────────────────────────────────
  let payload: RcPayload;
  try {
    payload = (await request.json()) as RcPayload;
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const event = payload.event;
  if (!event?.app_user_id) {
    return new NextResponse("Missing app_user_id", { status: 400 });
  }

  const userId = event.app_user_id;
  const admin = createAdminClient();

  // ── Olay işleme ─────────────────────────────────────────────────────────────
  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION": {
      const until = event.expiration_at_ms
        ? new Date(event.expiration_at_ms).toISOString()
        : null;

      if (!until) break;

      await Promise.all([
        // premium_until'i güncelle — mevcut süreyi geçmiyorsa koru (idempotent).
        admin
          .from("profiles")
          .update({ premium_until: until })
          .eq("id", userId)
          .or(`premium_until.is.null,premium_until.lt.${until}`),

        // Ödeme geçmişine kayıt ekle (idempotency: aynı event.id tekrar gelirse ignore).
        admin.from("payments").upsert(
          {
            client_id: userId,
            amount: event.price ?? 0,
            currency: event.currency ?? "TRY",
            provider: "apple",
            provider_ref: event.id,
            status: "paid",
            description: event.product_id,
            premium_days: premiumDays(event.product_id),
          },
          { onConflict: "provider_ref", ignoreDuplicates: true },
        ),
      ]);
      break;
    }

    case "EXPIRATION": {
      // Abonelik gerçekten sona erdi; premium'u kaldır.
      await admin
        .from("profiles")
        .update({ premium_until: null })
        .eq("id", userId);
      break;
    }

    // CANCELLATION: dönem sonunda iptal anlamına gelir; premium_until değişmez.
    // EXPIRATION olayı geldiğinde premium kaldırılır.
    default:
      break;
  }

  return new NextResponse("OK", { status: 200 });
}
