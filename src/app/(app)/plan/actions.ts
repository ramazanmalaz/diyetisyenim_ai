"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { error: string } | { success: true };

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
