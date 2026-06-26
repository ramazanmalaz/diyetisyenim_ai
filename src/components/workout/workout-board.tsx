"use client";

import {
  Check,
  Dumbbell,
  Info,
  Play,
  RotateCcw,
  Timer,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  exerciseDemo,
  resetWorkout,
  setExerciseDone,
} from "@/app/(app)/spor/actions";
import { localizeExercise } from "@/lib/exercise-tr";
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
  initialLogs: { day_index: number; exercise_index: number; log_date: string }[];
}) {
  const days = program?.days ?? [];

  const [activeDay, setActiveDay] = useState(0);
  // Bugün tamamlanan egzersizler: "dayIndex|exerciseIndex"
  const [done, setDone] = useState<Set<string>>(
    () =>
      new Set(
        initialLogs
          .filter((l) => l.log_date === todayDate)
          .map((l) => `${l.day_index}|${l.exercise_index}`),
      ),
  );
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [demo, setDemo] = useState<{
    frames: string[] | null;
    loading: boolean;
  }>({ frames: null, loading: false });
  const [frameIdx, setFrameIdx] = useState(0);

  const day = days[activeDay];

  // Detay açılınca egzersiz demo karelerini getir (enName önce, yoksa Türkçe ad).
  useEffect(() => {
    if (!detail) return;
    let active = true;
    const q = detail.enName?.trim() || detail.name;
    queueMicrotask(() => {
      if (active) setDemo({ frames: null, loading: true });
    });
    exerciseDemo(q).then((res) => {
      if (active) setDemo({ frames: res.frames, loading: false });
    });
    return () => {
      active = false;
    };
  }, [detail]);

  // 2 kareyi dönüştürerek hareket animasyonu (loop).
  useEffect(() => {
    if (!demo.frames || demo.frames.length < 2) return;
    const id = setInterval(() => setFrameIdx((i) => (i + 1) % 2), 700);
    return () => clearInterval(id);
  }, [demo.frames]);

  // Seçili günün ilerlemesi.
  const dayProgress = useMemo(() => {
    if (!day) return { completed: 0, total: 0 };
    let c = 0;
    for (let j = 0; j < day.exercises.length; j++) {
      if (done.has(`${activeDay}|${j}`)) c += 1;
    }
    return { completed: c, total: day.exercises.length };
  }, [day, done, activeDay]);

  async function toggleExercise(dayIndex: number, exIndex: number) {
    const key = `${dayIndex}|${exIndex}`;
    const next = !done.has(key);
    setDone((prev) => {
      const n = new Set(prev);
      if (next) n.add(key);
      else n.delete(key);
      return n;
    });
    const res = await setExerciseDone({
      dayIndex,
      exerciseIndex: exIndex,
      date: todayDate,
      done: next,
    });
    if (res && "error" in res) {
      // başarısızsa geri al
      setDone((prev) => {
        const n = new Set(prev);
        if (next) n.delete(key);
        else n.add(key);
        return n;
      });
    }
  }

  const dayDone =
    dayProgress.total > 0 && dayProgress.completed === dayProgress.total;

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

        {program?.note && (
          <div className="flex gap-2.5 rounded-2xl border border-lime-400/20 bg-lime-400/5 p-3.5 text-sm text-lime-100/90">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
            <p>{program.note}</p>
          </div>
        )}

        {/* Gün sekmeleri */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d, i) => {
            const total = d.exercises.length;
            let c = 0;
            for (let j = 0; j < total; j++) if (done.has(`${i}|${j}`)) c += 1;
            const complete = total > 0 && c === total;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActiveDay(i)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition active:scale-[0.97]",
                  i === activeDay
                    ? "border-lime-400/50 bg-lime-400/15 text-lime-200"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800",
                )}
              >
                {complete && (
                  <Check className="h-3.5 w-3.5 text-lime-400" strokeWidth={3} />
                )}
                {i + 1}. Gün
              </button>
            );
          })}
        </div>

        {/* Seçili gün */}
        {day && (
          <section
            className={cn(
              "overflow-hidden rounded-2xl border bg-zinc-900 transition",
              dayDone ? "border-lime-400/40" : "border-zinc-800",
            )}
          >
            <div className="border-b border-zinc-800 px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold">{day.day}</h2>
                  {day.focus && (
                    <p className="truncate text-xs text-lime-300/90">
                      {day.focus}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
                    dayDone
                      ? "bg-lime-400/15 text-lime-300"
                      : "bg-zinc-800 text-zinc-400",
                  )}
                >
                  {dayProgress.completed}/{dayProgress.total}
                </span>
              </div>
              {/* İlerleme çubuğu */}
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-lime-400 to-emerald-400 transition-[width] duration-300"
                  style={{
                    width: `${
                      dayProgress.total
                        ? (dayProgress.completed / dayProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <p className="px-4 pt-3 text-[11px] text-zinc-500">
              💡 Yaptığın egzersizi <span className="text-zinc-300">soldaki daireden</span> işaretle ·
              ada dokun → <span className="text-zinc-300">videolu anlatım</span>.
            </p>

            <ul className="divide-y divide-zinc-800/70">
              {day.exercises.map((ex, j) => {
                const isDone = done.has(`${activeDay}|${j}`);
                const title = localizeExercise(ex);
                return (
                  <li key={j} className="flex items-center gap-2 px-3 py-1">
                    {/* Tik */}
                    <button
                      type="button"
                      onClick={() => toggleExercise(activeDay, j)}
                      aria-label={isDone ? "İşareti kaldır" : "Yapıldı olarak işaretle"}
                      aria-pressed={isDone}
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 transition active:scale-90",
                        isDone
                          ? "border-lime-400 bg-lime-400 text-zinc-900"
                          : "border-zinc-600 text-transparent hover:border-lime-400/60",
                      )}
                    >
                      <Check className="h-5 w-5" strokeWidth={3} />
                    </button>
                    {/* Ad + detay */}
                    <button
                      type="button"
                      onClick={() => setDetail(ex)}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1.5 py-2.5 text-left transition hover:bg-zinc-800/60 active:bg-zinc-800"
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-medium transition",
                            isDone && "text-zinc-500 line-through",
                          )}
                        >
                          {title}
                        </p>
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
                );
              })}
            </ul>
          </section>
        )}

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
                <h3 className="text-lg font-bold">{localizeExercise(detail)}</h3>
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

            {/* İnline hareket görseli (başlangıç/bitiş kareleri animasyonlu) */}
            {demo.loading && (
              <div className="mt-4 grid h-48 place-items-center rounded-2xl border border-zinc-800 bg-zinc-800/40 text-sm text-zinc-500">
                Hareket görseli yükleniyor…
              </div>
            )}
            {!demo.loading && demo.frames && demo.frames.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={demo.frames[frameIdx] ?? demo.frames[0]}
                  alt={`${localizeExercise(detail)} hareketi`}
                  className="mx-auto max-h-60 w-auto"
                />
              </div>
            )}

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
              href={youtubeSearch(localizeExercise(detail))}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-400 px-4 py-3 text-sm font-bold text-zinc-900 transition hover:brightness-105 active:scale-[0.98]"
            >
              <Play className="h-4 w-4" fill="currentColor" /> Videolu anlatımı izle
            </a>
            <p className="mt-2 text-center text-[11px] text-zinc-500">
              YouTube&apos;da arama açılır.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
