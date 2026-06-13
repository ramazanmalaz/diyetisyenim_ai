"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { analyzePlatePhoto, type ImageMediaType } from "@/lib/ai/respond";
import { getActiveDietitianRules } from "@/lib/ai/rules";
import { getUser } from "@/lib/auth";
import { foodMealFields } from "@/lib/foods";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
} from "@/lib/validations/progress";

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

export async function toggleMealChecked(
  values: unknown,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const parsed = z
    .object({ mealId: z.string().uuid(), checked: z.boolean() })
    .safeParse(values);
  if (!parsed.success) return { error: "Geçersiz veri." };

  const admin = createAdminClient();
  if (!(await assertOwnership(admin, parsed.data.mealId, user.id))) {
    return { error: "Yetkin yok." };
  }
  const { error } = await admin
    .from("meals")
    .update({ checked: parsed.data.checked })
    .eq("id", parsed.data.mealId);
  if (error) return { error: "Güncellenemedi." };

  revalidatePath("/plan");
  return { success: true };
}

/** Bir plandaki TÜM öğelerin "yapıldı" işaretini kaldırır (ilerlemeyi sıfırlar). */
export async function resetMealChecks(values: unknown): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const parsed = z
    .object({ planId: z.string().uuid() })
    .safeParse(values);
  if (!parsed.success) return { error: "Geçersiz plan." };

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("diet_plans")
    .select("client_id")
    .eq("id", parsed.data.planId)
    .single();
  if (plan?.client_id !== user.id) return { error: "Yetkin yok." };

  const { error } = await admin
    .from("meals")
    .update({ checked: false })
    .eq("plan_id", parsed.data.planId)
    .eq("checked", true);
  if (error) return { error: "Sıfırlanamadı." };

  revalidatePath("/plan");
  return { success: true };
}

/**
 * Aktif planı arşivler ve kullanıcıyı en başa (/baslangic) döndürür.
 * diet_plans yazımı RLS'de personele kısıtlı → service-role; sahiplik
 * client_id filtresiyle elle güvence altına alınır.
 */
export async function resetPlan(): Promise<void> {
  const user = await getUser();
  if (!user) redirect("/giris");

  const admin = createAdminClient();
  await admin
    .from("diet_plans")
    .update({ status: "archived" })
    .eq("client_id", user.id)
    .eq("status", "active");

  revalidatePath("/plan");
  redirect("/baslangic");
}

export type WaterResult = { error: string } | { total: number };

