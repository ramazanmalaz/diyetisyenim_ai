import { createAdminClient } from "@/lib/supabase/admin";

// Panelden düzenlenebilen tarife ayarları için varsayılanlar (DB boş/erişilemezse).
export const SETTING_DEFAULTS = {
  subscription_price: "199.00", // aylık fiyat
  subscription_title: "Premium (Aylık)",
  premium_days: "30",
  annual_price: "1990.00", // yıllık fiyat
  annual_title: "Premium (Yıllık)",
  annual_days: "365",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export type PlanKey = "monthly" | "annual";

export type Plan = {
  key: PlanKey;
  price: string;
  title: string;
  days: number;
};

export type Pricing = { monthly: Plan; annual: Plan };

function parseDays(v: string, fallback: number): number {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Tüm ayarları (varsayılanlarla harmanlanmış) döndürür. */
export async function getSettings(): Promise<Record<SettingKey, string>> {
  const map: Record<string, string> = { ...SETTING_DEFAULTS };
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("app_settings").select("key, value");
    (data ?? []).forEach((r) => {
      if (r.value != null) map[r.key] = r.value;
    });
  } catch {
    // Tablo henüz yoksa varsayılanlar kullanılır.
  }
  return map as Record<SettingKey, string>;
}

/** Aylık + yıllık tarifeyi tek yerden döndürür. */
export async function getPricing(): Promise<Pricing> {
  const s = await getSettings();
  return {
    monthly: {
      key: "monthly",
      price: s.subscription_price || SETTING_DEFAULTS.subscription_price,
      title: s.subscription_title || SETTING_DEFAULTS.subscription_title,
      days: parseDays(s.premium_days, 30),
    },
    annual: {
      key: "annual",
      price: s.annual_price || SETTING_DEFAULTS.annual_price,
      title: s.annual_title || SETTING_DEFAULTS.annual_title,
      days: parseDays(s.annual_days, 365),
    },
  };
}

/** Plan anahtarına göre ilgili paketi döndürür. */
export function selectPlan(pricing: Pricing, key: PlanKey): Plan {
  return key === "annual" ? pricing.annual : pricing.monthly;
}
