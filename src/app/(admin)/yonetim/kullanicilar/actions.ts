"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { error: string } | { success: true };

const grantSchema = z
  .object({
    userId: z.string().uuid(),
    days: z.coerce.number().int().min(1).max(3650).optional(),
    until: z.string().optional(), // "YYYY-MM-DD"
  })
  .refine((v) => v.days !== undefined || (v.until && v.until.trim() !== ""), {
    message: "Gün sayısı veya tarih gerekli.",
  });

/** Kullanıcıya premium tanımlar: gün ekler (mevcut süreye) veya kesin tarihe ayarlar. */
export async function grantPremium(values: unknown): Promise<ActionResult> {
  await requireStaff();
  const parsed = grantSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  }

  const admin = createAdminClient();
  let until: string;

  if (parsed.data.until && parsed.data.until.trim() !== "") {
    const d = new Date(`${parsed.data.until}T23:59:59`);
    if (Number.isNaN(d.getTime())) return { error: "Geçersiz tarih." };
    until = d.toISOString();
  } else {
    const days = parsed.data.days ?? 30;
    const { data: prof } = await admin
      .from("profiles")
      .select("premium_until")
      .eq("id", parsed.data.userId)
      .maybeSingle();
    const now = Date.now();
    const current = prof?.premium_until
      ? new Date(prof.premium_until).getTime()
      : 0;
    const base = Math.max(now, current);
    until = new Date(base + days * 86_400_000).toISOString();
  }

  const { error } = await admin
    .from("profiles")
    .update({ premium_until: until })
    .eq("id", parsed.data.userId);
  if (error) return { error: "Güncellenemedi." };

  revalidatePath("/yonetim/kullanicilar");
  return { success: true };
}

/** Kullanıcının premium erişimini kaldırır (ücretsiz plana döndürür). */
export async function revokePremium(values: unknown): Promise<ActionResult> {
  await requireStaff();
  const parsed = z
    .object({ userId: z.string().uuid() })
    .safeParse(values);
  if (!parsed.success) return { error: "Geçersiz veri." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ premium_until: null })
    .eq("id", parsed.data.userId);
  if (error) return { error: "Kaldırılamadı." };

  revalidatePath("/yonetim/kullanicilar");
  return { success: true };
}
