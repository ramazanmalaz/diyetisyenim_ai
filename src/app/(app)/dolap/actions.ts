"use server";

import { z } from "zod";

import {
  buildFridgePrompt,
  suggestFridgeRecipes,
  type FridgeContext,
  type FridgeResult,
} from "@/lib/ai/fridge";
import type { ImageMediaType } from "@/lib/ai/respond";
import { getUser } from "@/lib/auth";
import {
  FRIDGE_MAX_PHOTOS,
  FRIDGE_MEAL_OPTIONS,
  type FridgeMeal,
} from "@/lib/fridge-options";
import { consumeAiCredit } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
} from "@/lib/validations/progress";
import type { MealType } from "@/types/database";

const MEAL_VALUES = FRIDGE_MEAL_OPTIONS.map((o) => o.value) as [
  FridgeMeal,
  ...FridgeMeal[],
];

const schema = z.object({
  ingredients: z.string().trim().max(1000),
  meal: z.enum(MEAL_VALUES),
});

export type FridgeActionResult =
  | { error: string }
  | { quota: true }
  | { ok: true; result: FridgeResult };

const MEAL_TYPES_FOR: Record<FridgeMeal, MealType[]> = {
  any: [],
  breakfast: ["breakfast"],
  lunch: ["lunch"],
  dinner: ["dinner"],
  snack: ["snack_morning", "snack_afternoon"],
};

/** Aktif plandan günlük hedef + seçilen öğünün ortalama kalorisi; intake'ten tercihler. */
async function loadContext(
  userId: string,
  meal: FridgeMeal,
): Promise<FridgeContext> {
  const admin = createAdminClient();
  const [{ data: plan }, { data: intake }] = await Promise.all([
    admin
      .from("diet_plans")
      .select("id, daily_calorie_target")
      .eq("client_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("intakes")
      .select("dislikes, health_notes")
      .eq("client_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  let mealBudget: number | null = null;
  const types = MEAL_TYPES_FOR[meal];
  if (plan && types.length > 0) {
    const { data: meals } = await admin
      .from("meals")
      .select("calories")
      .eq("plan_id", plan.id)
      .in("meal_type", types)
      .not("calories", "is", null);
    const kcals = (meals ?? [])
      .map((m) => m.calories ?? 0)
      .filter((k) => k > 0);
    if (kcals.length > 0) {
      mealBudget = Math.round(kcals.reduce((s, k) => s + k, 0) / kcals.length);
    }
  }

  return {
    dailyTarget: plan?.daily_calorie_target ?? null,
    mealBudget,
    dislikes: intake?.dislikes ?? null,
    healthNotes: intake?.health_notes ?? null,
  };
}

/**
 * Elde olan malzemelerden (yazı ve/veya fotoğraf) diyete uygun tarif önerir.
 * Fotoğraflar bellekte işlenir, Storage'a yazılmaz. Fotoğraf varsa vision, yoksa
 * chat kredisi tüketir.
 */
export async function suggestRecipes(
  formData: FormData,
): Promise<FridgeActionResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const parsed = schema.safeParse({
    ingredients: formData.get("ingredients") ?? "",
    meal: formData.get("meal") ?? "any",
  });
  if (!parsed.success) {
    return { error: "Malzeme listesi en fazla 1000 karakter olabilir." };
  }

  const photos = formData
    .getAll("photo")
    .filter((p): p is File => p instanceof File && p.size > 0);
  const hasPhoto = photos.length > 0;
  if (photos.length > FRIDGE_MAX_PHOTOS) {
    return { error: `En fazla ${FRIDGE_MAX_PHOTOS} fotoğraf ekleyebilirsin.` };
  }
  for (const photo of photos) {
    if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) {
      return { error: "Yalnızca JPEG, PNG veya WEBP yükleyebilirsin." };
    }
  }
  if (photos.reduce((s, p) => s + p.size, 0) > MAX_PHOTO_BYTES) {
    return { error: "Fotoğrafların toplamı en fazla 5 MB olabilir." };
  }
  if (!hasPhoto && parsed.data.ingredients.length < 2) {
    return { error: "Birkaç malzeme yaz ya da dolabının fotoğrafını ekle." };
  }

  // Kaç fotoğraf olursa olsun tek istek = tek kredi.
  const credit = await consumeAiCredit(user.id, hasPhoto ? "vision" : "chat");
  if (!credit.ok) return { quota: true };

  try {
    const context = await loadContext(user.id, parsed.data.meal);
    const result = await suggestFridgeRecipes({
      prompt: buildFridgePrompt({
        ingredientsText: parsed.data.ingredients,
        meal: parsed.data.meal,
        photoCount: photos.length,
        context,
      }),
      images: await Promise.all(
        photos.map(async (p) => ({
          base64: Buffer.from(await p.arrayBuffer()).toString("base64"),
          mediaType: p.type as ImageMediaType,
        })),
      ),
    });
    return { ok: true, result };
  } catch (err) {
    console.error("[dolap] tarif hatası:", err);
    return { error: "Şu anda tarif önerilemiyor, lütfen tekrar dene." };
  }
}
