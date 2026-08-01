"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import { generatePlanMeals } from "@/lib/ai/plan";
import { getActiveDietitianRules } from "@/lib/ai/rules";
import { assignPlanCopy } from "@/lib/diet/assign";
import { createAdminClient } from "@/lib/supabase/admin";

export type TemplateResult = { error: string } | { ok: true };

// ─── Boş şablon oluştur (öğünleri elle girilir) ──────────────────────────────
const createSchema = z.object({
  title: z.string().min(2, "Başlık en az 2 karakter").max(120),
  dailyTarget: z.coerce.number().int().min(800).max(5000).optional(),
});

export async function createTemplate(
  _prev: TemplateResult | null,
  formData: FormData,
): Promise<TemplateResult> {
  const staff = await requireStaff();
  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    dailyTarget: formData.get("daily_target") || undefined,
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz giriş" };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("diet_plans")
    .insert({
      client_id: null,
      created_by: staff.id,
      title: parsed.data.title,
      status: "draft",
      is_template: true,
      source: "manual",
      daily_calorie_target: parsed.data.dailyTarget ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Şablon oluşturulamadı." };

  revalidatePath("/yonetim/planlar");
  redirect(`/yonetim/planlar/${data.id}`);
}

// ─── AI ile şablon üret ──────────────────────────────────────────────────────
const aiSchema = z.object({
  title: z.string().min(2, "Başlık en az 2 karakter").max(120),
  dailyTarget: z.coerce.number().int().min(800).max(5000),
  brief: z.string().max(500).optional(),
});

/**
 * Diyetisyenin verdiği kalori hedefi + serbest tarife göre 7 günlük şablon
 * üretir. Danışan onboarding'indeki generatePlanMeals ile aynı altyapı.
 */
export async function createTemplateWithAi(
  _prev: TemplateResult | null,
  formData: FormData,
): Promise<TemplateResult> {
  const staff = await requireStaff();
  const parsed = aiSchema.safeParse({
    title: formData.get("title"),
    dailyTarget: formData.get("daily_target"),
    brief: formData.get("brief") || undefined,
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz giriş" };

  let meals;
  try {
    const rules = await getActiveDietitianRules();
    meals = await generatePlanMeals({
      dietitianRules: rules,
      dailyTarget: parsed.data.dailyTarget,
      intakeSummary:
        parsed.data.brief?.trim() ||
        `Genel yetişkin, günlük ${parsed.data.dailyTarget} kcal hedefli dengeli program`,
    });
  } catch (e) {
    console.error(
      "[planlar] AI şablon üretilemedi:",
      e instanceof Error ? e.message : e,
    );
    return { error: "Program üretilemedi. Lütfen tekrar dene." };
  }

  const admin = createAdminClient();
  const { data: plan, error } = await admin
    .from("diet_plans")
    .insert({
      client_id: null,
      created_by: staff.id,
      title: parsed.data.title,
      status: "draft",
      is_template: true,
      source: "ai",
      daily_calorie_target: parsed.data.dailyTarget,
    })
    .select("id")
    .single();

  if (error || !plan) return { error: "Şablon kaydedilemedi." };

  const { error: mealError } = await admin.from("meals").insert(
    meals.map((m, i) => ({
      plan_id: plan.id,
      day_of_week: m.day_of_week,
      meal_type: m.meal_type,
      content: m.item,
      calories: m.calories,
      sort_order: i,
      week_index: 0,
    })),
  );

  if (mealError) {
    await admin.from("diet_plans").delete().eq("id", plan.id);
    return { error: "Öğünler kaydedilemedi." };
  }

  revalidatePath("/yonetim/planlar");
  redirect(`/yonetim/planlar/${plan.id}`);
}

// ─── Şablonu danışana ata (kopyalar) ─────────────────────────────────────────
export async function assignTemplateToClient(
  _prev: TemplateResult | null,
  formData: FormData,
): Promise<TemplateResult> {
  const staff = await requireStaff();
  const planId = z.string().uuid().safeParse(formData.get("plan_id"));
  const clientId = z.string().uuid().safeParse(formData.get("client_id"));
  if (!planId.success || !clientId.success) return { error: "Geçersiz giriş" };

  const admin = createAdminClient();
  const isAdminRole = staff.role === "admin";

  const [{ data: source }, { data: target }] = await Promise.all([
    admin.from("diet_plans").select("created_by").eq("id", planId.data).single(),
    admin
      .from("profiles")
      .select("dietitian_id")
      .eq("id", clientId.data)
      .single(),
  ]);

  if (!source || !target) return { error: "Plan ya da danışan bulunamadı." };
  if (!isAdminRole && source.created_by !== staff.id)
    return { error: "Yetkisiz işlem" };
  if (!isAdminRole && target.dietitian_id !== staff.id)
    return { error: "Bu danışan sana bağlı değil." };

  const result = await assignPlanCopy(admin, {
    sourcePlanId: planId.data,
    clientId: clientId.data,
    createdBy: staff.id,
  });
  if ("error" in result) return result;

  revalidatePath(`/yonetim/danisanlar/${clientId.data}`);
  revalidatePath("/yonetim/planlar");
  redirect(`/yonetim/planlar/${result.planId}`);
}
