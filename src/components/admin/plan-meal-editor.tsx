"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";

import { deleteMealById, updateMeal } from "@/app/(admin)/yonetim/planlar/actions";
import { DAYS, mealTypeLabel, mealTypeOrder } from "@/lib/diet";
import type { MealType } from "@/types/database";

export type EditableMeal = {
  id: string;
  day_of_week: number;
  meal_type: MealType;
  content: string;
  calories: number | null;
};

/**
 * Yönetim tarafındaki öğün listesi — satır içi düzenleme + silme.
 * Danışana atanmış program da bu ekrandan değiştirilir.
 */
export function PlanMealEditor({ meals }: { meals: EditableMeal[] }) {
  if (meals.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-800">
        Henüz öğün yok. Yukarıdan ekle.
      </p>
    );
  }

  const byDay = new Map<number, EditableMeal[]>();
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
                <MealRow key={m.id} meal={m} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function MealRow({ meal }: { meal: EditableMeal }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(meal.content);
  const [calories, setCalories] = useState(
    meal.calories != null ? String(meal.calories) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateMeal({
        mealId: meal.id,
        content,
        calories: calories.trim() === "" ? null : Number(calories),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  }

  function cancel() {
    setContent(meal.content);
    setCalories(meal.calories != null ? String(meal.calories) : "");
    setError(null);
    setEditing(false);
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteMealById(meal.id);
      if (result && "error" in result) setError(result.error);
    });
  }

  if (editing) {
    return (
      <li className="space-y-2 px-4 py-3">
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
          {mealTypeLabel(meal.meal_type)}
        </p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-950"
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={5000}
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="kcal"
            aria-label="Kalori"
            className="h-9 w-24 rounded-lg border border-gray-300 bg-white px-2.5 text-sm dark:border-gray-700 dark:bg-gray-950"
          />
          <button
            type="button"
            onClick={save}
            disabled={pending || !content.trim()}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> {pending ? "…" : "Kaydet"}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-3.5 w-3.5" /> Vazgeç
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0 text-sm">
        <span className="font-medium text-emerald-700 dark:text-emerald-400">
          {mealTypeLabel(meal.meal_type)}:
        </span>{" "}
        <span className="whitespace-pre-wrap">{meal.content}</span>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {meal.calories != null && (
          <span className="text-xs text-gray-400">{meal.calories} kcal</span>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Öğünü düzenle"
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label="Öğünü sil"
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}
