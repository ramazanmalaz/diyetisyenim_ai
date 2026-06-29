"use client";

import { ArrowLeft, RotateCcw, X } from "lucide-react";
import { useState, useTransition } from "react";

import {
  getExercisesByBodyPart,
  type ExerciseCard,
} from "@/app/(app)/spor/actions";
import { MuscleExerciseFeed } from "@/components/workout/muscle-exercise-feed";
import { cn } from "@/lib/utils";

// ─── Tipler ──────────────────────────────────────────────────────────────────

type BodyView = "front" | "back";

type BodyPart =
  | "chest"
  | "waist"
  | "shoulders"
  | "upper arms"
  | "upper legs"
  | "lower legs"
  | "back"
  | "neck";

const LABELS: Record<BodyPart, string> = {
  chest:        "Göğüs",
  waist:        "Karın / Core",
  shoulders:    "Omuzlar",
  "upper arms": "Kollar",
  "upper legs": "Bacaklar",
  "lower legs": "Alt Bacak",
  back:         "Sırt",
  neck:         "Boyun",
};

// ─── Görünüm konfigürasyonu ───────────────────────────────────────────────────

type Region = { id: BodyPart; d: string };

/**
 * Ön görünüm: anatomy-front.svg (864 × 1821)
 * Koordinatlar görselden ölçüldü — 3/4 sağ bakış açısı.
 */
const FRONT_REGIONS: Region[] = [
  // Boyun
  { id: "neck",
    d: "M324 278 L452 278 L450 385 L322 385 Z" },
  // Göğüs (her iki pektoral)
  { id: "chest",
    d: "M236 368 C278 350 356 340 432 342 C508 344 562 356 612 376 L608 660 C558 674 500 680 432 678 C364 676 280 666 232 650 Z" },
  // Karın / Core
  { id: "waist",
    d: "M234 654 C280 668 364 678 432 676 C500 678 556 668 608 654 L558 898 C530 910 488 915 432 913 C376 911 318 904 262 890 Z" },
  // Sol omuz — ekranda SOL
  { id: "shoulders",
    d: "M178 335 L304 335 L304 504 L176 504 Z" },
  // Sağ omuz — ekranda SAĞ
  { id: "shoulders",
    d: "M506 342 L658 342 L658 476 L504 476 Z" },
  // Sol üst kol (bicep) — ekranda SOL
  { id: "upper arms",
    d: "M110 504 L256 504 L254 845 L108 845 Z" },
  // Sağ üst kol — ekranda SAĞ
  { id: "upper arms",
    d: "M556 476 L694 476 L697 832 L553 832 Z" },
  // Sol üst bacak (quadricep)
  { id: "upper legs",
    d: "M222 960 L424 960 L422 1380 L220 1380 Z" },
  // Sağ üst bacak (quadricep)
  { id: "upper legs",
    d: "M382 960 L610 960 L607 1380 L379 1380 Z" },
  // Sol alt bacak
  { id: "lower legs",
    d: "M204 1388 L392 1388 L389 1734 L201 1734 Z" },
  // Sağ alt bacak
  { id: "lower legs",
    d: "M370 1388 L582 1388 L579 1734 L367 1734 Z" },
];

/**
 * Arka görünüm: anatomy-back.svg (619 × 1468)
 * Koordinatlar görselden ölçüldü — düz arka bakış açısı.
 */
