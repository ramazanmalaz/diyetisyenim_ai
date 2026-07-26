"use client";

import { ChevronDown } from "lucide-react";

import type { ExerciseCard } from "@/app/(app)/spor/actions";

export function MuscleExerciseFeed({
  exercises,
}: {
  exercises: ExerciseCard[];
}) {
  if (exercises.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-zinc-500">Bu bölge için egzersiz bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-scroll snap-y snap-mandatory bg-zinc-950">
      {exercises.map((ex, i) => (
        <div
          key={ex.id}
          className="relative flex h-full w-full shrink-0 snap-start snap-always flex-col overflow-y-auto px-5 pb-8 pt-4"
        >
          {/* Üst satır: kas etiketi + sayfa numarası */}
          <div className="flex items-center justify-between">
            {ex.muscleGroup ? (
              <span className="inline-flex items-center rounded-full bg-lime-400/10 px-3 py-1 text-xs font-semibold text-lime-300 ring-1 ring-lime-400/20">
                {ex.muscleGroup}
              </span>
            ) : (
              <span />
            )}
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-white/40">
              {i + 1} / {exercises.length}
            </span>
          </div>

          {/* Hareket görseli — kutulu/küçük (tam ekran gerilip pikselleşmesin) */}
          <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white">
            {ex.gifUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ex.gifUrl}
                alt={ex.name}
                className="mx-auto max-h-60 w-auto object-contain"
                loading="lazy"
              />
            ) : (
              <div className="grid h-40 place-items-center text-sm text-zinc-400">
                Görsel yok
              </div>
            )}
          </div>

          {/* Egzersiz adı */}
          <h3 className="mt-4 font-display text-xl font-extrabold tracking-tight text-white">
            {ex.name}
          </h3>

          {/* Türkçe yapılış adımları — doğrudan görünür, ekstra tıklama gerekmez */}
          {(ex.trSteps ?? ex.trInstructions) && (
            <div className="mt-3 space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] font-bold tracking-[0.14em] text-lime-300 uppercase">
                Nasıl yapılır
              </p>
              {ex.trSteps && ex.trSteps.length > 0 ? (
                <ol className="space-y-1.5 text-sm text-zinc-300">
                  {ex.trSteps.map((step, si) => (
                    <li key={si} className="flex gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime-400/10 text-[10px] font-bold text-lime-400 ring-1 ring-lime-400/20">
                        {si + 1}
                      </span>
                      <span className="leading-snug">{step}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm leading-relaxed text-zinc-300">
                  {ex.trInstructions}
                </p>
              )}
            </div>
          )}

          {/* Kaydır ipucu (yalnızca ilk kart) */}
          {i === 0 && exercises.length > 1 && (
            <div className="mt-auto flex items-center justify-center gap-1 pt-4 text-white/40">
              <ChevronDown className="h-4 w-4 animate-bounce" />
              <span className="text-[11px] font-medium">sonraki egzersiz için kaydır</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
