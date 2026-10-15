/** "Dolabımda ne var?" öğün seçenekleri — istemci ve sunucu ortak kullanır. */
export const FRIDGE_MEAL_OPTIONS = [
  { value: "any", label: "Fark etmez" },
  { value: "breakfast", label: "Kahvaltı" },
  { value: "lunch", label: "Öğle" },
  { value: "dinner", label: "Akşam" },
  { value: "snack", label: "Ara öğün" },
] as const;

/** Tek istekte gönderilebilecek en fazla fotoğraf (sunucu gövde sınırı ~4,5 MB). */
export const FRIDGE_MAX_PHOTOS = 4;

export type FridgeMeal = (typeof FRIDGE_MEAL_OPTIONS)[number]["value"];
