"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

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
    <div className="flex-1 min-h-0 snap-y snap-proximity overflow-y-scroll bg-zinc-950">
      {exercises.map((ex, i) => (
        <ExerciseSlide
          key={ex.id}
          ex={ex}
          index={i}
          total={exercises.length}
        />
      ))}
    </div>
  );
}

/** Tek egzersiz kartı — görsel tam görünür, adımlar kendi içinde kayar. */
function ExerciseSlide({
  ex,
  index: i,
  total,
}: {
  ex: ExerciseCard;
  index: number;
  total: number;
}) {
  const steps = ex.trSteps ?? [];
  const uzun = steps.length > 4;
  const [acik, setAcik] = useState(false);

  return (
        <div className="relative flex h-full w-full shrink-0 snap-start flex-col overflow-y-auto overscroll-contain px-5 pt-4 pb-8">
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
              {i + 1} / {total}
            </span>
          </div>

          {/* Hareket görseli — kutulu/küçük (tam ekran gerilip pikselleşmesin) */}
          <div className="mt-3 grid min-h-[34vh] shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white p-2">
            {ex.gifUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ex.gifUrl}
                alt={ex.name}
                className="max-h-[38vh] w-full object-contain"
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
          {(steps.length > 0 || ex.trInstructions) && (
            <div className="mt-3 space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] font-bold tracking-[0.14em] text-lime-300 uppercase">
                Nasıl yapılır
              </p>
              {/* Uzun listeler kart yüksekliğini taşırmasın: blok kendi içinde
                  kayar (overscroll-contain, snap'e karışmaz), istenirse açılır. */}
              <div
                className={
                  acik
                    ? "space-y-1.5"
                    : "max-h-[30vh] space-y-1.5 overflow-y-auto overscroll-contain pr-1"
                }
              >
                {steps.length > 0 ? (
                  <ol className="space-y-1.5 text-sm text-zinc-300">
                    {steps.map((step, si) => (
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
              {uzun && (
                <button
                  type="button"
                  onClick={() => setAcik((v) => !v)}
                  className="mt-1 text-[12px] font-semibold text-lime-300 underline-offset-2 hover:underline"
                >
                  {acik ? "Daha az göster" : "Daha fazla göster"}
                </button>
              )}
            </div>
          )}

          {/* Kaydır ipucu (yalnızca ilk kart) */}
          {i === 0 && total > 1 && (
            <div className="mt-auto flex items-center justify-center gap-1 pt-4 text-white/40">
              <ChevronDown className="h-4 w-4 animate-bounce" />
              <span className="text-[11px] font-medium">sonraki egzersiz için kaydır</span>
            </div>
          )}
        </div>
  );
}
