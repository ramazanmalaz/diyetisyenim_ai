"use client";

import { LineChart, MessageCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { resetPlan, regeneratePlan } from "@/app/(app)/plan/actions";
import { openAssistant } from "@/app/(app)/sohbet/actions";
import { CalorieFigure } from "@/components/plan/calorie-figure";
import { CalorieHero } from "@/components/plan/calorie-hero";
import { WaterTracker } from "@/components/plan/water-tracker";
import { EditableMeals, type Meal } from "@/components/plan/editable-meals";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { Button } from "@/components/ui/button";
import { DAYS } from "@/lib/diet";
import type { Food } from "@/lib/foods";

type Props = {
  planId: string;
  foods: Food[];
  initialMeals: Meal[];
  dailyTarget: number | null;
  goalLossKg: number | null;
  estimatedWeeks: number | null;
  todayIdx: number;
  initialWaterMl: number;
  weekCount: number;
  initialWeek: number;
  totalWeeks: number;
  validTo: string | null;
};

export function PlanBoard({
  planId,
  foods,
  initialMeals,
  dailyTarget,
  goalLossKg,
  estimatedWeeks,
  todayIdx,
  initialWaterMl,
  weekCount,
  initialWeek,
  totalWeeks,
  validTo,
}: Props) {
  const [meals, setMeals] = useState<Meal[]>(initialMeals);
  const [selectedDay, setSelectedDay] = useState<number>(todayIdx);
  const [selectedWeek, setSelectedWeek] = useState<number>(
    Math.min(initialWeek, Math.max(0, weekCount - 1)),
  );

  // Özet, SEÇİLİ hafta+günün canlı öğün state'inden hesaplanır.
  const { plannedDay, consumedDay } = useMemo(() => {
    const dayRows = meals.filter(
      (m) =>
        (m.week_index ?? 0) === selectedWeek && m.day_of_week === selectedDay,
    );
    return {
      plannedDay: dayRows.reduce((s, m) => s + (m.calories ?? 0), 0),
      consumedDay: dayRows
        .filter((m) => m.checked)
        .reduce((s, m) => s + (m.calories ?? 0), 0),
    };
  }, [meals, selectedDay, selectedWeek]);

  const heroTitle =
    selectedDay === todayIdx ? "Bugünün özeti" : `${DAYS[selectedDay]} özeti`;

  const finishDate = validTo
    ? new Date(validTo).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
      })
    : null;

  return (
    <div className="space-y-6">
      <MedicalDisclaimer />

      {/* Çok-haftalık program bandı */}
      {(weekCount > 1 || totalWeeks > 1) && (
        <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-800 dark:text-emerald-200">
              {weekCount} haftalık döngü · {totalWeeks} hafta hedef
            </span>
            {finishDate && (
              <span className="text-emerald-700/80 dark:text-emerald-300/70">
                tahmini bitiş: {finishDate}
              </span>
            )}
          </div>
          {weekCount > 1 && (
            <div className="flex gap-1.5 overflow-x-auto">
              {Array.from({ length: weekCount }, (_, w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setSelectedWeek(w)}
                  className={
                    "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition " +
                    (w === selectedWeek
                      ? "bg-emerald-600 text-white"
                      : "bg-white/70 text-gray-600 hover:bg-white dark:bg-white/5 dark:text-gray-300")
                  }
                >
                  {w + 1}. hafta
                  {w === initialWeek ? " (bu hafta)" : ""}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <CalorieHero
        title={heroTitle}
        dailyTarget={dailyTarget}
        goalLossKg={goalLossKg}
        estimatedWeeks={estimatedWeeks}
        plannedToday={plannedDay}
        consumedToday={consumedDay}
      />

      <WaterTracker initialMl={initialWaterMl} />

      {/* Hızlı erişim */}
      <div className="grid gap-2 sm:grid-cols-2">
        <form action={openAssistant}>
          <Button type="submit" variant="outline" className="w-full gap-2">
            <MessageCircle className="h-4 w-4" /> Asistana soru sor
          </Button>
        </form>
        <Button asChild variant="outline" className="w-full gap-2">
          <Link href="/ilerleme">
            <LineChart className="h-4 w-4" /> Kilo & ilerleme takibi
          </Link>
        </Button>
      </div>

      <p className="text-xs text-gray-400">
        Öğünü açmak için başlığa dokun. Bir besine dokununca miktarını/içeriğini
        değiştirebilir, her öğünün tabağını fotoğrafla paylaşabilirsin. Kalori
        otomatik güncellenir.
      </p>

      <EditableMeals
        meals={meals}
        setMeals={setMeals}
        planId={planId}
        foods={foods}
        selectedDay={selectedDay}
        setSelectedDay={setSelectedDay}
        selectedWeek={selectedWeek}
      />

      {/* İlerlemeye göre programı güncelle (AI planları için) */}
      <form
        action={regeneratePlan}
        onSubmit={(e) => {
          if (
            !window.confirm(
              "Güncel kilon ve kalan süreye göre yeni bir program üretilecek (birkaç saniye sürebilir). Devam edilsin mi?",
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 text-sm font-medium text-emerald-700 transition-[background-color,transform] duration-200 ease-[var(--ease-out)] hover:bg-emerald-50 active:scale-[0.98] dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300"
        >
          <LineChart className="h-4 w-4" /> İlerlememe göre programı güncelle
        </button>
      </form>

      {/* Planı sıfırla — en baştan başla */}
      <form
        action={resetPlan}
        onSubmit={(e) => {
          if (
            !window.confirm(
              "Mevcut planın arşivlenip en başa döneceksin. Devam edilsin mi?",
            )
          ) {
            e.preventDefault();
          }
        }}
        className="border-t border-gray-200 pt-5 dark:border-gray-800"
      >
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/60 px-4 py-2.5 text-sm font-medium text-red-600 transition-[background-color,border-color,transform] duration-200 ease-[var(--ease-out)] hover:border-red-300 hover:bg-red-50 active:scale-[0.98] dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          <RotateCcw className="h-4 w-4" /> Planı sıfırla ve en baştan başla
        </button>
        <p className="mt-2 text-center text-xs text-gray-400">
          Mevcut planın arşivlenir; istediğin zaman yeni plan oluşturabilirsin.
        </p>
      </form>

      {/* Yüzen, sürüklenebilir Ümüş Teyze (sabit konumlu — akışta yer kaplamaz) */}
      <CalorieFigure
        consumed={consumedDay}
        target={dailyTarget}
        meals={meals}
        selectedDay={selectedDay}
        selectedWeek={selectedWeek}
      />
    </div>
  );
}
