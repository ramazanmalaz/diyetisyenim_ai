"use client";

import { useRef, useState } from "react";

import {
  addFoodMeal,
  applyMealFromItems,
  deleteMealItem,
  scanPlatePhoto,
  setMealQuantity,
  swapMealFood,
} from "@/app/(app)/plan/actions";
import { FoodPicker } from "@/components/plan/food-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DAYS_SHORT,
  MEAL_ICON,
  MEAL_TYPES,
  mealTypeLabel,
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

const DOT: Record<MealType, string> = {
  breakfast: "bg-amber-400",
  snack_morning: "bg-lime-400",
  lunch: "bg-emerald-400",
  snack_afternoon: "bg-yellow-400",
  dinner: "bg-rose-400",
};

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
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Partial<Record<MealType, boolean>>>({
    breakfast: true,
  });
  const [editing, setEditing] = useState<Meal | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Öğün bazlı "besin ekle"
  const [addType, setAddType] = useState<MealType | null>(null);
  const [addFood, setAddFood] = useState<Food | null>(null);
  const [addQty, setAddQty] = useState("1");

  // Öğün bazlı fotoğraf
  const [scanType, setScanType] = useState<MealType | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanItems, setScanItems] = useState<
    { name: string; calories: number }[] | null
  >(null);
  const [applying, setApplying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function patch(id: string, p: Partial<Meal>) {
    setMeals((prev) => prev.map((m) => (m.id === id ? { ...m, ...p } : m)));
    setEditing((e) => (e && e.id === id ? { ...e, ...p } : e));
  }

  async function changeQty(meal: Meal, delta: number) {
    const next = Math.max(1, Math.round((meal.quantity ?? 1) + delta));
    if (next === meal.quantity) return;
    setBusy(true);
    const res = await setMealQuantity({ mealId: meal.id, quantity: next });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    patch(meal.id, {
      quantity: res.quantity,
      calories: res.calories,
      content: res.content,
    });
  }

  async function doSwap(meal: Meal, food: Food) {
    setBusy(true);
    const res = await swapMealFood({ mealId: meal.id, foodId: food.id });
    setBusy(false);
    setPickerOpen(false);
    if ("error" in res) return setError(res.error);
    patch(meal.id, {
      food_id: res.foodId,
      quantity: res.quantity,
      calories: res.calories,
      content: res.content,
    });
  }

  async function doDelete(id: string) {
    setBusy(true);
    const res = await deleteMealItem({ mealId: id });
    setBusy(false);
    if (!("error" in res)) {
      setMeals((prev) => prev.filter((m) => m.id !== id));
      setEditing(null);
    }
  }

  async function addItem(mealType: MealType) {
    if (!addFood) return;
    setBusy(true);
    const res = await addFoodMeal({
      planId,
      dayOfWeek: selectedDay,
      mealType,
      foodId: addFood.id,
      quantity: Number(addQty) || 1,
    });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    setMeals((prev) => [...prev, res.meal]);
    setAddType(null);
    setAddFood(null);
    setAddQty("1");
  }

  function openPhoto(mealType: MealType) {
    setScanType(mealType);
    setScanItems(null);
    setError(null);
    fileRef.current?.click();
  }

  async function onScanFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !scanType) return;
    setScanning(true);
    setScanItems(null);
    const fd = new FormData();
    fd.set("photo", file);
    const res = await scanPlatePhoto(fd);
    setScanning(false);
    if ("error" in res) return setError(res.error);
    setScanItems(res.items);
  }

  async function applyScan() {
    if (!scanType || !scanItems || scanItems.length === 0) return;
    setApplying(true);
    const res = await applyMealFromItems({
      planId,
      dayOfWeek: selectedDay,
      mealType: scanType,
      items: scanItems,
    });
    setApplying(false);
    if ("error" in res) return setError(res.error);
    setMeals((prev) => [
      ...prev.filter(
        (m) =>
          !(m.day_of_week === res.dayOfWeek && m.meal_type === res.mealType),
      ),
      ...res.meals,
    ]);
    setScanType(null);
    setScanItems(null);
  }

  const dayMeals = meals.filter((m) => m.day_of_week === selectedDay);

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Gizli dosya girişi (öğün fotoğrafı) */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onScanFile}
      />

      {/* Gün çipleri */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {DAYS_SHORT.map((d, i) => (
          <button
            key={d + i}
            type="button"
            onClick={() => {
              setSelectedDay(i);
              setAddType(null);
              setScanType(null);
              setScanItems(null);
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

      {/* Öğün accordion'ları */}
      <div className="space-y-2.5">
        {MEAL_TYPES.map((mt) => {
          const items = dayMeals.filter((m) => m.meal_type === mt.value);
          const total = items.reduce((s, m) => s + (m.calories ?? 0), 0);
          const open = !!expanded[mt.value];
          const scanHere = scanType === mt.value;
          return (
            <div
              key={mt.value}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[var(--shadow-soft)] dark:border-gray-800 dark:bg-gray-950"
            >
              {/* Başlık */}
              <button
                type="button"
                onClick={() =>
                  setExpanded((e) => ({ ...e, [mt.value]: !e[mt.value] }))
                }
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span
                  className={cn("h-2.5 w-2.5 rounded-full", DOT[mt.value])}
                />
                <span className="font-semibold">
                  {MEAL_ICON[mt.value]} {mt.label}
                </span>
                <span className="ml-auto text-sm tabular-nums text-gray-500">
                  {total} kcal
                </span>
                <span
                  className={cn(
                    "text-gray-400 transition-transform",
                    open && "rotate-180",
                  )}
                >
                  ▾
                </span>
              </button>

              {/* Gövde */}
              {open && (
                <div className="border-t border-gray-100 dark:border-gray-800">
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {items.length === 0 && (
                      <li className="px-4 py-3 text-sm text-gray-400">
                        Henüz öğe yok.
                      </li>
                    )}
                    {items.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(m);
                            setPickerOpen(false);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-gray-50 dark:hover:bg-gray-900"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {m.food_id
                                ? m.content.replace(/\s*\(.*\)$/, "")
                                : m.content}
                            </p>
                            {m.food_id && m.quantity != null && (
                              <p className="text-xs text-gray-400">
                                {m.quantity} ×
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 text-xs tabular-nums text-gray-500">
                            {m.calories ?? 0} kcal
                          </span>
                          <span
                            aria-hidden
                            className="shrink-0 text-gray-400"
                            title="Düzenle"
                          >
                            ✏️
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>

                  {/* Aksiyonlar: besin ekle + tabak çek */}
                  <div className="space-y-2 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
                    {addType === mt.value ? (
                      <div className="space-y-2">
                        {addFood ? (
                          <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950/40">
                            <span>
                              {addFood.name}{" "}
                              <span className="text-xs text-gray-500">
                                ({addFood.kcal_per_unit} kcal /{" "}
                                {addFood.unit_label})
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
                          <FoodPicker
                            foods={foods}
                            onPick={(f) => setAddFood(f)}
                          />
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">adet</span>
                          <Input
                            type="number"
                            step="0.5"
                            value={addQty}
                            onChange={(e) => setAddQty(e.target.value)}
                            className="w-20"
                          />
                          <div className="ml-auto flex gap-2">
                            <Button
                              onClick={() => addItem(mt.value)}
                              disabled={busy || !addFood}
                            >
                              Ekle
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setAddType(null);
                                setAddFood(null);
                              }}
                            >
                              İptal
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : scanHere ? (
                      <div className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                        {scanning && (
                          <p className="text-sm text-gray-500">
                            Fotoğraf okunuyor…
                          </p>
                        )}
                        {scanItems && (
                          <>
                            <p className="text-xs text-gray-500">
                              Tanınanlar (yanlışı çıkar):
                            </p>
                            <ul className="space-y-1">
                              {scanItems.map((it, i) => (
                                <li
                                  key={i}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span>{it.name}</span>
                                  <span className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">
                                      {it.calories} kcal
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setScanItems(
                                          (x) =>
                                            x?.filter((_, j) => j !== i) ?? null,
                                        )
                                      }
                                      className="text-xs text-red-600"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <div className="flex gap-2">
                              <Button
                                onClick={applyScan}
                                disabled={applying || scanItems.length === 0}
                              >
                                {applying ? "Uygulanıyor…" : "Bu öğün olarak uygula"}
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setScanType(null);
                                  setScanItems(null);
                                }}
                              >
                                İptal
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setAddType(mt.value);
                            setAddFood(null);
                            setAddQty("1");
                          }}
                          className="text-xs font-medium text-emerald-600 hover:underline"
                        >
                          + Besin ekle
                        </button>
                        <button
                          type="button"
                          onClick={() => openPhoto(mt.value)}
                          className="text-xs font-medium text-emerald-600 hover:underline"
                        >
                          📷 {mt.label} tabağı çek
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Düzenleme popup'ı */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-[var(--shadow-float)] dark:bg-gray-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold">
                {MEAL_ICON[editing.meal_type]}{" "}
                {mealTypeLabel(editing.meal_type)}
              </p>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <p className="text-sm">
              {editing.content}{" "}
              <span className="text-gray-400">· {editing.calories ?? 0} kcal</span>
            </p>

            {/* Yapılandırılmış: adet stepper */}
            {editing.food_id && editing.quantity != null && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Adet</span>
                <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => changeQty(editing, -1)}
                    disabled={busy}
                    className="px-3 py-1.5 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
                  >
                    −
                  </button>
                  <span className="min-w-10 px-1 text-center tabular-nums">
                    {editing.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeQty(editing, 1)}
                    disabled={busy}
                    className="px-3 py-1.5 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Besin değiştir / seç */}
            {pickerOpen ? (
              <FoodPicker
                foods={foods}
                onPick={(f) => doSwap(editing, f)}
                onCancel={() => setPickerOpen(false)}
              />
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setPickerOpen(true)}
              >
                {editing.food_id ? "Besini değiştir" : "Besinden seç"}
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full text-red-600"
              onClick={() => doDelete(editing.id)}
              disabled={busy}
            >
              Sil
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
