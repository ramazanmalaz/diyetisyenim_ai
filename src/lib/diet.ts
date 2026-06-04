import type { MealType, PlanStatus } from "@/types/database";

/** 0=Pazartesi ... 6=Pazar */
export const DAYS = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
] as const;

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Kahvaltı" },
  { value: "snack_morning", label: "Ara Öğün (Sabah)" },
  { value: "lunch", label: "Öğle" },
  { value: "snack_afternoon", label: "Ara Öğün (İkindi)" },
  { value: "dinner", label: "Akşam" },
];

export const DAYS_SHORT = [
  "Pzt",
  "Sal",
  "Çar",
  "Per",
  "Cum",
  "Cmt",
  "Paz",
] as const;

export const MEAL_ICON: Record<MealType, string> = {
  breakfast: "🍳",
  snack_morning: "🍎",
  lunch: "🥗",
  snack_afternoon: "🥜",
  dinner: "🍽️",
};

export function mealTypeLabel(type: MealType): string {
  return MEAL_TYPES.find((m) => m.value === type)?.label ?? type;
}

/** Öğünleri standart sırayla karşılaştırmak için. */
export function mealTypeOrder(type: MealType): number {
  return MEAL_TYPES.findIndex((m) => m.value === type);
}

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  draft: "Taslak",
  active: "Aktif",
  archived: "Arşivlendi",
};