const BACK_REGIONS: Region[] = [
  // Boyun (arka, trapez üst)
  { id: "neck",
    d: "M266 164 L352 164 L350 274 L264 274 Z" },
  // Sol omuz (deltoid arka) — ekranda SOL
  { id: "shoulders",
    d: "M90 224 L222 224 L220 352 L88 352 Z" },
  // Sağ omuz (deltoid arka) — ekranda SAĞ
  { id: "shoulders",
    d: "M396 224 L528 224 L526 352 L394 352 Z" },
  // Sırt (trapez + lat + lomber)
  { id: "back",
    d: "M148 272 L470 272 L467 760 L146 760 Z" },
  // Sol üst kol (tricep) — ekranda SOL
  { id: "upper arms",
    d: "M60 352 L148 352 L146 676 L58 676 Z" },
  // Sağ üst kol (tricep) — ekranda SAĞ
  { id: "upper arms",
    d: "M470 352 L558 352 L558 676 L468 676 Z" },
  // Sol üst bacak (glute + hamstring)
  { id: "upper legs",
    d: "M146 760 L312 760 L310 1196 L144 1196 Z" },
  // Sağ üst bacak (glute + hamstring)
  { id: "upper legs",
    d: "M306 760 L468 760 L466 1196 L304 1196 Z" },
  // Sol alt bacak (baldır) — ekranda SOL
  { id: "lower legs",
    d: "M146 1200 L304 1200 L300 1412 L142 1412 Z" },
  // Sağ alt bacak (baldır) — ekranda SAĞ
  { id: "lower legs",
    d: "M298 1200 L448 1200 L444 1412 L296 1412 Z" },
];

// ─── Beden Haritası ───────────────────────────────────────────────────────────

type ViewConfig = {
  imgSrc: string;
  aspectW: number;
  aspectH: number;
  regions: Region[];
};

function getViewConfig(view: BodyView): ViewConfig {
  if (view === "front") {
    return {
      imgSrc:  "/images/anatomy-front.svg",
      aspectW: 864,
      aspectH: 1821,
      regions: FRONT_REGIONS,
    };
  }
  return {
    imgSrc:  "/images/anatomy-back.svg",
    aspectW: 619,
    aspectH: 1468,
    regions: BACK_REGIONS,
  };
}

function BodyMap({
  view,
  selected,
  onSelect,
}: {
  view: BodyView;
  selected: BodyPart | null;
  onSelect: (bp: BodyPart) => void;
}) {
  const cfg = getViewConfig(view);

  return (
    <div
      className="relative h-full select-none"
      style={{ aspectRatio: `${cfg.aspectW} / ${cfg.aspectH}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cfg.imgSrc}
        alt="Vücut haritası"
        className="absolute inset-0 h-full w-full"
        style={{ objectFit: "fill" }}
        draggable={false}
      />

      {/* Tıklanabilir overlay — görsel koordinat uzayında */}
      <svg
        viewBox={`0 0 ${cfg.aspectW} ${cfg.aspectH}`}
        className="absolute inset-0 h-full w-full"
        style={{ touchAction: "manipulation" }}
      >
        {cfg.regions.map((r, i) => (
          <path
            key={i}
            d={r.d}
            onClick={() => onSelect(r.id)}
            className={cn(
              "cursor-pointer transition-[fill,stroke] duration-200",
              selected === r.id
                ? "fill-red-500/40 stroke-red-600 stroke-[6]"
                : "fill-transparent stroke-transparent hover:fill-red-400/20 hover:stroke-red-400/50 hover:stroke-[4]",
            )}
          />
        ))}
      </svg>
    </div>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export function BodyPicker({ onClose }: { onClose: () => void }) {
  const [view,     setView]     = useState<BodyView>("front");
  const [selected, setSelected] = useState<BodyPart | null>(null);
  const [exercises, setExercises] = useState<ExerciseCard[]>([]);
  const [feedOpen,  setFeedOpen]  = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSelect(bp: BodyPart) {
    setSelected(bp);
    setFeedOpen(false);
    startTransition(async () => {
      const data = await getExercisesByBodyPart(bp);
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
              {/* Kontroller */}
              <div className="flex shrink-0 items-center justify-end px-4 pb-2">
                <button
                  type="button"
                  onClick={toggleView}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {view === "front" ? "Öne Dön" : "Arkaya Dön"}
                </button>
              </div>

              {/* İpucu / yükleniyor */}
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

              {/* Görsel + overlay */}
              <div className="flex-1 min-h-0 flex items-center justify-center py-1 px-2">
                <BodyMap
                  view={view}
                  selected={selected}
                  onSelect={handleSelect}
                />
              </div>

              {/* Seçili bölge */}
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
