"use client";

import {
  Camera,
  Check,
  ChevronDown,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useRef, useState } from "react";

import {
  addFoodMeal,
  applyMealFromItems,
  deleteMealItem,
  resetMealChecks,
  scanPlatePhoto,
  setMealQuantity,
  swapMealFood,
  toggleMealChecked,
} from "@/app/(app)/plan/actions";
import { FoodPicker } from "@/components/plan/food-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MealIcon } from "@/components/ui/meal-icon";
import { DAYS_SHORT, MEAL_TYPES, mealTypeLabel } from "@/lib/diet";
import type { Food } from "@/lib/foods";
import { cn } from "@/lib/utils";
import type { MealType } from "@/types/database";

export type Meal = {
  id: string;
  day_of_week: number;
  meal_type: MealType;
  content: string;
  calories: number | null;
  food_id: string | null;
  quantity: number | null;
  checked: boolean;
};

const DOT: Record<MealType, string> = {
  breakfast: "bg-amber-400",
  snack_morning: "bg-lime-400",
  lunch: "bg-emerald-400",
  snack_afternoon: "bg-yellow-400",
  dinner: "bg-rose-400",
};

const cleanName = (m: Meal) =>
  m.food_id ? m.content.replace(/\s*\(.*\)$/, "") : m.content;

export function EditableMeals({
  meals,
  setMeals,
  planId,
  foods,
  selectedDay,
  setSelectedDay,
}: {
  meals: Meal[];
  setMeals: Dispatch<SetStateAction<Meal[]>>;
  planId: string;
  foods: Food[];
  selectedDay: number;
  setSelectedDay: Dispatch<SetStateAction<number>>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Partial<Record<MealType, boolean>>>({
    breakfast: true,
  });
  const [editing, setEditing] = useState<Meal | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [addType, setAddType] = useState<MealType | null>(null);
  const [addFood, setAddFood] = useState<Food | null>(null);
  const [addQty, setAddQty] = useState("1");

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

  async function toggleChecked(meal: Meal) {
    const next = !meal.checked;
    patch(meal.id, { checked: next });
    const res = await toggleMealChecked({ mealId: meal.id, checked: next });
    if ("error" in res) {
      patch(meal.id, { checked: meal.checked });
      setError(res.error);
    }
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

  async function doReset() {
    if (
      !window.confirm(
        "Tüm günlerdeki işaretlemeler (ilerleme) sıfırlanacak. Devam edilsin mi?",
      )
    )
      return;
    const before = meals;
    setMeals((prev) => prev.map((m) => ({ ...m, checked: false })));
    const res = await resetMealChecks({ planId });
    if ("error" in res) {
      setMeals(before);
      setError(res.error);
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
    setMeals((prev) => [...prev, { ...res.meal, checked: false }]);
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
      ...res.meals.map((m) => ({ ...m, checked: false })),
    ]);
    setScanType(null);
    setScanItems(null);
  }

  function openEdit(m: Meal) {
    setEditing(m);
    setPickerOpen(false);
  }

  const dayMeals = meals.filter((m) => m.day_of_week === selectedDay);

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

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

      {/* İlerlemeyi sıfırla */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={doReset}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-gray-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
        >
          <RotateCcw className="h-3.5 w-3.5" /> İlerlemeyi sıfırla
        </button>
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
              className="glass overflow-hidden rounded-3xl shadow-[var(--shadow-soft)]"
            >
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
                <MealIcon type={mt.value} className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold">{mt.label}</span>
                <span className="ml-auto text-sm tabular-nums text-gray-500">
                  {total} kcal
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-gray-400 transition-transform",
                    open && "rotate-180",
                  )}
                />
              </button>

              {open && (
                <div className="border-t border-gray-100/70 dark:border-gray-800/70">
                  <ul className="divide-y divide-gray-100/70 dark:divide-gray-800/70">
                    {items.length === 0 && (
                      <li className="px-4 py-3 text-sm text-gray-400">
                        Henüz öğe yok.
                      </li>
                    )}
                    {items.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <button
                          type="button"
                          onClick={() => toggleChecked(m)}
                          aria-pressed={m.checked}
                          aria-label={
                            m.checked
                              ? "İşareti kaldır"
                              : "Yapıldı olarak işaretle"
                          }
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                            m.checked
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-gray-300 hover:border-emerald-400 dark:border-gray-600",
                          )}
                        >
                          {m.checked && <Check className="h-3 w-3" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p
                            className={cn(
                              "truncate text-sm font-medium transition",
                              m.checked && "text-gray-400 line-through",
                            )}
                          >
                            {cleanName(m)}
                          </p>
                          {m.food_id && m.quantity != null && (
                            <p className="text-xs text-gray-400">
                              {m.quantity} ×
                            </p>
                          )}
                        </button>

                        <span
                          className={cn(
                            "shrink-0 text-xs tabular-nums text-gray-500",
                            m.checked && "text-gray-300 line-through",
                          )}
                        >
                          {m.calories ?? 0} kcal
                        </span>
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          aria-label="Düzenle"
                          className="shrink-0 text-gray-400 transition hover:text-emerald-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-2 border-t border-gray-100/70 px-4 py-3 dark:border-gray-800/70">
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
                                      className="text-red-500"
                                    >
                                      <X className="h-3.5 w-3.5" />
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
                                {applying
                                  ? "Uygulanıyor…"
                                  : "Bu öğün olarak uygula"}
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
                      <div className="flex flex-wrap gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            setAddType(mt.value);
                            setAddFood(null);
                            setAddQty("1");
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:underline"
                        >
                          <Plus className="h-4 w-4" /> Besin ekle
                        </button>
                        <button
                          type="button"
                          onClick={() => openPhoto(mt.value)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:underline"
                        >
                          <Camera className="h-4 w-4" /> {mt.label} tabağı çek
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
            className="reveal w-full max-w-sm space-y-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-[var(--shadow-float)] dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-semibold">
                <MealIcon
                  type={editing.meal_type}
                  className="h-4 w-4 text-emerald-600"
                />
                {mealTypeLabel(editing.meal_type)}
              </p>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Kalori önizleme */}
            <div className="rounded-2xl bg-emerald-50 py-3 text-center dark:bg-emerald-950/40">
              <p className="text-3xl font-bold tabular-nums">
                {editing.calories ?? 0}
                <span className="text-sm font-normal text-gray-500"> kcal</span>
              </p>
              <p className="truncate px-3 text-xs text-gray-500">
                {cleanName(editing)}
              </p>
            </div>

            {/* Besin seçimi */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500">Besin</p>
              {pickerOpen ? (
                <FoodPicker
                  foods={foods}
                  onPick={(f) => doSwap(editing, f)}
                  onCancel={() => setPickerOpen(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm transition hover:border-emerald-300 dark:border-gray-700 dark:bg-gray-800"
                >
                  <span>
                    {editing.food_id
                      ? cleanName(editing)
                      : "Listeden besin seç"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Adet seçimi */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500">Adet / miktar</p>
              {editing.food_id && editing.quantity != null ? (
                <div className="flex items-center justify-between rounded-xl border border-gray-200 px-2 py-1.5 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => changeQty(editing, -1)}
                    disabled={busy}
                    aria-label="Azalt"
                    className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-lg font-semibold tabular-nums">
                    {editing.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeQty(editing, 1)}
                    disabled={busy}
                    aria-label="Artır"
                    className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-gray-200 px-3 py-2.5 text-xs text-gray-400 dark:border-gray-700">
                  Adet ayarı için önce listeden bir besin seç.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <button
                type="button"
                onClick={() => doDelete(editing.id)}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4" /> Öğeyi sil
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
