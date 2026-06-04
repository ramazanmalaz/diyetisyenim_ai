"use server";

import { redirect } from "next/navigation";

import { generatePlanMeals } from "@/lib/ai/plan";
import { getActiveDietitianRules } from "@/lib/ai/rules";
import { getUser } from "@/lib/auth";
import { computeCaloriePlan, ACTIVITY_LABEL } from "@/lib/diet/calories";
import { createAdminClient } from "@/lib/supabase/admin";
import { intakeSchema } from "@/lib/validations/intake";

export type GenerateResult = { error: string };

const SEX_LABEL = { female: "Kadın", male: "Erkek" } as const;

export async function generatePlan(values: unknown): Promise<GenerateResult> {
  const user = await getUser();
  if (!user) redirect("/giris");

  const parsed = intakeSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz bilgiler." };
  }
  const v = parsed.data;

  const cal = computeCaloriePlan({
    sex: v.sex,
    age: v.age,
    heightCm: v.heightCm,
    weightKg: v.currentWeightKg,
    activity: v.activity,
    goalLossKg: v.goalLossKg,
    goalWeeks: v.goalWeeks,
  });

  // diet_plans/meals yazımı RLS'de personele kısıtlı → service-role kullan.
  const admin = createAdminClient();

  await admin.from("intakes").insert({
    client_id: user.id,
    sex: v.sex,
    age: v.age,
    height_cm: v.heightCm,
    current_weight_kg: v.currentWeightKg,
    activity_level: v.activity,
    goal_loss_kg: v.goalLossKg,
    goal_weeks: v.goalWeeks,
    health_notes: v.healthNotes,
    dislikes: v.dislikes,
  });

  const intakeSummary = [
    `Cinsiyet: ${SEX_LABEL[v.sex]}`,
    `Yaş: ${v.age}`,
    `Boy: ${v.heightCm} cm`,
    `Kilo: ${v.currentWeightKg} kg`,
    `Aktivite: ${ACTIVITY_LABEL[v.activity]}`,
    `Hedef: ${v.goalLossKg} kg / ${v.goalWeeks} hafta`,
    v.healthNotes ? `Sağlık: ${v.healthNotes}` : null,
    v.dislikes ? `Sevmedikleri: ${v.dislikes}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const rules = await getActiveDietitianRules();

  let meals;
  try {
    meals = await generatePlanMeals({
      dietitianRules: rules,
      dailyTarget: cal.dailyTarget,
      intakeSummary,
    });
  } catch {
    return { error: "Plan oluşturulamadı. Lütfen tekrar dene." };
  }

  // Önceki aktif planları arşivle.
  await admin
    .from("diet_plans")
    .update({ status: "archived" })
    .eq("client_id", user.id)
    .eq("status", "active");

  const { data: plan, error: planError } = await admin
    .from("diet_plans")
    .insert({
      client_id: user.id,
      created_by: user.id,
      title: "Yapay Zekâ Diyet Programı",
      status: "active",
      source: "ai",
      daily_calorie_target: cal.dailyTarget,
      estimated_weeks: cal.estimatedWeeks,
      goal_loss_kg: v.goalLossKg,
    })
    .select("id")
    .single();

  if (planError || !plan) {
    return { error: "Plan kaydedilemedi." };
  }

  const rows = meals.map((m, i) => ({
    plan_id: plan.id,
    day_of_week: m.day_of_week,
    meal_type: m.meal_type,
    content: m.item,
    calories: m.calories,
    sort_order: i,
  }));
  await admin.from("meals").insert(rows);

  redirect("/plan");
}
