import { createAdminClient } from "@/lib/supabase/admin";

// Ücretsiz kullanıcı günlük limitleri (premium = sınırsız).
export const FREE_CHAT_LIMIT = 5;
export const FREE_VISION_LIMIT = 1;
// iyzico tek ödeme karşılığı premium erişim süresi.
export const PREMIUM_DAYS = 30;

export type AiKind = "chat" | "vision";

export type Entitlement = {
  isPremium: boolean;
  premiumUntil: string | null;
  chatUsed: number;
  chatLimit: number;
  visionUsed: number;
  visionLimit: number;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function premiumActive(premiumUntil: string | null | undefined): boolean {
  return !!premiumUntil && new Date(premiumUntil).getTime() > Date.now();
}

/** Kullanıcının premium durumu + bugünkü AI kullanımını döndürür. */
export async function getEntitlement(userId: string): Promise<Entitlement> {
  const admin = createAdminClient();
  const [{ data: profile }, { data: usage }] = await Promise.all([
    admin.from("profiles").select("premium_until").eq("id", userId).maybeSingle(),
    admin
      .from("ai_usage")
      .select("chat_count, vision_count")
      .eq("client_id", userId)
      .eq("day", today())
      .maybeSingle(),
  ]);

  return {
    isPremium: premiumActive(profile?.premium_until),
    premiumUntil: profile?.premium_until ?? null,
    chatUsed: usage?.chat_count ?? 0,
    chatLimit: FREE_CHAT_LIMIT,
    visionUsed: usage?.vision_count ?? 0,
    visionLimit: FREE_VISION_LIMIT,
  };
}

export type ConsumeResult =
  | { ok: true; isPremium: boolean }
  | { ok: false; kind: AiKind; limit: number };

/**
 * Bir AI işlemi için kredi tüketir. Ücretsiz kullanıcı günlük limiti aşarsa
 * { ok:false } döner (işlem yapılmamalı). Sayaç her durumda artırılır
 * (premium kullanım analitiği için). Yazma service-role ile yapılır.
 */
export async function consumeAiCredit(
  userId: string,
  kind: AiKind,
): Promise<ConsumeResult> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("premium_until")
    .eq("id", userId)
    .maybeSingle();
  const isPremium = premiumActive(profile?.premium_until);

  const day = today();
  const { data: usage } = await admin
    .from("ai_usage")
    .select("chat_count, vision_count")
    .eq("client_id", userId)
    .eq("day", day)
    .maybeSingle();
  const chat = usage?.chat_count ?? 0;
  const vision = usage?.vision_count ?? 0;

  if (!isPremium) {
    if (kind === "chat" && chat >= FREE_CHAT_LIMIT) {
      return { ok: false, kind, limit: FREE_CHAT_LIMIT };
    }
    if (kind === "vision" && vision >= FREE_VISION_LIMIT) {
      return { ok: false, kind, limit: FREE_VISION_LIMIT };
    }
  }

  await admin.from("ai_usage").upsert(
    {
      client_id: userId,
      day,
      chat_count: chat + (kind === "chat" ? 1 : 0),
      vision_count: vision + (kind === "vision" ? 1 : 0),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id,day" },
  );

  return { ok: true, isPremium };
}

/** Limit dolduğunda kullanıcıya gösterilecek yönlendirme metni (Markdown). */
export function upgradeMessage(kind: AiKind): string {
  const what =
    kind === "vision"
      ? "Günlük ücretsiz fotoğraf analizi hakkın doldu"
      : "Günlük ücretsiz mesaj hakkın doldu";
  return `${what}. Sınırsız sohbet ve fotoğraf analizi için **[Premium'a geç](/abonelik)** — ya da yarın tekrar dene. 🌱`;
}
