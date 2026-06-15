import { createAdminClient } from "@/lib/supabase/admin";

// Panelden düzenlenebilen tarife ayarları için varsayılanlar (DB boş/erişilemezse).
export const SETTING_DEFAULTS = {
  subscription_price: "199.00",
  subscription_title: "Premium (Aylık)",
  premium_days: "30",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export type Pricing = {
  price: string;
  title: string;
  premiumDays: number;
};

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

/** Tarife bilgisini (fiyat/başlık/premium gün) tek yerden döndürür. */
export async function getPricing(): Promise<Pricing> {
  const s = await getSettings();
  const days = parseInt(s.premium_days, 10);
  return {
    price: s.subscription_price || SETTING_DEFAULTS.subscription_price,
    title: s.subscription_title || SETTING_DEFAULTS.subscription_title,
    premiumDays: Number.isFinite(days) && days > 0 ? days : 30,
  };
}
