"use client";

import { ChevronDown, X } from "lucide-react";
import { useState } from "react";

import type { ExerciseCard } from "@/app/(app)/spor/actions";

export function MuscleExerciseFeed({
  exercises,
}: {
  exercises: ExerciseCard[];
}) {
  const [detailIdx, setDetailIdx] = useState<number | null>(null);

  if (exercises.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-zinc-500">Bu bölge için egzersiz bulunamadı.</p>
      </div>
    );
  }

  const detail = detailIdx !== null ? exercises[detailIdx] : null;

  return (
    <>
      {/* Dikey kaydırma feed (scroll-snap) — h-full: parent flex-1 container'ı doldurur */}
      <div className="flex-1 min-h-0 overflow-y-scroll snap-y snap-mandatory">
        {exercises.map((ex, i) => (
          <div
            key={ex.id}
            className="relative flex h-full w-full shrink-0 snap-start snap-always flex-col overflow-hidden"
          >
            {/* GIF arka plan */}
            {ex.gifUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ex.gifUrl}
                alt={ex.name}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 bg-zinc-900" />
            )}

            {/* Üstten koyu gradient (header alanı için) */}
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />
            {/* Alttan güçlü gradient (metin alanı için) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

            {/* Alt içerik */}
            <div className="absolute inset-x-0 bottom-0 p-5 pb-8">
              {/* Kas grubu etiketi */}
              {ex.muscleGroup && (
                <span className="mb-3 inline-flex items-center rounded-full bg-lime-400/20 px-3 py-1 text-xs font-semibold text-lime-300 ring-1 ring-lime-400/30">
                  {ex.muscleGroup}
                </span>
              )}

              {/* Egzersiz adı */}
              <h3 className="font-display text-[2rem] font-extrabold leading-tight tracking-[-0.02em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {ex.name}
              </h3>

              {/* Detay butonu */}
              <button
                type="button"
                onClick={() => setDetailIdx(i)}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-lime-400 px-6 py-3 text-sm font-bold text-black shadow-[0_8px_24px_-8px_rgba(163,230,53,0.8)] transition-[transform,filter] duration-200 active:scale-95 hover:brightness-110"
              >
                Detayları Gör
              </button>
            </div>

            {/* Kaydır ipucu (yalnızca ilk kart) */}
            {i === 0 && exercises.length > 1 && (
              <div className="absolute bottom-8 right-5 flex flex-col items-center gap-0.5 text-white/40">
                <ChevronDown className="h-5 w-5 animate-bounce" />
                <span className="text-[10px] font-medium">kaydır</span>
              </div>
            )}

            {/* Sayfa numarası */}
            <span className="absolute top-4 right-4 rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-semibold text-white/60">
              {i + 1} / {exercises.length}
            </span>
          </div>
        ))}
      </div>

      {/* Egzersiz detay sheet */}
      {detail && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-md"
          onClick={() => setDetailIdx(null)}
        >
          <div
            className="w-full max-w-md overflow-y-auto rounded-t-[28px] border border-white/10 bg-zinc-950/98 p-5"
            style={{ maxHeight: "82svh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-xl font-extrabold tracking-tight text-white">
                {detail.name}
              </h3>
              <button
                type="button"
                onClick={() => setDetailIdx(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-zinc-400 hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* GIF önizleme */}
            {detail.gifUrl && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={detail.gifUrl}
                  alt={detail.name}
                  className="mx-auto max-h-60 w-auto"
                />
              </div>
            )}

            {/* Kas grubu */}
            {detail.muscleGroup && (
              <p className="mt-3 text-xs text-zinc-500">
                Çalışan kas:{" "}
                <span className="font-semibold text-zinc-300">
                  {detail.muscleGroup}
                </span>
              </p>
            )}

            {/* Türkçe talimatlar */}
            {(detail.trSteps ?? detail.trInstructions) && (
              <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-bold tracking-[0.14em] text-lime-300 uppercase">
                  Nasıl yapılır
                </p>
                {detail.trSteps && detail.trSteps.length > 0 ? (
                  <ol className="space-y-2.5 text-sm text-zinc-300">
                    {detail.trSteps.map((step, si) => (
                      <li key={si} className="flex gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime-400/10 text-[10px] font-bold text-lime-400 ring-1 ring-lime-400/20">
                          {si + 1}
                        </span>
                        <span className="leading-snug">{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm leading-relaxed text-zinc-300">
                    {detail.trInstructions}
                  </p>
                )}
              </div>
            )}

            <div className="h-6" />
          </div>
        </div>
      )}
    </>
  );
}
