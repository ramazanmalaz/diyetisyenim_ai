import { z } from "zod";

// Boş string'leri opsiyonel sayıya çeviren yardımcı.
const optionalNumber = (max: number) =>
  z
    .union([z.literal(""), z.coerce.number().positive().max(max)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v));

export const progressSchema = z.object({
  entryDate: z.string().min(1, "Tarih gerekli."),
  weightKg: optionalNumber(500),
  waterMl: optionalNumber(20000),
  waistCm: optionalNumber(300),
  hipCm: optionalNumber(300),
  note: z
    .string()
    .max(500)
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
});

export type ProgressInput = z.infer<typeof progressSchema>;

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
