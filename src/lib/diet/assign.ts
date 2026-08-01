import type { createAdminClient } from "@/lib/supabase/admin";
import { MAX_ASSIGN_WEEKS, MIN_ASSIGN_WEEKS } from "@/lib/validations/plan";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Kopyalanan öğün alanları — şablonun tüm içeriği danışana taşınır. */
const MEAL_COLUMNS =
  "day_of_week, meal_type, content, calories, food_id, quantity, sort_order, week_index, protein_g, carb_g, fat_g, recipe, tip";

export type AssignResult = { error: string } | { ok: true; planId: string };

/**
 * Bir planı (şablon ya da mevcut plan) danışana KOPYALAYARAK atar.
 *
 * Kopyalama şart: şablon tekrar tekrar kullanılabilmeli ve danışanın planı
 * sonradan bağımsız düzenlenebilmeli. (Önceki sürüm client_id'yi değiştirerek
 * planı TAŞIYORDU → şablon tükeniyordu.)
 *
 * `durationWeeks` programın KAÇ HAFTA süreceğidir (içerik haftası sayısı
 * değil). Danışan tarafı valid_from/valid_to'dan toplam süreyi, meals'ın
 * week_index'inden içerik haftalarını okur ve içerik süreden kısaysa döngüler.
 *
 * Danışanın önceki aktif planı arşivlenir.
 */
export async function assignPlanCopy(
  admin: AdminClient,
  params: {
    sourcePlanId: string;
    clientId: string;
    createdBy: string;
    durationWeeks?: number;
  },
): Promise<AssignResult> {
  const { sourcePlanId, clientId, createdBy } = params;

  const { data: source } = await admin
    .from("diet_plans")
    .select(
      "title, daily_calorie_target, estimated_weeks, goal_loss_kg, source, valid_from, valid_to",
    )
    .eq("id", sourcePlanId)
    .single();

  if (!source) return { error: "Plan bulunamadı." };

  // Süre verilmişse bugünden itibaren N hafta; yoksa kaynağın tarihleri.
  let validFrom = source.valid_from;
  let validTo = source.valid_to;
  let estimatedWeeks = source.estimated_weeks;

  if (params.durationWeeks != null) {
    const weeks = Math.min(
      MAX_ASSIGN_WEEKS,
      Math.max(MIN_ASSIGN_WEEKS, Math.round(params.durationWeeks)),
    );
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + weeks * 7);
    validFrom = start.toISOString().slice(0, 10);
    validTo = end.toISOString().slice(0, 10);
    estimatedWeeks = weeks;
  }

  // Önceki aktif planı arşivle (danışanın tek aktif planı olur).
  await admin
    .from("diet_plans")
    .update({ status: "archived" })
    .eq("client_id", clientId)
    .eq("status", "active");

  const { data: created, error: planError } = await admin
    .from("diet_plans")
    .insert({
      client_id: clientId,
      created_by: createdBy,
      title: source.title,
      status: "active",
      is_template: false,
      daily_calorie_target: source.daily_calorie_target,
      estimated_weeks: estimatedWeeks,
      goal_loss_kg: source.goal_loss_kg,
      source: source.source,
      valid_from: validFrom,
      valid_to: validTo,
    })
    .select("id")
    .single();

  if (planError || !created) return { error: "Plan oluşturulamadı." };

  const { data: meals } = await admin
    .from("meals")
    .select(MEAL_COLUMNS)
    .eq("plan_id", sourcePlanId);

  if (meals && meals.length > 0) {
    const { error: mealError } = await admin
      .from("meals")
      .insert(meals.map((m) => ({ ...m, plan_id: created.id })));

    if (mealError) {
      // Yarım plan bırakma — öğünler yazılamadıysa planı da geri al.
      await admin.from("diet_plans").delete().eq("id", created.id);
      return { error: "Öğünler kopyalanamadı." };
    }
  }

  return { ok: true, planId: created.id };
}
