"use client";

import {
  Camera,
  Check,
  ChevronDown,
  Minus,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import {
  addFoodMeal,
  applyMealFromItems,
  deleteMealItem,
  scanPlatePhoto,
  setMealQuantity,
  swapMealFood,
  updateMeal,
} from "@/app/(app)/plan/actions";
import { FoodPicker } from "@/components/plan/food-picker";
import { PlateCamera } from "@/components/plan/plate-camera";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MealIcon } from "@/components/ui/meal-icon";
import { DAYS_SHORT, MEAL_TYPES, mealTypeLabel } from "@/lib/diet";
import type { Food } from "@/lib/foods";
import { cn } from "@/lib/utils";
import type { MealType } from "@/types/database";

export type Meal = {
  id: string;
  week_index: number;
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

// Serbest metin öğünde miktar (baştaki sayı + birim) ile besin adını ayırır.
const UNIT_WORDS = new Set([
  "yemek", "kaşığı", "tatlı", "çay", "su", "bardağı", "bardak", "adet",
  "dilim", "kase", "porsiyon", "gram", "g", "ml", "avuç", "top", "fincan",
  "kutu", "paket", "salkım", "orta", "boy", "küçük", "büyük", "yarım",
  "dal", "kepçe", "tane",
]);

function parseFree(content: string): { amount: string; name: string } {
  const toks = content.trim().split(/\s+/);
  if (toks.length === 0 || !/^[\d.,]+$/.test(toks[0])) {
    return { amount: "", name: content.trim() };
  }
  let i = 1;
  while (i < toks.length && UNIT_WORDS.has(toks[i].toLocaleLowerCase("tr"))) i++;
  return { amount: toks.slice(0, i).join(" "), name: toks.slice(i).join(" ") };
}

// "3 çay kaşığı" -> { qty: 3, unit: "çay kaşığı" }; "2" -> { qty: 2, unit: "adet" }
function parseAmount(amount: string): { qty: number; unit: string } | null {
  const a = amount.trim();
  let m = a.match(/^([\d.,]+)\s+(.+)$/);
  if (m) {
    const qty = Number(m[1].replace(",", "."));
    const unit = m[2].trim();
    if (qty > 0 && unit) return { qty, unit };
  }
  m = a.match(/^([\d.,]+)$/);
  if (m) {
    const qty = Number(m[1].replace(",", "."));
    if (qty > 0) return { qty, unit: "adet" };
  }
  return null;
}

export function EditableMeals({
  meals,
  setMeals,
  planId,
  foods,
  selectedDay,
  setSelectedDay,
  selectedWeek,
  statusByMeal,
  onCycleStatus,
}: {
  meals: Meal[];
  setMeals: Dispatch<SetStateAction<Meal[]>>;
  planId: string;
  foods: Food[];
  selectedDay: number;
  setSelectedDay: Dispatch<SetStateAction<number>>;
  selectedWeek: number;
  statusByMeal: Record<string, "eaten" | "skipped">;
  onCycleStatus: (mealId: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Partial<Record<MealType, boolean>>>({
    breakfast: true,
  });
  const [editing, setEditing] = useState<Meal | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Serbest metin öğün düzenleme alanları (miktar / besin adı / kalori ayrı).
  const [fAmount, setFAmount] = useState("");
  const [fName, setFName] = useState("");
  const [fKcal, setFKcal] = useState("");
  const [fUnit, setFUnit] = useState(""); // ayrıştırılabilen birim ("çay kaşığı")
  const [fPerUnit, setFPerUnit] = useState(0); // birim başına kalori

  const [addType, setAddType] = useState<MealType | null>(null);
  const [addFood, setAddFood] = useState<Food | null>(null);
  const [addQty, setAddQty] = useState("1");

  const [scanType, setScanType] = useState<MealType | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanItems, setScanItems] = useState<
    { name: string; calories: number }[] | null
  >(null);
  const [applying, setApplying] = useState(false);
  const [cameraType, setCameraType] = useState<MealType | null>(null);

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
      weekIndex: selectedWeek,
      dayOfWeek: selectedDay,
      mealType,
      foodId: addFood.id,
      quantity: Number(addQty) || 1,
    });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    setMeals((prev) => [
      ...prev,
      { ...res.meal, week_index: selectedWeek, checked: false },
    ]);
    setAddType(null);
    setAddFood(null);
    setAddQty("1");
  }

  function openCamera(mealType: MealType) {
    setCameraType(mealType);
    setScanItems(null);
    setError(null);
  }

  async function handleCaptured(file: File) {
    const mealType = cameraType;
    setCameraType(null);
    if (!mealType) return;
    setScanType(mealType);
    setScanItems(null);
    setScanning(true);
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
      weekIndex: selectedWeek,
      dayOfWeek: selectedDay,
      mealType: scanType,
      items: scanItems,
    });
    setApplying(false);
    if ("error" in res) return setError(res.error);
    setMeals((prev) => [
      ...prev.filter(
        (m) =>
          !(
            (m.week_index ?? 0) === selectedWeek &&
            m.day_of_week === res.dayOfWeek &&
            m.meal_type === res.mealType
          ),
      ),
      ...res.meals.map((m) => ({ ...m, checked: false })),
    ]);
    setScanType(null);
    setScanItems(null);
  }

  function openEdit(m: Meal) {
    setEditing(m);
    setPickerOpen(false);
    if (!m.food_id) {
      const p = parseFree(m.content);
      setFAmount(p.amount);
      setFName(p.name);
      setFKcal(String(m.calories ?? 0));
      // Miktar ayrıştırılabiliyorsa birim başına kaloriyi türet (otomatik hesap).
      const pa = parseAmount(p.amount);
      if (pa && (m.calories ?? 0) > 0) {
        setFUnit(pa.unit);
        setFPerUnit((m.calories ?? 0) / pa.qty);
      } else {
        setFUnit("");
        setFPerUnit(0);
      }
    }
  }

  // Serbest öğünde adet seçimi → kaloriyi otomatik hesapla.
  function pickFreeQty(n: number) {
    setFAmount(`${n} ${fUnit}`);
    setFKcal(String(Math.round(fPerUnit * n)));
  }

  // Serbest metin öğünü kaydet (miktar + besin adı + kalori ayrı alanlardan).
  async function saveFreeText() {
    if (!editing) return;
    const name = fName.trim();
    const content = `${fAmount.trim()} ${name}`.trim();
    const calories = Math.max(0, Math.round(Number(fKcal) || 0));
    if (!content) return setError("Besin adı boş olamaz.");
    setBusy(true);
    const res = await updateMeal({ mealId: editing.id, content, calories });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    patch(editing.id, { content, calories });
    setEditing(null);
  }

  const dayMeals = meals.filter(
    (m) => (m.week_index ?? 0) === selectedWeek && m.day_of_week === selectedDay,
  );

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <PlateCamera
        open={cameraType !== null}
        title={cameraType ? `${mealTypeLabel(cameraType)} tabağını çek` : ""}
        onClose={() => setCameraType(null)}
        onCapture={handleCaptured}
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

      <p className="text-center text-[11px] text-gray-400">
        Öğünün yanındaki yuvarlağa dokun: bir kez <b>yedim</b> ✓, tekrar{" "}
        <b>atladım</b>, tekrar boş. Gün otomatik sıfırlanır.
      </p>

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
                    {items.map((m) => {
                      const st = statusByMeal[m.id];
                      const eaten = st === "eaten";
                      const skipped = st === "skipped";
                      const struck = eaten || skipped;
                      return (
                      <li
                        key={m.id}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <button
                          type="button"
                          onClick={() => onCycleStatus(m.id)}
                          aria-label={
                            eaten
                              ? "Yedim — atladım'a çevir"
                              : skipped
                                ? "Atladım — işareti kaldır"
                                : "Yedim olarak işaretle"
                          }
                          title={eaten ? "Yedim" : skipped ? "Atladım" : "İşaretle"}
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition active:scale-90",
                            eaten
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : skipped
                                ? "border-gray-300 bg-gray-200 text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                : "border-gray-300 hover:border-emerald-400 dark:border-gray-600",
                          )}
                        >
                          {eaten && <Check className="h-3.5 w-3.5" />}
                          {skipped && <X className="h-3.5 w-3.5" />}
                        </button>

                        {(() => {
                          const p = m.food_id ? null : parseFree(m.content);
                          const nameLine = p ? p.name || m.content : cleanName(m);
                          const amountLine = p
                            ? p.amount || null
                            : m.quantity != null && m.quantity !== 1
                              ? `${m.quantity} ×`
                              : null;
                          return (
                            <button
                              type="button"
                              onClick={() => openEdit(m)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <p
                                className={cn(
                                  "truncate text-sm font-medium transition",
                                  struck && "text-gray-400 line-through",
                                )}
                              >
                                {nameLine}
                              </p>
                              {amountLine && (
                                <p
                                  className={cn(
                                    "text-xs text-gray-400",
                                    struck && "line-through",
                                  )}
                                >
                                  {amountLine}
                                </p>
                              )}
                            </button>
                          );
                        })()}

                        <span
                          className={cn(
                            "shrink-0 text-xs tabular-nums text-gray-500",
                            struck && "text-gray-300 line-through",
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
                      );
                    })}
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
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAddType(mt.value);
                            setAddFood(null);
                            setAddQty("1");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/60 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 transition-[background-color,transform] duration-200 ease-[var(--ease-out)] hover:bg-emerald-50 active:scale-[0.96] dark:border-emerald-900/50 dark:bg-white/5 dark:text-emerald-300"
                        >
                          <Plus className="h-4 w-4" strokeWidth={2} /> Besin ekle
                        </button>
                        <button
                          type="button"
                          onClick={() => openCamera(mt.value)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_6px_16px_-8px_rgb(11_109_72/0.7)] transition-[background-color,transform] duration-200 ease-[var(--ease-out)] hover:bg-emerald-700 active:scale-[0.96]"
                        >
                          <Camera className="h-4 w-4" strokeWidth={1.75} />{" "}
                          {mt.label} tabağı çek
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
                {editing.food_id
                  ? (editing.calories ?? 0)
                  : Math.max(0, Math.round(Number(fKcal) || 0))}
                <span className="text-sm font-normal text-gray-500"> kcal</span>
              </p>
              <p className="truncate px-3 text-xs text-gray-500">
                {editing.food_id ? cleanName(editing) : fName || editing.content}
              </p>
            </div>

            {editing.food_id ? (
              <>
                {/* Listeden seçili besin: ad + adet (kalori otomatik) */}
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
                      <span>{cleanName(editing)}</span>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500">
                    Adet / miktar
                  </p>
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
                      {editing.quantity ?? 1}
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
                </div>
              </>
            ) : pickerOpen ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500">
                  Listeden besin seç
                </p>
                <FoodPicker
                  foods={foods}
                  onPick={(f) => doSwap(editing, f)}
                  onCancel={() => setPickerOpen(false)}
                />
              </div>
            ) : (
              <>
                {/* Serbest öğün: miktar, besin adı ve kalori AYRI alanlar */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500">
                    Adet / miktar
                  </p>
                  {fUnit ? (
                    <select
                      value={parseAmount(fAmount)?.qty ?? 1}
                      onChange={(e) => pickFreeQty(Number(e.target.value))}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n} {fUnit} · {Math.round(fPerUnit * n)} kcal
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={fAmount}
                      onChange={(e) => setFAmount(e.target.value)}
                      placeholder="örn. 4 yemek kaşığı"
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-500">
                      Besin adı
                    </p>
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="text-xs text-emerald-600 hover:underline"
                    >
                      Listeden seç
                    </button>
                  </div>
                  <Input
                    value={fName}
                    onChange={(e) => setFName(e.target.value)}
                    placeholder="örn. yulaf ezmesi"
                  />
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500">Kalori</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={fKcal}
                      onChange={(e) => setFKcal(e.target.value)}
                      className="w-28"
                    />
                    <span className="text-sm text-gray-400">kcal</span>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <button
                type="button"
                onClick={() => doDelete(editing.id)}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4" /> Öğeyi sil
              </button>
              {editing.food_id ? (
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> Tamam
                </button>
              ) : (
                <button
                  type="button"
                  onClick={saveFreeText}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> Kaydet
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
