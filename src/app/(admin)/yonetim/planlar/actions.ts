"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  createPlanSchema,
  MAX_PLAN_WEEKS,
  mealSchema,
  planStatusSchema,
  updateMealSchema,
} from "@/lib/validations/plan";

export type ActionResult = { error: string } | { success: true };

const emptyToNull = (v?: string) => (v && v.trim() !== "" ? v : null);

export async function createPlan(values: unknown): Promise<ActionResult> {
  const profile = await requireStaff();
  const parsed = createPlanSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diet_plans")
    .insert({
      client_id: parsed.data.clientId,
      created_by: profile.id,
      title: parsed.data.title,
      valid_from: emptyToNull(parsed.data.validFrom),
      valid_to: emptyToNull(parsed.data.validTo),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Plan oluşturulamadı." };
  }

  revalidatePath("/yonetim/planlar");
  redirect(`/yonetim/planlar/${data.id}`);
}

export async function setPlanStatus(values: unknown): Promise<ActionResult> {
  await requireStaff();
  const parsed = planStatusSchema.safeParse(values);
  if (!parsed.success) return { error: "Geçersiz durum." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("diet_plans")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.planId);

  if (error) return { error: "Durum güncellenemedi." };

  revalidatePath(`/yonetim/planlar/${parsed.data.planId}`);
  revalidatePath("/yonetim/planlar");
  return { success: true };
}

export async function addMeal(values: unknown): Promise<ActionResult> {
  await requireStaff();
  const parsed = mealSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz öğün." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("meals").insert({
    plan_id: parsed.data.planId,
    week_index: parsed.data.weekIndex,
    day_of_week: parsed.data.dayOfWeek,
    meal_type: parsed.data.mealType,
    content: parsed.data.content,
    calories: parsed.data.calories ?? null,
  });

  if (error) return { error: "Öğün eklenemedi." };

  revalidatePath(`/yonetim/planlar/${parsed.data.planId}`);
  return { success: true };
}

const MEAL_COPY_COLUMNS =
  "day_of_week, meal_type, content, calories, food_id, quantity, sort_order, protein_g, carb_g, fat_g, recipe, tip";

/**
 * Bir haftanın tüm öğünlerini yeni bir haftaya kopyalar.
 * 8 haftalık program kurarken her haftayı sıfırdan girmek yerine kopyalayıp
 * üzerinde oynamak için — asıl kullanım şekli bu.
 */
export async function duplicateWeek(values: unknown): Promise<ActionResult> {
  await requireStaff();
  const parsed = z
    .object({
      planId: z.string().uuid(),
      fromWeek: z.coerce.number().int().min(0).max(MAX_PLAN_WEEKS - 1),
    })
    .safeParse(values);
  if (!parsed.success) return { error: "Geçersiz hafta." };

  const supabase = await createClient();

  // Mevcut en yüksek hafta → yeni hafta onun bir fazlası.
  const { data: existing, error: readError } = await supabase
    .from("meals")
    .select("week_index")
    .eq("plan_id", parsed.data.planId);

  if (readError) return { error: "Plan okunamadı." };

  const maxWeek = (existing ?? []).reduce(
    (mx, m) => Math.max(mx, m.week_index ?? 0),
    0,
  );
  const target = maxWeek + 1;
  if (target > MAX_PLAN_WEEKS - 1)
    return { error: `En fazla ${MAX_PLAN_WEEKS} hafta olabilir.` };

  const { data: sourceMeals } = await supabase
    .from("meals")
    .select(MEAL_COPY_COLUMNS)
    .eq("plan_id", parsed.data.planId)
    .eq("week_index", parsed.data.fromWeek);

  if (!sourceMeals || sourceMeals.length === 0)
    return { error: "Kopyalanacak öğün yok." };

  const { error } = await supabase.from("meals").insert(
    sourceMeals.map((m) => ({
      ...m,
      plan_id: parsed.data.planId,
      week_index: target,
    })),
  );
  if (error) return { error: "Hafta kopyalanamadı." };

  revalidatePath(`/yonetim/planlar/${parsed.data.planId}`);
  return { success: true };
}

/**
 * Bir haftayı siler ve sonraki haftaları bir aşağı kaydırır — aksi halde
 * hafta numaralarında boşluk kalır ve danışan tarafındaki döngü
 * (weeksSinceStart % weekCount) boş haftaya denk gelir.
 */
export async function deleteWeek(values: unknown): Promise<ActionResult> {
  await requireStaff();
  const parsed = z
    .object({
      planId: z.string().uuid(),
      weekIndex: z.coerce.number().int().min(0).max(MAX_PLAN_WEEKS - 1),
    })
    .safeParse(values);
  if (!parsed.success) return { error: "Geçersiz hafta." };

  const supabase = await createClient();
  const { planId, weekIndex } = parsed.data;

  const { error: delError } = await supabase
    .from("meals")
    .delete()
    .eq("plan_id", planId)
    .eq("week_index", weekIndex);
  if (delError) return { error: "Hafta silinemedi." };

  // Sonraki haftaları bir aşağı çek (boşluk kalmasın).
  const { data: later } = await supabase
    .from("meals")
    .select("id, week_index")
    .eq("plan_id", planId)
    .gt("week_index", weekIndex);

  for (const m of later ?? []) {
    await supabase
      .from("meals")
      .update({ week_index: (m.week_index ?? 0) - 1 })
      .eq("id", m.id);
  }

  revalidatePath(`/yonetim/planlar/${planId}`);
  return { success: true };
}

/** Var olan öğünün içeriğini/kalorisini günceller (atanan plan üzerinde düzenleme). */
export async function updateMeal(values: unknown): Promise<ActionResult> {
  await requireStaff();
  const parsed = updateMealSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz öğün." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meals")
    .update({
      content: parsed.data.content,
      calories: parsed.data.calories ?? null,
    })
    .eq("id", parsed.data.mealId)
    .select("plan_id")
    .single();

  // RLS engellerse satır dönmez → yetkisiz düzenleme sessizce geçmesin.
  if (error || !data) return { error: "Öğün güncellenemedi." };

  revalidatePath(`/yonetim/planlar/${data.plan_id}`);
  return { success: true };
}

/** Öğünü id ile siler (satır içi editör için — form action değil). */
export async function deleteMealById(mealId: unknown): Promise<ActionResult> {
  await requireStaff();
  const parsed = z.string().uuid().safeParse(mealId);
  if (!parsed.success) return { error: "Geçersiz öğün." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meals")
    .delete()
    .eq("id", parsed.data)
    .select("plan_id")
    .single();

  // RLS engellerse satır dönmez → yetkisiz silme sessizce başarılı görünmesin.
  if (error || !data) return { error: "Öğün silinemedi." };

  revalidatePath(`/yonetim/planlar/${data.plan_id}`);
  return { success: true };
}

export async function deleteMeal(formData: FormData): Promise<void> {
  await requireStaff();
  const mealId = z.string().uuid().safeParse(formData.get("mealId"));
  const planId = z.string().uuid().safeParse(formData.get("planId"));
  if (!mealId.success || !planId.success) return;

  const supabase = await createClient();
  await supabase.from("meals").delete().eq("id", mealId.data);
  revalidatePath(`/yonetim/planlar/${planId.data}`);
}

export async function deletePlan(formData: FormData): Promise<void> {
  await requireStaff();
  const planId = z.string().uuid().safeParse(formData.get("planId"));
  if (!planId.success) return;

  const supabase = await createClient();
  await supabase.from("diet_plans").delete().eq("id", planId.data);
  revalidatePath("/yonetim/planlar");
  redirect("/yonetim/planlar");
}
