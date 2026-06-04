import type { ReactNode } from "react";

import { DAYS, mealTypeLabel, mealTypeOrder } from "@/lib/diet";
import type { MealType } from "@/types/database";

export type MealItem = {
  id: string;
  day_of_week: number;
  meal_type: MealType;
  content: string;
  calories?: number | null;
};

/**
 * Öğünleri güne (Pazartesi→Pazar) ve öğün sırasına göre gruplayıp listeler.
 * `action` verilirse her öğünün yanına (ör. silme butonu) render edilir.
 */
export function MealList({
  meals,
  action,
}: {
  meals: MealItem[];
  action?: (meal: MealItem) => ReactNode;
}) {
  if (meals.length === 0) {
    return <p className="text-sm text-gray-500">Henüz öğün eklenmemiş.</p>;
  }

  const byDay = new Map<number, MealItem[]>();
  for (const m of meals) {
    const arr = byDay.get(m.day_of_week) ?? [];
    arr.push(m);
    byDay.set(m.day_of_week, arr);
  }

  return (
    <div className="space-y-4">
      {DAYS.map((day, i) => {
        const list = (byDay.get(i) ?? []).sort(
          (a, b) => mealTypeOrder(a.meal_type) - mealTypeOrder(b.meal_type),
        );
        if (list.length === 0) return null;
        const dayTotal = list.reduce((sum, m) => sum + (m.calories ?? 0), 0);
        return (
          <div
            key={day}
            className="rounded-xl border border-gray-200 dark:border-gray-800"
          >
            <h3 className="flex items-center justify-between border-b border-gray-200 px-4 py-2 font-semibold dark:border-gray-800">
              <span>{day}</span>
              {dayTotal > 0 && (
                <span className="text-xs font-normal text-gray-500">
                  ~{dayTotal} kcal
                </span>
              )}
            </h3>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {list.map((m) => (
                <li
                  key={m.id}
                  className="flex items-start justify-between gap-3 px-4 py-2.5"
                >
                  <div className="text-sm">
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                      {mealTypeLabel(m.meal_type)}:
                    </span>{" "}
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {m.calories != null && (
                      <span className="text-xs text-gray-400">
                        {m.calories} kcal
                      </span>
                    )}
                    {action?.(m)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
