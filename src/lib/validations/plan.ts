import { z } from "zod";

export const createPlanSchema = z.object({
  clientId: z.string().uuid("Geçerli bir danışan seçin."),
  title: z.string().min(2, "Başlık en az 2 karakter olmalı.").max(120),
  validFrom: z.string().optional().or(z.literal("")),
  validTo: z.string().optional().or(z.literal("")),
});

export const mealSchema = z.object({
  planId: z.string().uuid(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  mealType: z.enum([
    "breakfast",
    "snack_morning",
    "lunch",
    "snack_afternoon",
    "dinner",
  ]),
  content: z.string().min(1, "İçerik boş olamaz.").max(1000),
});

export const planStatusSchema = z.object({
  planId: z.string().uuid(),
  status: z.enum(["draft", "active", "archived"]),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type MealInput = z.infer<typeof mealSchema>;
