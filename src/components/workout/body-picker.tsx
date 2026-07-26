"use client";

import { ArrowLeft, RotateCcw, X } from "lucide-react";
import { useState, useTransition } from "react";

import {
  getExercisesByMuscleGroup,
  type ExerciseCard,
} from "@/app/(app)/spor/actions";
import { MuscleExerciseFeed } from "@/components/workout/muscle-exercise-feed";
import {
  BACK_BODY_PATH,
  BACK_REGIONS,
  BACK_VIEW_BOX,
  FRONT_BODY_PATH,
  FRONT_REGIONS,
  FRONT_VIEW_BOX,
} from "@/components/workout/muscle-map-data";
import { cn } from "@/lib/utils";

// ─── Kas grupları ─────────────────────────────────────────────────────────────

export type MuscleSlug =
  | "shoulders"
  | "chest"
  | "back"
  | "trapezius"
  | "biceps"
  | "triceps"
  | "abdominals"
  | "obliques"
  | "forearms"
  | "glutes"
  | "quadriceps"
  | "hamstrings"
  | "calves"
  | "adductors";

const LABELS: Record<MuscleSlug, string> = {
  shoulders: "Omuz",
  chest: "Göğüs",
  back: "Sırt",
  trapezius: "Trapez",
  biceps: "Pazı",
  triceps: "Arka Kol",
  abdominals: "Karın",
  obliques: "Yan Karın",
  forearms: "Ön Kol",
  glutes: "Kalça",
  quadriceps: "Ön Uyluk",
  hamstrings: "Arka Uyluk",
  calves: "Baldır",
  adductors: "İç Uyluk",
};

// ─── Bölge tanımları — anatomik SVG'den (kas-haritasi-svg-hizalama-v4)
// hizalanmış tıklanabilir kas grubu path'leri. Her bölge gerçek kas şeklini
// takip eder (elips yaklaşıklaması değil).

// Kaynak SVG'de bu üç grup, çizim üzerine tam oturması için kendi merkezi
// etrafında hafifçe küçültülmüştü (orijinal <style> bloğundaki kural). Bu
// ölçek atlanınca özellikle "obliques" (ince şerit) belirgin kaymış görünüyordu.
const REGION_SCALE: Partial<Record<MuscleSlug, string>> = {
  abdominals: "scale(0.955)",
  trapezius: "scale(0.965)",
  obliques: "scale(0.90, 0.965)",
};

type BodyView = "front" | "back";

function getRegions(view: BodyView) {
  return view === "front" ? FRONT_REGIONS : BACK_REGIONS;
}

function getViewBox(view: BodyView): string {
  return view === "front" ? FRONT_VIEW_BOX : BACK_VIEW_BOX;
}

function getBodyPath(view: BodyView): string {
  return view === "front" ? FRONT_BODY_PATH : BACK_BODY_PATH;
}

function getAspectRatio(view: BodyView): string {
  const [, , width, height] = getViewBox(view).split(" ");
  return `${width} / ${height}`;
}

function BodyMap({
  view,
  selected,
  onSelect,
}: {
  view: BodyView;
  selected: MuscleSlug | null;
  onSelect: (id: MuscleSlug) => void;
}) {
  // Hover, tek bir path elemanı yerine slug bazlı tutulur — aynı kas grubunun
  // simetrik (sol/sağ) bölgeleri birlikte vurgulanır (CSS :hover tek elemana özeldir).
  const [hovered, setHovered] = useState<MuscleSlug | null>(null);

  return (
    <div
      className="relative mx-auto h-full select-none"
      style={{ aspectRatio: getAspectRatio(view) }}
    >
      <svg
        viewBox={getViewBox(view)}
        className="absolute inset-0 h-full w-full"
        style={{ touchAction: "manipulation" }}
      >
        <path d={getBodyPath(view)} fill="#12161b" fillRule="evenodd" />
        {getRegions(view).map((r, i) => (
          <path
            key={i}
            d={r.d}
            onClick={() => onSelect(r.slug)}
            onMouseEnter={() => setHovered(r.slug)}
            onMouseLeave={() =>
              setHovered((h) => (h === r.slug ? null : h))
            }
            style={
              REGION_SCALE[r.slug]
                ? {
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    transform: REGION_SCALE[r.slug],
                  }
                : undefined
            }
            className={cn(
              "cursor-pointer transition-[fill,opacity] duration-200",
              selected === r.slug
                ? "fill-red-500/70 stroke-red-600 stroke-2"
                : hovered === r.slug
                  ? "fill-red-400/35 stroke-transparent"
                  : "fill-red-400/0 stroke-transparent",
            )}
          />
        ))}
      </svg>
    </div>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export function BodyPicker({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<BodyView>("front");
  const [selected, setSelected] = useState<MuscleSlug | null>(null);
  const [exercises, setExercises] = useState<ExerciseCard[]>([]);
  const [feedOpen, setFeedOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSelect(id: MuscleSlug) {
    setSelected(id);
    setFeedOpen(false);
    startTransition(async () => {
      const data = await getExercisesByMuscleGroup(id);
      setExercises(data);
      setFeedOpen(true);
    });
  }

  function toggleView() {
    setView((v) => (v === "front" ? "back" : "front"));
    setSelected(null);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-[71] flex justify-center">
        <div
          className="w-full max-w-[440px] overflow-hidden rounded-t-[28px] bg-white shadow-2xl flex flex-col"
          style={{ height: "min(88svh, 700px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="mx-auto mt-3 mb-1 h-1 w-10 shrink-0 rounded-full bg-zinc-200" />

          {/* Header */}
          <div className="flex shrink-0 items-center justify-between px-4 pt-1 pb-2">
            {feedOpen ? (
              <button
                type="button"
                onClick={() => setFeedOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <div className="w-9" />
            )}
            <h2 className="text-sm font-bold text-zinc-800 tracking-tight">
              {feedOpen && selected ? LABELS[selected] : "Bölgeye Göre Egzersiz"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ── Beden haritası ── */}
          {!feedOpen && (
            <>
              <div className="flex shrink-0 items-center justify-end px-4 pb-2">
                <button
                  type="button"
                  onClick={toggleView}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {view === "front" ? "Arkaya Dön" : "Öne Dön"}
                </button>
              </div>

              <div className="flex shrink-0 h-5 items-center justify-center">
                {pending ? (
                  <span className="text-[11px] text-red-500 animate-pulse">
                    Egzersizler yükleniyor…
                  </span>
                ) : (
                  <p className="text-[11px] text-zinc-400">
                    Çalıştırmak istediğin bölgeye dokun
                  </p>
                )}
              </div>

              <div className="flex-1 min-h-0 flex items-center justify-center py-1 px-2">
                <BodyMap view={view} selected={selected} onSelect={handleSelect} />
              </div>

              {selected && !pending ? (
                <div className="shrink-0 px-4 pb-5 pt-1">
                  <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-2.5 text-center">
                    <p className="text-sm font-semibold text-red-600">
                      {LABELS[selected]} seçildi
                    </p>
                  </div>
                </div>
              ) : (
                <div className="shrink-0 h-4" />
              )}
            </>
          )}

          {/* ── Egzersiz feed ── */}
          {feedOpen && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <MuscleExerciseFeed exercises={exercises} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
