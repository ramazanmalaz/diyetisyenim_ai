"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { error: string } | { success: true };

const priceRe = /^\d+(\.\d{1,2})?$/;

const schema = z.object({
  monthlyPrice: z.string().regex(priceRe, "Aylık fiyat 199.00 biçiminde olmalı."),
  monthlyTitle: z.string().trim().min(1, "Aylık başlık boş olamaz.").max(80),
  monthlyDays: z.coerce.number().int().min(1).max(3650),
  annualPrice: z.string().regex(priceRe, "Yıllık fiyat 1990.00 biçiminde olmalı."),
  annualTitle: z.string().trim().min(1, "Yıllık başlık boş olamaz.").max(80),
  annualDays: z.coerce.number().int().min(1).max(3650),
});

/** Aylık + yıllık tarife ayarlarını app_settings'e yazar. */
export async function savePricing(values: unknown): Promise<ActionResult> {
  await requireStaff();
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  }
  const v = parsed.data;

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("app_settings").upsert(
    [
      { key: "subscription_price", value: v.monthlyPrice, updated_at: now },
      { key: "subscription_title", value: v.monthlyTitle.trim(), updated_at: now },
      { key: "premium_days", value: String(v.monthlyDays), updated_at: now },
      { key: "annual_price", value: v.annualPrice, updated_at: now },
      { key: "annual_title", value: v.annualTitle.trim(), updated_at: now },
      { key: "annual_days", value: String(v.annualDays), updated_at: now },
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
