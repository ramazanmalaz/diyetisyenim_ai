"use client";

import { useState } from "react";

import {
  addMealItem,
  deleteMealItem,
  updateMeal,
} from "@/app/(app)/plan/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DAYS, MEAL_TYPES, mealTypeLabel, mealTypeOrder } from "@/lib/diet";
import type { MealType } from "@/types/database";

type Meal = {
  id: string;
  day_of_week: number;
  meal_type: MealType;
  content: string;
  calories: number | null;
};

const selectClass =
  "h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-950";

export function EditableMeals({
  initial,
  planId,
}: {
  initial: Meal[];
  planId: string;
}) {
  const [meals, setMeals] = useState<Meal[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [draftCalories, setDraftCalories] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // "Öğe ekle" durumu (hangi gün açık)
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [addType, setAddType] = useState<MealType>("breakfast");
  const [addContent, setAddContent] = useState("");
  const [addCalories, setAddCalories] = useState("");
  const [adding, setAdding] = useState(false);

  function openAdd(day: number) {
    setAddingDay(day);
    setAddType("breakfast");
    setAddContent("");
    setAddCalories("");
    setError(null);
  }

  async function addItem(day: number) {
    const calories = Number(addCalories || 0);
    setAdding(true);
    setError(null);
    const res = await addMealItem({
      planId,
      dayOfWeek: day,
      mealType: addType,
      content: addContent,
      calories,
    });
    setAdding(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setMeals((prev) => [
      ...prev,
      {
        id: res.id,
        day_of_week: day,
        meal_type: addType,
        content: addContent,
        calories,
      },
    ]);
    setAddingDay(null);
  }

  function startEdit(m: Meal) {
    setEditingId(m.id);
    setDraftContent(m.content);
    setDraftCalories(String(m.calories ?? 0));
    setError(null);
  }

  async function save(id: string) {
    const calories = Number(draftCalories);
    setBusyId(id);
    setError(null);
    const res = await updateMeal({ mealId: id, content: draftContent, calories });
    setBusyId(null);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setMeals((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, content: draftContent, calories } : m,
      ),
    );
    setEditingId(null);
  }

  async function remove(id: string) {
    setBusyId(id);
    const res = await deleteMealItem({ mealId: id });
    setBusyId(null);
    if (!("error" in res)) {
      setMeals((prev) => prev.filter((m) => m.id !== id));
    }
  }

  if (meals.length === 0) {
    return <p className="text-sm text-gray-500">Plan öğesi bulunamadı.</p>;
  }

  const byDay = new Map<number, Meal[]>();
  for (const m of meals) {
    const arr = byDay.get(m.day_of_week) ?? [];
    arr.push(m);
    byDay.set(m.day_of_week, arr);
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {DAYS.map((day, i) => {
        const list = (byDay.get(i) ?? []).sort(
          (a, b) => mealTypeOrder(a.meal_type) - mealTypeOrder(b.meal_type),
        );
        if (list.length === 0) return null;
        const dayTotal = list.reduce((s, m) => s + (m.calories ?? 0), 0);
        return (
          <div
            key={day}
            className="rounded-xl border border-gray-200 dark:border-gray-800"
          >
            <h3 className="flex items-center justify-between border-b border-gray-200 px-4 py-2 font-semibold dark:border-gray-800">
              <span>{day}</span>
              <span className="text-xs font-normal text-gray-500">
                ~{dayTotal} kcal
              </span>
            </h3>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {list.map((m) => (
                <li key={m.id} className="px-4 py-2.5">
                  {editingId === m.id ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        {mealTypeLabel(m.meal_type)}
                      </p>
                      <Input
                        value={draftContent}
                        onChange={(e) => setDraftContent(e.target.value)}
                        placeholder="Örn. 6 siyah zeytin"
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={draftCalories}
                          onChange={(e) => setDraftCalories(e.target.value)}
                          className="w-28"
                        />
                        <span className="text-sm text-gray-400">kcal</span>
                        <div className="ml-auto flex gap-2">
                          <Button
                            onClick={() => save(m.id)}
                            disabled={busyId === m.id || !draftContent.trim()}
                          >
                            Kaydet
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            İptal
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
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
                        <button
                          type="button"
                          onClick={() => startEdit(m)}
                          className="text-xs text-emerald-600 hover:underline"
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(m.id)}
                          disabled={busyId === m.id}
                          className="text-xs text-red-600 hover:underline disabled:opacity-50"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {/* Öğe ekle */}
            <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-800">
              {addingDay === i ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={addType}
                      onChange={(e) => setAddType(e.target.value as MealType)}
                      className={selectClass}
                    >
                      {MEAL_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      value={addCalories}
                      onChange={(e) => setAddCalories(e.target.value)}
                      placeholder="kcal"
                      className="w-24"
                    />
                  </div>
                  <Input
                    value={addContent}
                    onChange={(e) => setAddContent(e.target.value)}
                    placeholder="Örn. 1 kase yoğurt"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => addItem(i)}
                      disabled={adding || !addContent.trim()}
                    >
                      Ekle
                    </Button>
                    <Button variant="ghost" onClick={() => setAddingDay(null)}>
                      İptal
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAdd(i)}
                  className="text-xs text-emerald-600 hover:underline"
                >
                  + Öğe ekle
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
