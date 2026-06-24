"use client";

import { Dumbbell, Info, RotateCcw } from "lucide-react";

import { resetWorkout } from "@/app/(app)/spor/actions";
import { GOAL_LABEL, LEVEL_LABEL, type WorkoutProgram } from "@/lib/workout";

export function WorkoutBoard({
  program,
  mode,
  level,
  goal,
  daysPerWeek,
}: {
  program: WorkoutProgram;
  mode: string;
  level: string | null;
  goal: string | null;
  daysPerWeek: number;
}) {
  const days = program?.days ?? [];

  return (
    <div className="min-h-[calc(100vh-7rem)] bg-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-8">
        {/* Başlık */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-400/15 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-lime-300 uppercase">
              <Dumbbell className="h-3.5 w-3.5" /> Spor Programı
            </span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              Antrenman Planım
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {mode === "gym" ? "Spor salonu" : "Kendi vücut ağırlığı"} ·{" "}
              {goal ? GOAL_LABEL[goal] ?? goal : "—"} ·{" "}
              {level ? LEVEL_LABEL[level] ?? level : "—"} · haftada {daysPerWeek}{" "}
              gün
            </p>
          </div>
        </div>

        {program?.note && (
          <div className="flex gap-2.5 rounded-2xl border border-lime-400/20 bg-lime-400/5 p-3.5 text-sm text-lime-100/90">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
            <p>{program.note}</p>
          </div>
        )}

        {/* Günler */}
        <div className="space-y-4">
          {days.map((d, i) => (
            <section
              key={i}
              className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
            >
              <div className="flex items-baseline justify-between gap-2 border-b border-zinc-800 px-4 py-3">
                <h2 className="font-bold">{d.day}</h2>
                {d.focus && (
                  <span className="text-xs font-medium text-lime-300">
                    {d.focus}
                  </span>
                )}
              </div>
              <ul className="divide-y divide-zinc-800/70">
                {d.exercises.map((ex, j) => (
                  <li key={j} className="flex items-start gap-3 px-4 py-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-zinc-800 text-xs font-bold text-lime-300">
                      {j + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{ex.name}</p>
                      {ex.note && (
                        <p className="mt-0.5 text-xs text-zinc-400">{ex.note}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right text-xs tabular-nums text-zinc-300">
                      <p className="font-semibold text-zinc-100">
                        {ex.sets} × {ex.reps}
                      </p>
                      {ex.rest && (
                        <p className="text-zinc-500">dinlenme {ex.rest}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
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
    </div>
  );
}
