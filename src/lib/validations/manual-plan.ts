import { z } from "zod";

export const MEAL_TYPE_VALUES = [
  "breakfast",
  "snack_morning",
  "lunch",
  "snack_afternoon",
  "dinner",
] as const;

/** Kullanıcının kendi (mevcut) planını kaydetme girdisi. */
export const manualPlanSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  dailyTarget: z.coerce.number().int().min(0).max(10000).optional(),
  items: z
    .array(
      z.object({
        mealType: z.enum(MEAL_TYPE_VALUES),
        content: z.string().trim().min(1, "Öğe boş olamaz.").max(200),
        calories: z.coerce.number().int().min(0).max(3000),
      }),
    )
    .min(1, "En az bir öğün öğesi eklemelisin.")
    .max(60),
  photoPaths: z.array(z.string().max(300)).max(10).optional(),
});

export type ManualPlanInput = z.infer<typeof manualPlanSchema>;
