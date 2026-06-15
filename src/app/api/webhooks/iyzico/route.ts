import { NextResponse, type NextRequest } from "next/server";

import { retrieveCheckout } from "@/lib/payments/iyzico";
import { createAdminClient } from "@/lib/supabase/admin";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * iyzico Checkout Form geri dönüş (callback) noktası.
 * iyzico ödeme sonrası buraya `token` ile POST yapar; sonucu token üzerinden
 * sorgulayıp (doğrulama) payments kaydını güncelleriz.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const token = form?.get("token");

  if (typeof token !== "string" || !token) {
    return NextResponse.redirect(new URL("/abonelik?odeme=hata", APP_URL), 303);
  }

  let paid = false;
  try {
    const result = await retrieveCheckout(token);
    paid = result.success;
  } catch {
    paid = false;
  }

  // Sonucu kaydet (service-role; kullanıcı oturumu yok).
  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .update({ status: paid ? "paid" : "failed" })
    .eq("provider_ref", token)
    .select("client_id, premium_days")
    .maybeSingle();

  // Ödeme başarılıysa, ödemenin taşıdığı gün kadar premium uzat (mevcut süreye ekle).
  if (paid && payment?.client_id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("premium_until")
      .eq("id", payment.client_id)
      .maybeSingle();
    const now = Date.now();
    const current = profile?.premium_until
      ? new Date(profile.premium_until).getTime()
      : 0;
    const base = Math.max(now, current);
    const days = payment.premium_days && payment.premium_days > 0
      ? payment.premium_days
      : 30;
    const until = new Date(base + days * 86_400_000).toISOString();
    await admin
      .from("profiles")
      .update({ premium_until: until })
      .eq("id", payment.client_id);
  }

  return NextResponse.redirect(
    new URL(`/abonelik?odeme=${paid ? "basarili" : "hata"}`, APP_URL),
    303,
  );
}
