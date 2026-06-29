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
  type ExerciseDemoResult,
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

// İnce film greni — OLED siyah üzerinde derinlik (Any Distance tarzı).
const NOISE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

/** Tamamlanma halkası — gradient stroke + glow (Any Distance imzası). */
function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (completed / total) * 100) : 0;
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative grid h-[72px] w-[72px] shrink-0 place-items-center">
      <svg className="h-[72px] w-[72px] -rotate-90" viewBox="0 0 72 72">
        <defs>
          <linearGradient id="ringgrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#bef264" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
        </defs>
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="7" className="stroke-white/10" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          stroke="url(#ringgrad)"
          strokeDasharray={`${dash} ${circ}`}
          className="transition-[stroke-dasharray] duration-500 ease-[var(--ease-out)] drop-shadow-[0_0_6px_rgba(163,230,53,0.55)]"
        />
      </svg>
      <span className="absolute font-display text-sm font-extrabold tabular-nums text-white">
        {completed}
        <span className="text-zinc-500">/{total}</span>
      </span>
    </div>
  );
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
  const [demo, setDemo] = useState<ExerciseDemoResult & { loading: boolean }>({
    frames: null,
    gifUrl: null,
    trSteps: null,
    trInstructions: null,
    muscleGroup: null,
    loading: false,
  });
  const [frameIdx, setFrameIdx] = useState(0);

  const day = days[activeDay];

  // Detay açılınca egzersiz demo karelerini getir (enName önce, yoksa Türkçe ad).
  useEffect(() => {
    if (!detail) return;
    let active = true;
    const q = detail.enName?.trim() || detail.name;
    queueMicrotask(() => {
      if (active)
        setDemo({ frames: null, gifUrl: null, trSteps: null, trInstructions: null, muscleGroup: null, loading: true });
    });
    exerciseDemo(q).then((res) => {
      if (active) setDemo({ ...res, loading: false });
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
    <div className="min-h-[calc(100vh-7rem)] bg-black text-zinc-100">
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8">
        {/* ===== Hero ===== */}
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-zinc-900 via-black to-emerald-950/40 p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-lime-400/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
            style={{ backgroundImage: `url("${NOISE}")` }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold tracking-[0.22em] text-lime-300 uppercase ring-1 ring-white/10">
              <Dumbbell className="h-3.5 w-3.5" /> Spor Programı
            </span>
            <h1 className="font-display mt-3 text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.03em] text-white">
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
                    className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300 ring-1 ring-white/10 backdrop-blur-sm"
                  >
                    {t}
                  </span>
                ))}
            </div>
          </div>
        </section>

        {program?.note && (
          <div className="flex gap-2.5 rounded-2xl border border-lime-400/15 bg-lime-400/[0.06] p-3.5 text-sm text-lime-100/90">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
            <p>{program.note}</p>
          </div>
        )}

        {/* ===== Gün sekmeleri ===== */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d, i) => {
            const total = d.exercises.length;
            let c = 0;
            for (let j = 0; j < total; j++) if (done.has(`${i}|${j}`)) c += 1;
            const complete = total > 0 && c === total;
            const active = i === activeDay;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActiveDay(i)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold transition-[transform,background-color] duration-200 ease-[var(--ease-out)] active:scale-[0.96]",
                  active
                    ? "bg-white text-black shadow-[0_8px_22px_-10px_rgba(255,255,255,0.5)]"
                    : "bg-white/5 text-zinc-400 ring-1 ring-white/10 hover:bg-white/10 hover:text-zinc-200",
                )}
              >
                {complete && (
                  <Check
                    className={cn("h-3.5 w-3.5", active ? "text-black" : "text-lime-400")}
                    strokeWidth={3.5}
                  />
                )}
                {i + 1}. Gün
              </button>
            );
          })}
        </div>

        {/* ===== Seçili gün ===== */}
        {day && (
          <section
            className={cn(
              "overflow-hidden rounded-3xl border bg-white/[0.03] backdrop-blur-sm transition",
              dayDone ? "border-lime-400/40" : "border-white/10",
            )}
          >
            <div className="flex items-center gap-4 border-b border-white/10 px-5 py-4">
              <ProgressRing
                completed={dayProgress.completed}
                total={dayProgress.total}
              />
              <div className="min-w-0 flex-1">
                <h2 className="font-display truncate text-xl font-extrabold tracking-tight">
                  {day.day}
                </h2>
                {day.focus && (
                  <p className="truncate text-sm font-medium text-lime-300/90">
                    {day.focus}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-zinc-500">
                  {dayDone
                    ? "Günü tamamladın 🔥"
                    : `${dayProgress.total - dayProgress.completed} hareket kaldı`}
                </p>
              </div>
            </div>

            <p className="px-5 pt-3 text-[11px] text-zinc-500">
              Yaptığın hareketi <span className="text-zinc-300">soldaki daireden</span> işaretle ·
              ada dokun → <span className="text-zinc-300">videolu anlatım</span>.
            </p>

            <ul className="divide-y divide-white/5 px-2 py-1">
              {day.exercises.map((ex, j) => {
                const isDone = done.has(`${activeDay}|${j}`);
                const title = localizeExercise(ex);
                return (
                  <li key={j} className="flex items-center gap-2 px-1.5 py-1">
                    {/* Tik */}
                    <button
                      type="button"
                      onClick={() => toggleExercise(activeDay, j)}
                      aria-label={isDone ? "İşareti kaldır" : "Yapıldı olarak işaretle"}
                      aria-pressed={isDone}
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 transition-[transform,background-color,box-shadow] duration-200 ease-[var(--ease-out)] active:scale-90",
                        isDone
                          ? "border-transparent bg-gradient-to-br from-lime-300 to-emerald-400 text-black shadow-[0_6px_16px_-6px_rgba(163,230,53,0.8)]"
                          : "border-zinc-700 text-transparent hover:border-lime-400/60",
                      )}
                    >
                      <Check className="h-5 w-5" strokeWidth={3.5} />
                    </button>
                    {/* Ad + detay */}
                    <button
                      type="button"
                      onClick={() => setDetail(ex)}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2.5 py-3 text-left transition-colors duration-200 ease-[var(--ease-out)] hover:bg-white/5 active:bg-white/10"
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-semibold transition",
                            isDone && "text-zinc-600 line-through",
                          )}
                        >
                          {title}
                        </p>
                        <p className="text-xs tabular-nums text-zinc-400">
                          {ex.sets} × {ex.reps}
                          {ex.rest ? ` · dinlenme ${ex.rest}` : ""}
                        </p>
                      </div>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5 text-lime-300 ring-1 ring-white/10 transition group-hover:bg-white/10">
                        <Play className="h-4 w-4" fill="currentColor" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}


        {/* ===== Yeniden oluştur ===== */}
        <form action={resetWorkout}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-zinc-300 transition-[transform,background-color] duration-200 ease-[var(--ease-out)] hover:bg-white/10 active:scale-[0.98]"
          >
            <RotateCcw className="h-4 w-4" /> Yeni program oluştur
          </button>
        </form>

        <p className="text-center text-[11px] text-zinc-600">
          Bu program genel bilgilendirme amaçlıdır, tıbbi tavsiye değildir. Ağrı
          veya rahatsızlık hissedersen dur ve bir uzmana danış.
        </p>
      </div>

      {/* ===== Egzersiz detay paneli ===== */}
      {detail && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="reveal w-full max-w-md rounded-t-[28px] border border-white/10 bg-zinc-950/95 p-5 sm:rounded-[28px]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-xl font-extrabold tracking-tight">
                  {localizeExercise(detail)}
                </h3>
                <p className="mt-0.5 text-sm tabular-nums text-zinc-400">
                  {detail.sets} set × {detail.reps}
                  {detail.rest ? ` · dinlenme ${detail.rest}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                aria-label="Kapat"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-zinc-400 ring-1 ring-white/10 transition hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Hareket görseli: önce animasyonlu GIF (exercises-dataset), yoksa 2-kare animasyon */}
            {demo.loading && (
              <div className="mt-4 grid h-48 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-sm text-zinc-500">
                Hareket görseli yükleniyor…
              </div>
            )}
            {!demo.loading && demo.gifUrl && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={demo.gifUrl}
                  alt={`${localizeExercise(detail)} hareketi`}
                  className="mx-auto max-h-60 w-auto"
                />
              </div>
            )}
            {!demo.loading && !demo.gifUrl && demo.frames && demo.frames.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={demo.frames[frameIdx] ?? demo.frames[0]}
                  alt={`${localizeExercise(detail)} hareketi`}
                  className="mx-auto max-h-60 w-auto"
                />
              </div>
            )}

            {/* Türkçe yapılış adımları */}
            {!demo.loading && (demo.trSteps ?? demo.trInstructions) && (
              <div className="mt-3 space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-bold tracking-[0.14em] text-lime-300 uppercase">
                  Nasıl yapılır
                </p>
                {demo.trSteps && demo.trSteps.length > 0 ? (
                  <ol className="space-y-1.5 text-sm text-zinc-300">
                    {demo.trSteps.map((step, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime-400/10 text-[10px] font-bold text-lime-400 ring-1 ring-lime-400/20">
                          {i + 1}
                        </span>
                        <span className="leading-snug">{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm leading-relaxed text-zinc-300">
                    {demo.trInstructions}
                  </p>
                )}
                {demo.muscleGroup && (
                  <p className="mt-2 text-xs text-zinc-500">
                    Çalışan kas:{" "}
                    <span className="font-medium text-zinc-400">{demo.muscleGroup}</span>
                  </p>
                )}
              </div>
            )}

            {detail.note && (
              <p className="mt-3 flex gap-2 rounded-xl bg-white/5 p-3 text-sm text-zinc-300">
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
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-bold text-black shadow-[0_10px_30px_-10px_rgba(255,255,255,0.4)] transition-[transform,filter] duration-200 ease-[var(--ease-out)] hover:bg-zinc-100 active:scale-[0.98]"
            >
              <Play className="h-4 w-4" fill="currentColor" /> Videolu anlatımı izle
            </a>
            <p className="mt-2 text-center text-[11px] text-zinc-600">
              YouTube&apos;da arama açılır.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
