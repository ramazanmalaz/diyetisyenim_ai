"use client";

import { Flame, UtensilsCrossed } from "lucide-react";

type Day = { active: boolean; isToday: boolean; label: string };

export function DailySummary({
  streak,
  days,
  eatenToday,
  plannedToday,
  consumedCal,
  target,
}: {
  streak: number;
  days: Day[];
  eatenToday: number;
  plannedToday: number;
  consumedCal: number;
  target: number | null;
}) {
  const streakMsg =
    streak === 0
      ? "Bugün bir öğün işaretle, seriyi başlat 🔥"
      : streak < 3
        ? "Güzel gidiyor, böyle devam!"
        : streak < 7
          ? "Harika bir seri yakaladın!"
          : "İnanılmaz disiplin — efsanesin! 🏆";

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/40 p-4 shadow-[var(--shadow-soft)] dark:border-amber-900/40 dark:from-amber-950/20 dark:to-orange-950/10">
      <div className="flex items-center gap-3">
        {/* Seri rozeti */}
        <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-amber-400 to-orange-500 text-white shadow-[0_6px_16px_-6px_rgba(249,115,22,0.7)]">
          <Flame className="h-6 w-6" strokeWidth={2.25} fill="currentColor" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold tabular-nums tracking-tight text-amber-900 dark:text-amber-100">
              {streak}
            </span>
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              günlük seri
            </span>
          </p>
          <p className="mt-0.5 truncate text-xs text-amber-700/80 dark:text-amber-300/70">
            {streakMsg}
          </p>
        </div>
      </div>

      {/* Son 7 gün */}
      <div className="mt-4 flex items-end justify-between gap-1">
        {days.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span
              className={
                "grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold transition " +
                (d.active
                  ? "bg-gradient-to-b from-amber-400 to-orange-500 text-white shadow-[0_3px_8px_-3px_rgba(249,115,22,0.6)]"
                  : "bg-white/70 text-gray-300 ring-1 ring-amber-200/70 dark:bg-white/5 dark:text-gray-600 dark:ring-amber-900/40") +
                (d.isToday ? " ring-2 ring-amber-500 ring-offset-1 dark:ring-offset-gray-950" : "")
              }
            >
              {d.active ? <Flame className="h-3.5 w-3.5" fill="currentColor" /> : ""}
            </span>
            <span
              className={
                "text-[10px] " +
                (d.isToday
                  ? "font-bold text-amber-700 dark:text-amber-300"
                  : "text-gray-400")
              }
            >
              {d.label}
            </span>
          </div>
        ))}
      </div>

      {/* Bugünün kısa özeti */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-white/60 px-3 py-2 text-sm ring-1 ring-amber-100 dark:bg-white/5 dark:ring-amber-900/30">
        <span className="flex items-center gap-1.5 text-amber-900/80 dark:text-amber-100/80">
          <UtensilsCrossed className="h-4 w-4 text-amber-600" strokeWidth={2} />
          Bugün{" "}
          <b className="tabular-nums">
            {eatenToday}/{plannedToday}
          </b>{" "}
          öğün
        </span>
        {target ? (
          <span className="tabular-nums text-amber-900/80 dark:text-amber-100/80">
            <b>{consumedCal}</b>
            <span className="text-amber-700/60"> / {target} kcal</span>
          </span>
        ) : (
          <span className="tabular-nums font-semibold text-amber-900/80 dark:text-amber-100/80">
            {consumedCal} kcal
          </span>
        )}
      </div>
    </section>
  );
}
