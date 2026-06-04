"use client";

import { useState } from "react";

import {
  addFoodMeal,
  deleteMealItem,
  setMealQuantity,
  swapMealFood,
  updateMeal,
} from "@/app/(app)/plan/actions";
import { FoodPicker } from "@/components/plan/food-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DAYS,
  DAYS_SHORT,
  MEAL_ICON,
  MEAL_TYPES,
  mealTypeLabel,
  mealTypeOrder,
} from "@/lib/diet";
import type { Food } from "@/lib/foods";
import { cn } from "@/lib/utils";
import type { MealType } from "@/types/database";

type Meal = {
  id: string;
  day_of_week: number;
  meal_type: MealType;
  content: string;
  calories: number | null;
  food_id: string | null;
  quantity: number | null;
};

const selectClass =
  "h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-950";

export function EditableMeals({
  initial,
  planId,
  foods,
}: {
  initial: Meal[];
  planId: string;
  foods: Food[];
}) {
  const [meals, setMeals] = useState<Meal[]>(initial);
  const [selectedDay, setSelectedDay] = useState<number>(
    () => (new Date().getDay() + 6) % 7,
  );
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Besin değiştirme (hangi öğe için picker açık)
  const [swapId, setSwapId] = useState<string | null>(null);

  // Serbest metin düzenleme (yapılandırılmamış öğeler)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [draftCalories, setDraftCalories] = useState("");

  // Besin ekleme paneli
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [addType, setAddType] = useState<MealType>("breakfast");
  const [addQty, setAddQty] = useState("1");
  const [addFood, setAddFood] = useState<Food | null>(null);

  function patch(id: string, p: Partial<Meal>) {
    setMeals((prev) => prev.map((m) => (m.id === id ? { ...m, ...p } : m)));
  }

  async function changeQty(m: Meal, delta: number) {
    const next = Math.max(1, Math.round((m.quantity ?? 1) + delta));
    if (next === m.quantity) return;
    setBusyId(m.id);
    setError(null);
    const res = await setMealQuantity({ mealId: m.id, quantity: next });
    setBusyId(null);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    patch(m.id, {
      quantity: res.quantity,
      calories: res.calories,
      content: res.content,
    });
  }

  async function pickSwap(mealId: string, food: Food) {
    setBusyId(mealId);
    setError(null);
    const res = await swapMealFood({ mealId, foodId: food.id });
    setBusyId(null);
    setSwapId(null);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    patch(mealId, {
      food_id: res.foodId,
      quantity: res.quantity,
      calories: res.calories,
      content: res.content,
    });
  }

  async function saveFree(id: string) {
    const calories = Number(draftCalories);
    setBusyId(id);
    setError(null);
    const res = await updateMeal({
      mealId: id,
      content: draftContent,
      calories,
    });
    setBusyId(null);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    patch(id, { content: draftContent, calories });
    setEditingId(null);
  }

  async function remove(id: string) {
    setBusyId(id);
    const res = await deleteMealItem({ mealId: id });
    setBusyId(null);
    if (!("error" in res)) setMeals((prev) => prev.filter((m) => m.id !== id));
  }

  async function addItem(day: number) {
    if (!addFood) return;
    const qty = Number(addQty) || 1;
    setBusyId("add");
    setError(null);
    const res = await addFoodMeal({
      planId,
      dayOfWeek: day,
      mealType: addType,
      foodId: addFood.id,
      quantity: qty,
    });
    setBusyId(null);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setMeals((prev) => [...prev, res.meal]);
    setAddingDay(null);
    setAddFood(null);
    setAddQty("1");
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

  const list = (byDay.get(selectedDay) ?? []).sort(
    (a, b) => mealTypeOrder(a.meal_type) - mealTypeOrder(b.meal_type),
  );
  const dayTotal = list.reduce((s, m) => s + (m.calories ?? 0), 0);

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Gün çipleri — varsayılan bugün */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {DAYS_SHORT.map((d, i) => (
          <button
            key={d + i}
            type="button"
            onClick={() => {
              setSelectedDay(i);
              setAddingDay(null);
              setEditingId(null);
              setSwapId(null);
            }}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-[background-color,box-shadow] duration-200",
              i === selectedDay
                ? "bg-emerald-600 text-white shadow-[0_4px_12px_-4px_rgb(11_109_72/0.6)]"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
            )}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[var(--shadow-soft)] dark:border-gray-800 dark:bg-gray-950">
        <h3 className="flex items-center justify-between border-b border-gray-200 px-4 py-2 font-semibold dark:border-gray-800">
          <span>{DAYS[selectedDay]}</span>
          <span className="text-xs font-normal text-gray-500">
            ~{dayTotal} kcal
          </span>
        </h3>

        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {list.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-gray-400">
              Bu gün için öğe yok.
            </li>
          )}
          {list.map((m) => (
            <li key={m.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm">
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    <span aria-hidden>{MEAL_ICON[m.meal_type]}</span>{" "}
                    {mealTypeLabel(m.meal_type)}:
                  </span>{" "}
                  <span className="whitespace-pre-wrap">{m.content}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {m.calories != null && (
                    <span className="text-xs font-medium tabular-nums text-gray-500">
                      {m.calories} kcal
                    </span>
                  )}
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

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {m.food_id && m.quantity != null && (
                  <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => changeQty(m, -1)}
                      disabled={busyId === m.id}
                      className="px-2.5 py-1 text-sm hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
                    >
                      −
                    </button>
                    <span className="min-w-9 px-1 text-center text-sm tabular-nums">
                      {m.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeQty(m, 1)}
                      disabled={busyId === m.id}
                      className="px-2.5 py-1 text-sm hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
                    >
                      +
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSwapId(swapId === m.id ? null : m.id);
                    setEditingId(null);
                  }}
                  className="text-xs text-emerald-600 hover:underline"
                >
                  Besin değiştir
                </button>

                {!m.food_id && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(m.id);
                      setDraftContent(m.content);
                      setDraftCalories(String(m.calories ?? 0));
                      setSwapId(null);
                    }}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Serbest düzenle
                  </button>
                )}
              </div>

              {swapId === m.id && (
                <div className="mt-2">
                  <FoodPicker
                    foods={foods}
                    onPick={(food) => pickSwap(m.id, food)}
                    onCancel={() => setSwapId(null)}
                  />
                </div>
              )}

              {editingId === m.id && (
                <div className="mt-2 space-y-2">
                  <Input
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    placeholder="İçerik"
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
                        onClick={() => saveFree(m.id)}
                        disabled={busyId === m.id || !draftContent.trim()}
                      >
                        Kaydet
                      </Button>
                      <Button variant="ghost" onClick={() => setEditingId(null)}>
                        İptal
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* Besin ekle */}
        <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
          {addingDay === selectedDay ? (
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
                <div className="inline-flex items-center gap-1">
                  <span className="text-xs text-gray-500">adet</span>
                  <Input
                    type="number"
                    step="0.5"
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                    className="w-20"
                  />
                </div>
              </div>

              {addFood ? (
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950/40">
                  <span>
                    {addFood.name}{" "}
                    <span className="text-xs text-gray-500">
                      ({addFood.kcal_per_unit} kcal / {addFood.unit_label})
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setAddFood(null)}
                    className="text-xs text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    Değiştir
                  </button>
                </div>
              ) : (
                <FoodPicker foods={foods} onPick={(f) => setAddFood(f)} />
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => addItem(selectedDay)}
                  disabled={busyId === "add" || !addFood}
                >
                  Ekle
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setAddingDay(null);
                    setAddFood(null);
                  }}
                >
                  İptal
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAddingDay(selectedDay);
                setAddFood(null);
                setAddType("breakfast");
                setAddQty("1");
              }}
              className="text-xs font-medium text-emerald-600 hover:underline"
            >
              + Besin ekle (listeden)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
