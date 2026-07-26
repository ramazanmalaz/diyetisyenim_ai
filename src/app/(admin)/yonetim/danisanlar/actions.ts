"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import {
  resolveDirectConvId,
  resolveGroupConvId,
} from "@/lib/chat/conversations";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { error: string } | { ok: true };

// ─── Danışan oluştur ──────────────────────────────────────────────────────────
const createSchema = z.object({
  email: z.string().email("Geçerli e-posta girin"),
  full_name: z.string().min(2, "En az 2 karakter").max(100),
  password: z.string().min(6, "En az 6 karakter").max(72),
});

export async function createClientAccount(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const dietitian = await requireStaff();
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
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

  await admin
    .from("profiles")
    .update({ dietitian_id: dietitian.id, full_name: parsed.data.full_name })
    .eq("id", data.user.id);

  // Grup sohbetine ekle
  const groupId = await resolveGroupConvId(
    admin,
    dietitian.id,
    dietitian.full_name,
  );
  if (groupId) {
    await admin
      .from("conversation_members")
      .upsert({ conversation_id: groupId, user_id: data.user.id });
  }

  revalidatePath("/yonetim/danisanlar");
  return { ok: true };
}

// ─── Plan ata ─────────────────────────────────────────────────────────────────
export async function assignPlan(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const dietitian = await requireStaff();
  const clientId = z.string().uuid().safeParse(formData.get("client_id"));
  const planId = z.string().uuid().safeParse(formData.get("plan_id"));
  if (!clientId.success || !planId.success)
    return { error: "Geçersiz giriş" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("dietitian_id")
    .eq("id", clientId.data)
    .single();

  if (profile?.dietitian_id !== dietitian.id)
    return { error: "Yetkisiz işlem" };

  // Mevcut aktif planları arşivle
  await admin
    .from("diet_plans")
    .update({ status: "archived" })
    .eq("client_id", clientId.data)
    .eq("status", "active");

  // Seçilen planı bu danışana ata ve aktifleştir
  await admin
    .from("diet_plans")
    .update({ client_id: clientId.data, status: "active" })
    .eq("id", planId.data);

  revalidatePath(`/yonetim/danisanlar/${clientId.data}`);
  return { ok: true };
}

// ─── Premium ver ─────────────────────────────────────────────────────────────
export async function grantClientPremium(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const dietitian = await requireStaff();
  const clientId = z.string().uuid().safeParse(formData.get("client_id"));
  const days = z.coerce
    .number()
    .int()
    .min(1)
    .max(366)
    .safeParse(formData.get("days"));
  if (!clientId.success || !days.success) return { error: "Geçersiz giriş" };

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("dietitian_id, premium_until")
    .eq("id", clientId.data)
    .single();

  if (data?.dietitian_id !== dietitian.id) return { error: "Yetkisiz işlem" };

  const base =
    data.premium_until && new Date(data.premium_until) > new Date()
      ? new Date(data.premium_until)
      : new Date();
  base.setDate(base.getDate() + days.data);

  await admin
    .from("profiles")
    .update({ premium_until: base.toISOString() })
    .eq("id", clientId.data);

  revalidatePath(`/yonetim/danisanlar/${clientId.data}`);
  return { ok: true };
}

// ─── Danışan bağlantısını kopar ──────────────────────────────────────────────
export async function unlinkClient(formData: FormData): Promise<void> {
  const dietitian = await requireStaff();
  const clientId = z.string().uuid().parse(formData.get("client_id") as string);

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("dietitian_id")
    .eq("id", clientId)
    .single();

  if (data?.dietitian_id !== dietitian.id)
    throw new Error("Yetkisiz işlem");

  await admin
    .from("profiles")
    .update({ dietitian_id: null })
    .eq("id", clientId);

  revalidatePath("/yonetim/danisanlar");
  redirect("/yonetim/danisanlar");
}

// ─── Diyetisyen → danışan birebir sohbet ─────────────────────────────────────
export async function openClientChat(formData: FormData): Promise<void> {
  const dietitian = await requireStaff();
  const clientId = z
    .string()
    .uuid()
    .parse(formData.get("client_id") as string);

  const admin = createAdminClient();
  const id = await resolveDirectConvId(
    admin,
    dietitian.id,
    clientId,
    dietitian.full_name,
  );
  redirect(id ? `/sohbet/${id}` : "/sohbet");
}

// ─── Grup sohbetini aç ───────────────────────────────────────────────────────
export async function openGroupChat(): Promise<void> {
  const dietitian = await requireStaff();
  const admin = createAdminClient();
  const id = await resolveGroupConvId(
    admin,
    dietitian.id,
    dietitian.full_name,
  );
  redirect(id ? `/sohbet/${id}` : "/sohbet");
}
