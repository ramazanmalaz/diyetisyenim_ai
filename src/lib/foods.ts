export type Food = {
  id: string;
  name: string;
  unit_label: string;
  kcal_per_unit: number;
};

/** Yapılandırılmış öğe için kalori + görünen metni hesaplar. */
export function foodMealFields(
  food: Pick<Food, "name" | "unit_label" | "kcal_per_unit">,
  quantity: number,
): { calories: number; content: string } {
  const q = Math.round(quantity * 100) / 100;
  return {
    calories: Math.round(food.kcal_per_unit * q),
    content: `${food.name} (${q} ${food.unit_label})`,
  };
}
