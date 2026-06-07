"use client";

import { LineChart, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { openAssistant } from "@/app/(app)/sohbet/actions";
import { CalorieCat } from "@/components/plan/calorie-cat";
import { CalorieHero } from "@/components/plan/calorie-hero";
import { EditableMeals, type Meal } from "@/components/plan/editable-meals";
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
};

export function PlanBoard({
  planId,
  foods,
  initialMeals,
  dailyTarget,
  goalLossKg,
  estimatedWeeks,
  todayIdx,
}: Props) {
  const [meals, setMeals] = useState<Meal[]>(initialMeals);
  const [selectedDay, setSelectedDay] = useState<number>(todayIdx);

  // Özet, SEÇİLİ günün canlı öğün state'inden hesaplanır → gün/öğün değiştikçe güncellenir.
  const { plannedDay, consumedDay } = useMemo(() => {
    const dayRows = meals.filter((m) => m.day_of_week === selectedDay);
    return {
      plannedDay: dayRows.reduce((s, m) => s + (m.calories ?? 0), 0),
      consumedDay: dayRows
        .filter((m) => m.checked)
        .reduce((s, m) => s + (m.calories ?? 0), 0),
    };
  }, [meals, selectedDay]);

  const heroTitle =
    selectedDay === todayIdx ? "Bugünün özeti" : `${DAYS[selectedDay]} özeti`;

  return (
    <div className="space-y-6">
      <CalorieHero
        title={heroTitle}
        dailyTarget={dailyTarget}
        goalLossKg={goalLossKg}
        estimatedWeeks={estimatedWeeks}
        plannedToday={plannedDay}
        consumedToday={consumedDay}
      />

      <CalorieCat consumed={consumedDay} target={dailyTarget} />

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
      />
    </div>
  );
}
