import { z } from "zod";

export const createPlanSchema = z.object({
  clientId: z.string().uuid("Geçerli bir danışan seçin."),
  title: z.string().min(2, "Başlık en az 2 karakter olmalı.").max(120),
  validFrom: z.string().optional().or(z.literal("")),
  validTo: z.string().optional().or(z.literal("")),
});

/** Bir programda izin verilen en fazla içerik haftası. */
export const MAX_PLAN_WEEKS = 8;

/** Atama süresi sınırları (hafta). Client bileşenleri de okuduğu için burada. */
export const MIN_ASSIGN_WEEKS = 1;
export const MAX_ASSIGN_WEEKS = 8;
export const ASSIGN_WEEK_OPTIONS = Array.from(
  { length: MAX_ASSIGN_WEEKS - MIN_ASSIGN_WEEKS + 1 },
  (_, i) => MIN_ASSIGN_WEEKS + i,
);

export const mealSchema = z.object({
  planId: z.string().uuid(),
  weekIndex: z.coerce.number().int().min(0).max(MAX_PLAN_WEEKS - 1).default(0),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  mealType: z.enum([
    "breakfast",
    "snack_morning",
    "lunch",
    "snack_afternoon",
    "dinner",
  ]),
  content: z.string().min(1, "İçerik boş olamaz.").max(1000),
  calories: z.coerce.number().int().min(0).max(5000).nullable().optional(),
});

export const updateMealSchema = z.object({
  mealId: z.string().uuid(),
  content: z.string().min(1, "İçerik boş olamaz.").max(1000),
  calories: z.coerce.number().int().min(0).max(5000).nullable().optional(),
});

export const planStatusSchema = z.object({
  planId: z.string().uuid(),
  status: z.enum(["draft", "active", "archived"]),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type MealInput = z.infer<typeof mealSchema>;