/** Bugünün su tüketimini günceller (delta ekler veya sıfırlar) ve yeni toplamı döndürür. */
export async function updateWater(values: unknown): Promise<WaterResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const parsed = z
    .object({
      deltaMl: z.coerce.number().int().min(-5000).max(5000).optional(),
      reset: z.boolean().optional(),
    })
    .safeParse(values);
  if (!parsed.success) return { error: "Geçersiz miktar." };

  const supabase = await createClient();
  const day = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("water_intake")
    .select("total_ml")
    .eq("client_id", user.id)
    .eq("day", day)
    .maybeSingle();

  const current = existing?.total_ml ?? 0;
  const next = parsed.data.reset
    ? 0
    : Math.max(0, Math.min(20000, current + (parsed.data.deltaMl ?? 0)));

  const { error } = await supabase.from("water_intake").upsert(
    {
      client_id: user.id,
      day,
      total_ml: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id,day" },
  );
  if (error) return { error: "Su kaydı güncellenemedi." };

  revalidatePath("/plan");
  return { total: next };
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
  | {
      calories: number;
      content: string;
      quantity: number;
      foodId: string | null;
    };

/**
 * Adet/miktar değiştir.
 * - Listeden seçili besin (food_id var): kalori birim başına yeniden hesaplanır.
 * - Serbest metin öğün (food_id yok): besin/metin DEĞİŞMEZ; "adet" porsiyon
 *   çarpanı gibi davranır ve kalori orantılı ölçeklenir.
 */
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
    .select("food_id, quantity, calories, content")
    .eq("id", parsed.data.mealId)
    .single();
  if (!meal) return { error: "Öğe bulunamadı." };

  // Listeden seçili besin: birim kalorisiyle yeniden hesapla.
  if (meal.food_id) {
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

  // Serbest metin öğün: kaloriyi porsiyon çarpanına göre ölçekle (içerik değişmez).
  const prevQty = meal.quantity && meal.quantity > 0 ? meal.quantity : 1;
  const perUnit = (meal.calories ?? 0) / prevQty;
  const calories = Math.round(perUnit * parsed.data.quantity);
  await admin
    .from("meals")
    .update({ quantity: parsed.data.quantity, calories })
    .eq("id", parsed.data.mealId);
  revalidatePath("/plan");
  return {
    calories,
    content: meal.content,
    quantity: parsed.data.quantity,
    foodId: null,
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

// ---------------------------------------------------------------------------
// "Tabağını paylaş" → foto analizi → gerçekleşen öğünü uygula
// ---------------------------------------------------------------------------
export type ScanItem = { name: string; calories: number };
export type ScanResult =
  | { error: string }
  | { items: ScanItem[]; note: string };

/** Fotoğrafı analiz edip tanınan öğeleri döndürür (kaydetmez). */
export async function scanPlatePhoto(formData: FormData): Promise<ScanResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return { error: "Fotoğraf seçilmedi." };
  }
  if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) {
    return { error: "Yalnızca JPEG, PNG veya WEBP." };
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return { error: "Fotoğraf en fazla 5 MB olabilir." };
  }

  const base64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
  const rules = await getActiveDietitianRules();

  try {
    const scan = await analyzePlatePhoto({
      imageBase64: base64,
      mediaType: photo.type as ImageMediaType,
      dietitianRules: rules,
      planContext: null,
    });
    return {
      items: scan.items.map((i) => ({ name: i.name, calories: i.calories })),
      note: scan.note,
    };
  } catch {
    return { error: "Fotoğraf analiz edilemedi, tekrar dene." };
  }
}

const applySchema = z.object({
  planId: z.string().uuid(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  mealType: MEAL_TYPE_ENUM,
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        calories: z.coerce.number().int().min(0).max(3000),
      }),
    )
    .min(1)
    .max(20),
});

export type ApplyResult =
  | { error: string }
  | {
      dayOfWeek: number;
      mealType: (typeof MEAL_TYPE_ENUM)["_output"];
      meals: {
        id: string;
        day_of_week: number;
        meal_type: (typeof MEAL_TYPE_ENUM)["_output"];
        content: string;
        calories: number | null;
        food_id: string | null;
        quantity: number | null;
      }[];
    };

/** Tanınan öğeleri o gün/öğün için GERÇEKLEŞEN öğün olarak uygular (eskiyi değiştirir). */
export async function applyMealFromItems(
  values: unknown,
): Promise<ApplyResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const parsed = applySchema.safeParse(values);
  if (!parsed.success) return { error: "Geçersiz veri." };

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("diet_plans")
    .select("client_id")
    .eq("id", parsed.data.planId)
    .single();
  if (plan?.client_id !== user.id) return { error: "Yetkin yok." };

  // O gün + öğün tipindeki mevcut öğeleri kaldır.
  await admin
    .from("meals")
    .delete()
    .eq("plan_id", parsed.data.planId)
    .eq("day_of_week", parsed.data.dayOfWeek)
    .eq("meal_type", parsed.data.mealType);

  const rows = parsed.data.items.map((it) => ({
    plan_id: parsed.data.planId,
    day_of_week: parsed.data.dayOfWeek,
    meal_type: parsed.data.mealType,
    content: it.name,
    calories: it.calories,
  }));

  const { data, error } = await admin
    .from("meals")
    .insert(rows)
    .select(
      "id, day_of_week, meal_type, content, calories, food_id, quantity",
    );
  if (error || !data) return { error: "Uygulanamadı." };

  revalidatePath("/plan");
  return {
    dayOfWeek: parsed.data.dayOfWeek,
    mealType: parsed.data.mealType,
    meals: data,
  };
}
