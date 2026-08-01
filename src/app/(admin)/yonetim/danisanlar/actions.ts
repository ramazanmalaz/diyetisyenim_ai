"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import { resolveDirectConvId } from "@/lib/chat/conversations";
import { assignPlanCopy } from "@/lib/diet/assign";
import {
  MAX_ASSIGN_WEEKS,
  MIN_ASSIGN_WEEKS,
} from "@/lib/validations/plan";
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

  // Gruplara ekleme artık açık bir adım (/yonetim/gruplar) — otomatik değil.
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
  const weeks = z.coerce
    .number()
    .int()
    .min(MIN_ASSIGN_WEEKS)
    .max(MAX_ASSIGN_WEEKS)
    .safeParse(formData.get("duration_weeks"));
  if (!clientId.success || !planId.success)
    return { error: "Geçersiz giriş" };
  if (!weeks.success) return { error: "Süre 1-8 hafta arasında olmalı." };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("dietitian_id")
    .eq("id", clientId.data)
    .single();

  if (dietitian.role !== "admin" && profile?.dietitian_id !== dietitian.id)
    return { error: "Yetkisiz işlem" };

  // Kaynak plan bu diyetisyene ait olmalı (başkasının planı atanamaz).
  const { data: source } = await admin
    .from("diet_plans")
    .select("created_by")
    .eq("id", planId.data)
    .single();
  if (!source) return { error: "Plan bulunamadı." };
  if (dietitian.role !== "admin" && source.created_by !== dietitian.id)
    return { error: "Yetkisiz işlem" };

  // KOPYALAYARAK ata — şablon tükenmesin, danışanın kopyası bağımsız düzenlensin.
  const result = await assignPlanCopy(admin, {
    sourcePlanId: planId.data,
    clientId: clientId.data,
    createdBy: dietitian.id,
    durationWeeks: weeks.data,
  });
  if ("error" in result) return result;

  revalidatePath(`/yonetim/danisanlar/${clientId.data}`);
  revalidatePath("/yonetim/planlar");
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

  // Sahiplik: yalnızca kendi danışanıyla birebir sohbet açılabilir.
  const { data: target } = await admin
    .from("profiles")
    .select("dietitian_id")
    .eq("id", clientId)
    .single();
  if (dietitian.role !== "admin" && target?.dietitian_id !== dietitian.id)
    throw new Error("Yetkisiz işlem");

  const id = await resolveDirectConvId(
    admin,
    dietitian.id,
    clientId,
    dietitian.full_name,
  );
  redirect(id ? `/sohbet/${id}` : "/sohbet");
}
