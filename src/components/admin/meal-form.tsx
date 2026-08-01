"use client";

import { useState } from "react";

import { addMeal } from "@/app/(admin)/yonetim/planlar/actions";
import { Button } from "@/components/ui/button";
import { DAYS, MEAL_TYPES } from "@/lib/diet";

export function MealForm({ planId }: { planId: string }) {
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [mealType, setMealType] = useState(MEAL_TYPES[0].value);
  const [content, setContent] = useState("");
  const [calories, setCalories] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectClass =
    "h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950";

  async function onAdd() {
    setError(null);
    setSaving(true);
    const result = await addMeal({
      planId,
      dayOfWeek,
      mealType,
      content,
      calories: calories.trim() === "" ? null : Number(calories),
    });
    setSaving(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setContent("");
    setCalories("");
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <p className="font-medium">Öğün ekle</p>
      <div className="flex flex-wrap gap-2">
        <select
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(Number(e.target.value))}
          className={selectClass}
        >
          {DAYS.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={mealType}
          onChange={(e) =>
            setMealType(e.target.value as (typeof MEAL_TYPES)[number]["value"])
          }
          className={selectClass}
        >
          {MEAL_TYPES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          max={5000}
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          placeholder="kcal"
          aria-label="Kalori (opsiyonel)"
          className={`${selectClass} w-24`}
        />
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={2}
        placeholder="Örn. 2 yumurta, 1 dilim tam buğday ekmeği, salatalık…"
        className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-950"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={onAdd} disabled={saving || !content.trim()}>
        {saving ? "Ekleniyor…" : "Ekle"}
      </Button>
    </div>
  );
}
