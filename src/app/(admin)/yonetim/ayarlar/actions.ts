"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { error: string } | { success: true };

const schema = z.object({
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Fiyat 199.00 biçiminde olmalı."),
  title: z.string().trim().min(1, "Başlık boş olamaz.").max(80),
  premiumDays: z.coerce.number().int().min(1).max(3650),
});

/** Tarife ayarlarını (fiyat/başlık/premium gün) app_settings'e yazar. */
export async function savePricing(values: unknown): Promise<ActionResult> {
  await requireStaff();
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("app_settings").upsert(
    [
      { key: "subscription_price", value: parsed.data.price, updated_at: now },
      {
        key: "subscription_title",
        value: parsed.data.title.trim(),
        updated_at: now,
      },
      {
        key: "premium_days",
        value: String(parsed.data.premiumDays),
        updated_at: now,
      },
    ],
    { onConflict: "key" },
  );
  if (error) return { error: "Kaydedilemedi." };

  // Fiyatın göründüğü tüm sayfaları tazele (statik sözleşme sayfaları dahil).
  revalidatePath("/yonetim/ayarlar");
  revalidatePath("/abonelik");
  revalidatePath("/mesafeli-satis");
  revalidatePath("/on-bilgilendirme");
  return { success: true };
}
