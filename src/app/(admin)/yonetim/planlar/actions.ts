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
 * Dolu günlerdeki menüleri seçilen günlere sırayla tekrarlayarak yayar.
 *
 * Neden gerekli: fotoğraf/PDF okuması çoğu zaman 1-2 günlük bir şablon
 * döndürüyor (ör. "normal gün" + "pazar günü"). Diyetisyen haftanın kalanını
 * elle doldurmak zorunda kalmasın diye tek tıkla çoğaltılıyor.
 *
 * Kaynak = bu haftada öğünü olan ve HEDEF olarak seçilmemiş günler.
 * Hedef günlerdeki mevcut öğünler silinip kaynak günlerden sırayla kopyalanır.
 */
export async function spreadWeekDays(values: unknown): Promise<ActionResult> {
  await requireStaff();
  const parsed = z
    .object({
      planId: z.string().uuid(),
      weekIndex: z.coerce.number().int().min(0).max(MAX_PLAN_WEEKS - 1),
      targetDays: z.array(z.coerce.number().int().min(0).max(6)).min(1),
    })
    .safeParse(values);
  if (!parsed.success) return { error: "Geçersiz seçim." };

  const { planId, weekIndex, targetDays } = parsed.data;
  const targets = [...new Set(targetDays)].sort((a, b) => a - b);

  const supabase = await createClient();
  const { data: weekMeals, error: readError } = await supabase
    .from("meals")
    .select(`id, ${MEAL_COPY_COLUMNS}`)
    .eq("plan_id", planId)
    .eq("week_index", weekIndex);

  if (readError) return { error: "Plan okunamadı." };

  const byDay = new Map<number, typeof weekMeals>();
  for (const m of weekMeals ?? []) {
    const arr = byDay.get(m.day_of_week) ?? [];
    arr.push(m);
    byDay.set(m.day_of_week, arr);
  }

  // Kaynak: öğünü olan ama hedef seçilmemiş günler.
  const sourceDays = [...byDay.keys()]
    .filter((d) => !targets.includes(d))
    .sort((a, b) => a - b);

  if (sourceDays.length === 0)
    return {
      error:
        "Kaynak gün kalmadı — menüsü olan en az bir günü seçimin dışında bırak.",
    };

  // Hedef günlerdeki mevcut öğünleri temizle.
  const idsToDelete = targets.flatMap((d) =>
    (byDay.get(d) ?? []).map((m) => m.id),
  );
  if (idsToDelete.length > 0) {
    const { error } = await supabase
      .from("meals")
      .delete()
      .in("id", idsToDelete);
    if (error) return { error: "Hedef günler temizlenemedi." };
  }

  // Kaynakları sırayla hedeflere kopyala (id ve kaynak günü taşımadan).
  const rows = targets.flatMap((day, i) => {
    const src = byDay.get(sourceDays[i % sourceDays.length]) ?? [];
    return src.map((m) => ({
      plan_id: planId,
      week_index: weekIndex,
      day_of_week: day,
      meal_type: m.meal_type,
      content: m.content,
      calories: m.calories,
      food_id: m.food_id,
      quantity: m.quantity,
      sort_order: m.sort_order,
      protein_g: m.protein_g,
      carb_g: m.carb_g,
      fat_g: m.fat_g,
      recipe: m.recipe,
      tip: m.tip,
    }));
  });

  if (rows.length === 0) return { error: "Kopyalanacak öğün yok." };

  const { error } = await supabase.from("meals").insert(rows);
  if (error) return { error: "Günlere yayılamadı." };

  revalidatePath(`/yonetim/planlar/${planId}`);
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
