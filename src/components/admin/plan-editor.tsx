"use client";

import {
  CalendarRange,
  Check,
  CopyPlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import {
  addMeal,
  deleteMealById,
  deleteWeek,
  duplicateWeek,
  spreadWeekDays,
  updateMeal,
} from "@/app/(admin)/yonetim/planlar/actions";
import { Button } from "@/components/ui/button";
import { DAYS, MEAL_TYPES, mealTypeLabel, mealTypeOrder } from "@/lib/diet";
import { cn } from "@/lib/utils";
import { MAX_PLAN_WEEKS } from "@/lib/validations/plan";
import type { MealType } from "@/types/database";

export type EditorMeal = {
  id: string;
  week_index: number;
  day_of_week: number;
  meal_type: MealType;
  content: string;
  calories: number | null;
};

/**
 * Hafta → gün → öğün hiyerarşisinde plan düzenleyici.
 *
 * Hafta boyutu şart: meals.week_index çok haftalı programları ayırıyor;
 * hafta filtresi olmadan 8 haftalık bir planın tüm haftaları aynı günün
 * altında üst üste görünürdü.
 */
export function PlanEditor({
  planId,
  meals,
}: {
  planId: string;
  meals: EditorMeal[];
}) {
  const weekCount = useMemo(
    () =>
      Math.max(1, meals.reduce((mx, m) => Math.max(mx, m.week_index + 1), 1)),
    [meals],
  );
  const [week, setWeek] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const activeWeek = Math.min(week, weekCount - 1);
  const weekMeals = meals.filter((m) => m.week_index === activeWeek);

  function copyWeek() {
    setError(null);
    startTransition(async () => {
      const res = await duplicateWeek({ planId, fromWeek: activeWeek });
      if ("error" in res) setError(res.error);
      else setWeek(weekCount); // yeni hafta sona eklenir
    });
  }

  function removeWeek() {
    setError(null);
    startTransition(async () => {
      const res = await deleteWeek({ planId, weekIndex: activeWeek });
      if ("error" in res) setError(res.error);
      else setWeek(Math.max(0, activeWeek - 1));
    });
  }

  return (
    <div className="space-y-4">
      {/* Hafta sekmeleri */}
      <div className="flex flex-wrap items-center gap-1.5">
        {Array.from({ length: weekCount }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setWeek(i)}
            aria-current={i === activeWeek ? "true" : undefined}
            className={cn(
              "rounded-xl px-3 py-1.5 text-sm font-medium transition-colors duration-150",
              i === activeWeek
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
            )}
          >
            {i + 1}. Hafta
          </button>
        ))}

        {weekCount < MAX_PLAN_WEEKS && (
          <button
            type="button"
            onClick={copyWeek}
            disabled={pending || weekMeals.length === 0}
            title="Bu haftayı kopyalayarak yeni hafta ekle"
            className="flex items-center gap-1 rounded-xl border border-dashed border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-40 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/20"
          >
            <CopyPlus className="h-4 w-4" /> Hafta ekle
          </button>
        )}

        {weekCount > 1 && (
          <button
            type="button"
            onClick={removeWeek}
            disabled={pending}
            className="ml-auto rounded-xl px-3 py-1.5 text-xs text-red-500 transition hover:bg-red-50 disabled:opacity-40 dark:hover:bg-red-950/30"
          >
            {activeWeek + 1}. haftayı sil
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400">
        {weekCount === 1
          ? "Tek haftalık program — danışan bu haftayı tekrar eder. “Hafta ekle” ile çoğalt."
          : `${weekCount} haftalık program — danışan hafta hafta ilerler, bitince başa döner.`}
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <SpreadDaysPanel
        planId={planId}
        weekIndex={activeWeek}
        filledDays={[...new Set(weekMeals.map((m) => m.day_of_week))]}
      />

      <AddMealForm planId={planId} weekIndex={activeWeek} />

      <WeekMeals meals={weekMeals} />
    </div>
  );
}

// ─── Günlere yayma ───────────────────────────────────────────────────────────
/**
 * Fotoğraf/PDF okuması genelde 1-2 günlük şablon döndürüyor. Bu panel dolu
 * günlerdeki menüleri seçilen günlere sırayla kopyalayarak haftayı doldurur.
 */
function SpreadDaysPanel({
  planId,
  weekIndex,
  filledDays,
}: {
  planId: string;
  weekIndex: number;
  filledDays: number[];
}) {
  const emptyDays = DAYS.map((_, i) => i).filter((i) => !filledDays.includes(i));
  const [targets, setTargets] = useState<number[]>(emptyDays);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Yayılacak gün yoksa (hafta zaten dolu ve kullanıcı seçim yapmadıysa) gizle.
  if (filledDays.length === 0) return null;

  const sources = filledDays.filter((d) => !targets.includes(d));

  function toggle(day: number) {
    setTargets((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await spreadWeekDays({ planId, weekIndex, targetDays: targets });
      if ("error" in res) setError(res.error);
    });
  }

  return (
    <div className="space-y-2.5 rounded-2xl border border-sky-200 bg-sky-50/50 p-4 dark:border-sky-900/50 dark:bg-sky-950/20">
      <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">
        Menüyü günlere yay
      </p>
      <p className="text-xs text-sky-800/70 dark:text-sky-200/60">
        Seçili günler, seçili olmayan dolu günlerdeki menülerle sırayla
        doldurulur. Seçili günlerdeki mevcut öğünler silinir.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {DAYS.map((d, i) => {
          const selected = targets.includes(i);
          const isSource = sources.includes(i);
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggle(i)}
              aria-pressed={selected}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-150",
                selected
                  ? "bg-sky-600 text-white"
                  : isSource
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "bg-white text-gray-500 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-700",
              )}
            >
              {d}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-gray-500">
        <span className="font-medium text-emerald-700 dark:text-emerald-400">
          Yeşil
        </span>{" "}
        = kaynak gün ({sources.length}) ·{" "}
        <span className="font-medium text-sky-700 dark:text-sky-400">Mavi</span>{" "}
        = doldurulacak ({targets.length})
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        onClick={run}
        disabled={pending || targets.length === 0 || sources.length === 0}
      >
        <CalendarRange className="mr-1.5 h-4 w-4" />
        {pending ? "Yayılıyor…" : "Seçili günleri doldur"}
      </Button>
    </div>
  );
}

// ─── Öğün ekleme ─────────────────────────────────────────────────────────────
function AddMealForm({
  planId,
  weekIndex,
}: {
  planId: string;
  weekIndex: number;
}) {
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [mealType, setMealType] = useState(MEAL_TYPES[0].value);
  const [content, setContent] = useState("");
  const [calories, setCalories] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fieldClass =
    "h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950";

  function onAdd() {
    setError(null);
    startTransition(async () => {
      const result = await addMeal({
        planId,
        weekIndex,
        dayOfWeek,
        mealType,
        content,
        calories: calories.trim() === "" ? null : Number(calories),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setContent("");
      setCalories("");
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <p className="text-sm font-medium">
        {weekIndex + 1}. haftaya öğün ekle
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(Number(e.target.value))}
          aria-label="Gün"
          className={fieldClass}
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
          aria-label="Öğün"
          className={fieldClass}
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
          className={`${fieldClass} w-24`}
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
      <Button onClick={onAdd} disabled={pending || !content.trim()}>
        <Plus className="mr-1.5 h-4 w-4" />
        {pending ? "Ekleniyor…" : "Ekle"}
      </Button>
    </div>
  );
}

// ─── Seçili haftanın günleri ─────────────────────────────────────────────────
function WeekMeals({ meals }: { meals: EditorMeal[] }) {
  if (meals.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-800">
        Bu haftada henüz öğün yok. Yukarıdan ekle.
      </p>
    );
  }

  const byDay = new Map<number, EditorMeal[]>();
  for (const m of meals) {
    const arr = byDay.get(m.day_of_week) ?? [];
    arr.push(m);
    byDay.set(m.day_of_week, arr);
  }

  return (
    <div className="space-y-4">
      {DAYS.map((day, i) => {
        const list = byDay.get(i) ?? [];
        if (list.length === 0) return null;
        const dayTotal = list.reduce((sum, m) => sum + (m.calories ?? 0), 0);

        // Öğün türüne göre grupla — bir öğünde birden çok kalem olabiliyor
        // (fotoğraf okumasında kahvaltı 7 satır gelebiliyor); türü her satırda
        // tekrarlamak yerine tek başlık altında topla.
        const byType = new Map<MealType, EditorMeal[]>();
        for (const m of list) {
          const arr = byType.get(m.meal_type) ?? [];
          arr.push(m);
          byType.set(m.meal_type, arr);
        }
        const types = [...byType.keys()].sort(
          (a, b) => mealTypeOrder(a) - mealTypeOrder(b),
        );

        return (
          <div
            key={day}
            className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
          >
            <h3 className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 font-semibold dark:border-gray-800 dark:bg-gray-900/60">
              <span>{day}</span>
              {dayTotal > 0 && (
                <span className="text-xs font-normal text-gray-500">
                  ~{dayTotal} kcal
                </span>
              )}
            </h3>

            {types.map((type) => {
              const items = byType.get(type) ?? [];
              const typeTotal = items.reduce(
                (sum, m) => sum + (m.calories ?? 0),
                0,
              );
              return (
                <div key={type}>
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-1.5 dark:border-gray-800/70">
                    <span className="text-xs font-bold tracking-[0.08em] text-emerald-700 uppercase dark:text-emerald-400">
                      {mealTypeLabel(type)}
                    </span>
                    {typeTotal > 0 && (
                      <span className="text-[11px] text-gray-400">
                        {typeTotal} kcal
                      </span>
                    )}
                  </div>
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {items.map((m) => (
                      <MealRow key={m.id} meal={m} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function MealRow({ meal }: { meal: EditorMeal }) {
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
      if ("error" in result) setError(result.error);
    });
  }

  if (editing) {
    return (
      <li className="space-y-2 px-4 py-3">
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
    <li className="flex items-start justify-between gap-3 px-4 py-2">
      <div className="min-w-0 text-sm">
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
