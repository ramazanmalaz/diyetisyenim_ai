"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getUser } from "@/lib/auth";
import { foodMealFields } from "@/lib/foods";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { error: string } | { success: true };

const MEAL_TYPE_ENUM = z.enum([
  "breakfast",
  "snack_morning",
  "lunch",
  "snack_afternoon",
  "dinner",
]);

export type StructuredMeal = {
  id: string;
  day_of_week: number;
  meal_type: (typeof MEAL_TYPE_ENUM)["_output"];
  content: string;
  calories: number;
  food_id: string;
  quantity: number;
};

const updateSchema = z.object({
  mealId: z.string().uuid(),
  content: z.string().min(1, "İçerik boş olamaz.").max(200),
  calories: z.coerce.number().int().min(0).max(3000),
});

/**
 * Bir öğenin sahibinin (planın danışanı) giriş yapan kullanıcı olduğunu doğrular.
 * meals/diet_plans yazımı RLS'de personele kısıtlı olduğu için işlemler
 * service-role ile yapılır; sahiplik burada elle denetlenir.
 */
async function assertOwnership(
  admin: ReturnType<typeof createAdminClient>,
  mealId: string,
  userId: string,
): Promise<boolean> {
  const { data: meal } = await admin
    .from("meals")
    .select("plan_id")
    .eq("id", mealId)
    .single();
  if (!meal) return false;
  const { data: plan } = await admin
    .from("diet_plans")
    .select("client_id")
    .eq("id", meal.plan_id)
    .single();
  return plan?.client_id === userId;
}

export async function updateMeal(values: unknown): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const parsed = updateSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  }

  const admin = createAdminClient();
  if (!(await assertOwnership(admin, parsed.data.mealId, user.id))) {
    return { error: "Bu öğeyi düzenleme yetkin yok." };
  }

  const { error } = await admin
    .from("meals")
    .update({ content: parsed.data.content, calories: parsed.data.calories })
    .eq("id", parsed.data.mealId);
  if (error) return { error: "Kaydedilemedi." };

  revalidatePath("/plan");
  return { success: true };
}

