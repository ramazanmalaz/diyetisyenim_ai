"use client";

import {
  Check,
  Dumbbell,
  Flame,
  Info,
  Play,
  RotateCcw,
  Timer,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { resetWorkout, setWorkoutDone } from "@/app/(app)/spor/actions";
import { computeStreak, last7Days } from "@/lib/plan/streak";
import {
  GOAL_LABEL,
  LEVEL_LABEL,
  type Exercise,
  type WorkoutProgram,
} from "@/lib/workout";
import { cn } from "@/lib/utils";

function youtubeSearch(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${name} nasıl yapılır`,
  )}`;
}

export function WorkoutBoard({
  program,
  mode,
  level,
  goal,
  daysPerWeek,
  todayDate,
  initialLogs,
}: {
  program: WorkoutProgram;
  mode: string;
  level: string | null;
  goal: string | null;
  daysPerWeek: number;
  todayDate: string;
  initialLogs: { day_index: number; log_date: string }[];
}) {
  const days = program?.days ?? [];

  const [logs, setLogs] = useState<Set<string>>(
    () => new Set(initialLogs.map((l) => `${l.day_index}|${l.log_date}`)),
  );
  const [detail, setDetail] = useState<Exercise | null>(null);

  const { streak, last7, weekCount } = useMemo(() => {
    const dates = new Set<string>();
    for (const k of logs) dates.add(k.slice(k.indexOf("|") + 1));
    const [y, m, d] = todayDate.split("-").map(Number);
    const todayUTC = Date.UTC(y, m - 1, d);
    const dow = new Date(todayUTC).getUTCDay();
    const sinceMon = (dow + 6) % 7;
    const weekStart = todayUTC - sinceMon * 86_400_000;
    let wc = 0;
    for (const ds of dates) {
      const [yy, mm, dd] = ds.split("-").map(Number);
      if (Date.UTC(yy, mm - 1, dd) >= weekStart) wc += 1;
    }
    return {
      streak: computeStreak(dates, todayDate),
      last7: last7Days(dates, todayDate),
      weekCount: wc,
    };
  }, [logs, todayDate]);

  async function toggleDone(dayIndex: number) {
    const key = `${dayIndex}|${todayDate}`;
    const done = !logs.has(key);
    setLogs((prev) => {
      const n = new Set(prev);
      if (done) n.add(key);
      else n.delete(key);
      return n;
    });
    const res = await setWorkoutDone({ dayIndex, date: todayDate, done });
    if (res && "error" in res) {
      setLogs((prev) => {
        const n = new Set(prev);
        if (done) n.delete(key);
        else n.add(key);
        return n;
      });
    }
  }

  const streakMsg =
    streak === 0
      ? "Bugün bir antrenmanı tamamla, seriyi başlat 🔥"
      : streak < 3
        ? "Güzel gidiyor!"
        : streak < 7
          ? "Harika bir seri!"
          : "Efsanesin! 🏆";

  return (
    <div className="min-h-[calc(100vh-7rem)] bg-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-8">
        {/* Başlık — gradient hero */}
        <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-lime-950/40 p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-12 h-44 w-44 rounded-full bg-lime-400/15 blur-3xl"
          />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-400/15 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-lime-300 uppercase">
            <Dumbbell className="h-3.5 w-3.5" /> Spor Programı
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
            Antrenman Planım
          </h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              mode === "gym" ? "Spor salonu" : "Kendi vücut ağırlığı",
              goal ? (GOAL_LABEL[goal] ?? goal) : null,
              level ? (LEVEL_LABEL[level] ?? level) : null,
              `Haftada ${daysPerWeek} gün`,
            ]
              .filter(Boolean)
              .map((t) => (
                <span
                  key={t as string}
                  className="rounded-full bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300"
                >
                  {t}
                </span>
              ))}
          </div>
        </section>

        {/* Seri / istatistik */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-orange-400 to-orange-600 text-white shadow-[0_6px_16px_-6px_rgba(249,115,22,0.6)]">
              <Flame className="h-6 w-6" strokeWidth={2.25} fill="currentColor" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold tabular-nums">
                  {streak}
                </span>
                <span className="text-sm font-semibold text-zinc-300">
                  günlük seri
                </span>
              </p>
              <p className="truncate text-xs text-zinc-400">{streakMsg}</p>
            </div>
            <div className="shrink-0 rounded-xl bg-lime-400/15 px-3 py-1.5 text-center">
              <p className="text-lg font-extrabold tabular-nums text-lime-300">
                {weekCount}
              </p>
              <p className="text-[10px] text-zinc-400">bu hafta</p>
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-1">
            {last7.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold transition",
                    d.active
                      ? "bg-gradient-to-b from-orange-400 to-orange-600 text-white"
                      : "bg-zinc-800 text-zinc-600",
                    d.isToday &&
                      "ring-2 ring-lime-400 ring-offset-2 ring-offset-zinc-900",
                  )}
                >
                  {d.active ? (
                    <Flame className="h-3.5 w-3.5" fill="currentColor" />
                  ) : (
                    ""
                  )}
                </span>
                <span
                  className={cn(
                    "text-[10px]",
                    d.isToday ? "font-bold text-lime-300" : "text-zinc-500",
                  )}
                >
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {program?.note && (
          <div className="flex gap-2.5 rounded-2xl border border-lime-400/20 bg-lime-400/5 p-3.5 text-sm text-lime-100/90">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
            <p>{program.note}</p>
          </div>
        )}

        <p className="px-1 text-xs text-zinc-500">
          💡 Bir egzersize dokun → nasıl yapıldığını videoyla izle.
        </p>

        {/* Günler */}
        <div className="space-y-4">
          {days.map((d, i) => {
            const doneToday = logs.has(`${i}|${todayDate}`);
            return (
              <section
                key={i}
                className={cn(
                  "overflow-hidden rounded-2xl border bg-zinc-900 transition",
                  doneToday ? "border-lime-400/40" : "border-zinc-800",
                )}
              >
                <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-lime-400/15 text-sm font-extrabold text-lime-300">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-bold">{d.day}</h2>
                    {d.focus && (
                      <p className="truncate text-xs text-lime-300/90">
                        {d.focus}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] text-zinc-500">
                    {d.exercises.length} hareket
                  </span>
                </div>
                <ul className="divide-y divide-zinc-800/70">
                  {d.exercises.map((ex, j) => (
                    <li key={j}>
                      <button
                        type="button"
                        onClick={() => setDetail(ex)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-800/60 active:bg-zinc-800"
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-zinc-800 text-xs font-bold text-zinc-400">
                          {j + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{ex.name}</p>
                          <p className="text-xs tabular-nums text-zinc-400">
                            {ex.sets} × {ex.reps}
                            {ex.rest ? ` · dinlenme ${ex.rest}` : ""}
                          </p>
                        </div>
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime-400/15 text-lime-300">
                          <Play className="h-4 w-4" fill="currentColor" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => toggleDone(i)}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 border-t border-zinc-800 py-2.5 text-sm font-semibold transition active:scale-[0.99]",
                    doneToday
                      ? "bg-lime-400/15 text-lime-300"
                      : "text-zinc-300 hover:bg-zinc-800",
                  )}
                >
                  <Check className="h-4 w-4" />
                  {doneToday
                    ? "Bugün tamamlandı ✓"
                    : "Bugün bu antrenmanı yaptım"}
                </button>
              </section>
            );
          })}
        </div>

        {/* Yeniden oluştur */}
        <form action={resetWorkout}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 active:scale-[0.98]"
          >
            <RotateCcw className="h-4 w-4" /> Yeni program oluştur
          </button>
        </form>

        <p className="text-center text-[11px] text-zinc-500">
          Bu program genel bilgilendirme amaçlıdır, tıbbi tavsiye değildir. Ağrı
          veya rahatsızlık hissedersen dur ve bir uzmana danış.
        </p>
      </div>

      {/* Egzersiz detay paneli */}
      {detail && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="reveal w-full max-w-md rounded-t-3xl border border-zinc-800 bg-zinc-900 p-5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-bold">{detail.name}</h3>
                <p className="mt-0.5 text-sm tabular-nums text-zinc-400">
                  {detail.sets} set × {detail.reps}
                  {detail.rest ? ` · dinlenme ${detail.rest}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                aria-label="Kapat"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-800 text-zinc-400 transition hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {detail.note && (
              <p className="mt-3 flex gap-2 rounded-xl bg-zinc-800/60 p-3 text-sm text-zinc-300">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
                {detail.note}
              </p>
            )}

            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
              <Timer className="h-3.5 w-3.5" />
              Setler arası ~{detail.rest || "60 sn"} dinlen.
            </div>

            <a
              href={youtubeSearch(detail.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-400 px-4 py-3 text-sm font-bold text-zinc-900 transition hover:brightness-105 active:scale-[0.98]"
            >
              <Play className="h-4 w-4" fill="currentColor" /> Videolu anlatımı izle
            </a>
            <p className="mt-2 text-center text-[11px] text-zinc-500">
              YouTube&apos;da &quot;{detail.name} nasıl yapılır&quot; araması açılır.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
