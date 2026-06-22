import { z } from "zod";

export const DIET_TYPES = [
  "balanced",
  "mediterranean",
  "lowcarb",
  "highprotein",
  "vegetarian",
  "intermittent",
] as const;
export type DietType = (typeof DIET_TYPES)[number];

export const DIET_TYPE_OPTIONS: {
  value: DietType;
  label: string;
  desc: string;
}[] = [
  { value: "balanced", label: "Dengeli beslenme", desc: "Her gruptan dengeli" },
  {
    value: "mediterranean",
    label: "Akdeniz tipi",
    desc: "Zeytinyağı, sebze, balık",
  },
  {
    value: "lowcarb",
    label: "Düşük karbonhidrat",
    desc: "Az un/şeker, çok protein",
  },
  {
    value: "highprotein",
    label: "Yüksek protein",
    desc: "Kas dostu, tok tutar",
  },
  { value: "vegetarian", label: "Vejetaryen", desc: "Et yok, bitki ağırlıklı" },
  {
    value: "intermittent",
    label: "Aralıklı oruç (16:8)",
    desc: "Belirli saat aralığında",
  },
];

export const DIET_TYPE_LABEL: Record<DietType, string> = Object.fromEntries(
  DIET_TYPE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<DietType, string>;

export const intakeSchema = z.object({
  sex: z.enum(["female", "male"]),
  age: z.coerce.number().int().min(12).max(100),
  heightCm: z.coerce.number().min(120).max(230),
  currentWeightKg: z.coerce.number().min(30).max(400),
  activity: z.enum(["sedentary", "light", "moderate", "active"]),
  dietType: z.enum(DIET_TYPES).optional().default("balanced"),
  goalLossKg: z.coerce.number().min(1).max(60),
  goalWeeks: z.coerce.number().int().min(1).max(104),
  healthNotes: z
    .string()
    .max(500)
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : null)),
  dislikes: z
    .string()
    .max(500)
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : null)),
});

export type IntakeInput = z.infer<typeof intakeSchema>;

/** Zorunlu şıklı soru: "Ne kadar sürede kaç kilo?" seçenekleri. */
export const GOAL_OPTIONS: {
  label: string;
  goalLossKg: number;
  goalWeeks: number;
}[] = [
  { label: "1 ayda 2 kg (rahat tempo)", goalLossKg: 2, goalWeeks: 4 },
  { label: "2 ayda 5 kg (dengeli)", goalLossKg: 5, goalWeeks: 8 },
  { label: "3 ayda 8 kg (kararlı)", goalLossKg: 8, goalWeeks: 12 },
  { label: "3 ayda 12 kg (hızlı)", goalLossKg: 12, goalWeeks: 12 },
];
