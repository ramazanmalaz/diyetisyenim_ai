"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string } | { success: true };

const createDietitianSchema = z.object({
  email: z.string().email("Geçerli e-posta girin"),
  full_name: z.string().min(2, "En az 2 karakter").max(100),
  password: z.string().min(6, "En az 6 karakter").max(72),
});

/** Sıfırdan bir auth hesabı oluşturur ve rolünü 'dietitian' olarak işaretler. */
export async function createDietitianAccount(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireStaff();
  const parsed = createDietitianSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz giriş" };

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: "Kullanıcı oluşturulamadı" };

  const { error: profileError } = await admin
    .from("profiles")
    .update({ role: "dietitian", full_name: parsed.data.full_name })
    .eq("id", data.user.id);
  if (profileError) return { error: "Rol atanamadı." };

  revalidatePath("/yonetim/kullanicilar");
  return { success: true };
}

/**
 * Kullanıcının rolünü değiştirir. profiles üzerindeki guard tetikleyicisi rol
 * değişikliğini auth.uid() personel mi diye denetlediği için service-role değil,
 * personelin OTURUMLU (server) istemcisi kullanılır. Kendi rolünü değiştirmek engellenir.
 */
export async function changeRole(values: unknown): Promise<ActionResult> {
  const me = await requireStaff();
  const parsed = z
    .object({
      userId: z.string().uuid(),
      role: z.enum(["client", "dietitian", "admin"]),
    })
    .safeParse(values);
  if (!parsed.success) return { error: "Geçersiz veri." };
  if (parsed.data.userId === me.id) {
    return { error: "Kendi rolünü buradan değiştiremezsin." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.userId);
  if (error) return { error: "Rol güncellenemedi." };

  revalidatePath("/yonetim/kullanicilar");
  return { success: true };
}

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
