/** "Dolabımda ne var?" öğün seçenekleri — istemci ve sunucu ortak kullanır. */
export const FRIDGE_MEAL_OPTIONS = [
  { value: "any", label: "Fark etmez" },
  { value: "breakfast", label: "Kahvaltı" },
  { value: "lunch", label: "Öğle" },
  { value: "dinner", label: "Akşam" },
  { value: "snack", label: "Ara öğün" },
] as const;

export type FridgeMeal = (typeof FRIDGE_MEAL_OPTIONS)[number]["value"];