const addSchema = z.object({
  planId: z.string().uuid(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  mealType: z.enum([
    "breakfast",
    "snack_morning",
    "lunch",
    "snack_afternoon",
    "dinner",
  ]),
  content: z.string().min(1, "İçerik boş olamaz.").max(200),
  calories: z.coerce.number().int().min(0).max(3000),
});

export type AddResult = { error: string } | { id: string };

export async function addMealItem(values: unknown): Promise<AddResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const parsed = addSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  }

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("diet_plans")
    .select("client_id")
    .eq("id", parsed.data.planId)
    .single();
  if (plan?.client_id !== user.id) {
    return { error: "Bu plana öğe ekleme yetkin yok." };
  }

  const { data, error } = await admin
    .from("meals")
    .insert({
      plan_id: parsed.data.planId,
      day_of_week: parsed.data.dayOfWeek,
      meal_type: parsed.data.mealType,
      content: parsed.data.content,
      calories: parsed.data.calories,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Öğe eklenemedi." };

  revalidatePath("/plan");
  return { id: data.id };
}

export async function deleteMealItem(values: unknown): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const parsed = z.object({ mealId: z.string().uuid() }).safeParse(values);
  if (!parsed.success) return { error: "Geçersiz öğe." };

  const admin = createAdminClient();
  if (!(await assertOwnership(admin, parsed.data.mealId, user.id))) {
    return { error: "Bu öğeyi silme yetkin yok." };
  }

  await admin.from("meals").delete().eq("id", parsed.data.mealId);
  revalidatePath("/plan");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Yapılandırılmış (besin + adet) öğeler — kalori otomatik hesaplanır
// ---------------------------------------------------------------------------
async function fetchFood(
  admin: ReturnType<typeof createAdminClient>,
  foodId: string,
) {
  const { data } = await admin
    .from("foods")
    .select("name, unit_label, kcal_per_unit")
    .eq("id", foodId)
    .single();
  return data;
}

export type FoodMealResult =
  | { error: string }
  | { meal: StructuredMeal };

export async function addFoodMeal(values: unknown): Promise<FoodMealResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const parsed = z
    .object({
      planId: z.string().uuid(),
      dayOfWeek: z.coerce.number().int().min(0).max(6),
      mealType: MEAL_TYPE_ENUM,
      foodId: z.string().uuid(),
      quantity: z.coerce.number().positive().max(50),
    })
    .safeParse(values);
  if (!parsed.success) return { error: "Geçersiz veri." };

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("diet_plans")
    .select("client_id")
    .eq("id", parsed.data.planId)
    .single();
  if (plan?.client_id !== user.id) return { error: "Yetkin yok." };

  const food = await fetchFood(admin, parsed.data.foodId);
  if (!food) return { error: "Besin bulunamadı." };

  const { calories, content } = foodMealFields(food, parsed.data.quantity);
  const { data, error } = await admin
    .from("meals")
    .insert({
      plan_id: parsed.data.planId,
      day_of_week: parsed.data.dayOfWeek,
      meal_type: parsed.data.mealType,
      content,
      calories,
      food_id: parsed.data.foodId,
      quantity: parsed.data.quantity,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Eklenemedi." };

  revalidatePath("/plan");
  return {
    meal: {
      id: data.id,
      day_of_week: parsed.data.dayOfWeek,
      meal_type: parsed.data.mealType,
      content,
      calories,
      food_id: parsed.data.foodId,
      quantity: parsed.data.quantity,
    },
  };
}

export type RecalcResult =
  | { error: string }
  | { calories: number; content: string; quantity: number; foodId: string };

/** Adet değiştir → kaloriyi öğenin besinine göre yeniden hesapla. */
export async function setMealQuantity(values: unknown): Promise<RecalcResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const parsed = z
    .object({
      mealId: z.string().uuid(),
      quantity: z.coerce.number().positive().max(50),
    })
    .safeParse(values);
  if (!parsed.success) return { error: "Geçersiz adet." };

  const admin = createAdminClient();
  if (!(await assertOwnership(admin, parsed.data.mealId, user.id))) {
    return { error: "Yetkin yok." };
  }
  const { data: meal } = await admin
    .from("meals")
    .select("food_id")
    .eq("id", parsed.data.mealId)
    .single();
  if (!meal?.food_id) return { error: "Bu öğe besinden seçilmemiş." };

  const food = await fetchFood(admin, meal.food_id);
  if (!food) return { error: "Besin bulunamadı." };

  const { calories, content } = foodMealFields(food, parsed.data.quantity);
  await admin
    .from("meals")
    .update({ quantity: parsed.data.quantity, calories, content })
    .eq("id", parsed.data.mealId);
  revalidatePath("/plan");
  return {
    calories,
    content,
    quantity: parsed.data.quantity,
    foodId: meal.food_id,
  };
}

/** Besini değiştir (listeden) → kaloriyi yeniden hesapla. */
export async function swapMealFood(values: unknown): Promise<RecalcResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const parsed = z
    .object({
      mealId: z.string().uuid(),
      foodId: z.string().uuid(),
      quantity: z.coerce.number().positive().max(50).optional(),
    })
    .safeParse(values);
  if (!parsed.success) return { error: "Geçersiz veri." };

  const admin = createAdminClient();
  if (!(await assertOwnership(admin, parsed.data.mealId, user.id))) {
    return { error: "Yetkin yok." };
  }
  const { data: meal } = await admin
    .from("meals")
    .select("quantity")
    .eq("id", parsed.data.mealId)
    .single();

  const food = await fetchFood(admin, parsed.data.foodId);
  if (!food) return { error: "Besin bulunamadı." };

  const qty = parsed.data.quantity ?? meal?.quantity ?? 1;
  const { calories, content } = foodMealFields(food, qty);
  await admin
    .from("meals")
    .update({
      food_id: parsed.data.foodId,
      quantity: qty,
      calories,
      content,
    })
    .eq("id", parsed.data.mealId);
  revalidatePath("/plan");
  return { calories, content, quantity: qty, foodId: parsed.data.foodId };
}
