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
 * Koordinatlar Playwright ile kalibrasyon.html üzerinden ölçüldü.
 */
const FRONT_REGIONS: Region[] = [
  // Boyun — x:319-481, y:234-364
  { id: "neck",
    d: "M319 234 L481 234 L481 364 L319 364 Z" },
  // Göğüs — x:205-654, y:345-654
  { id: "chest",
    d: "M205 345 L654 345 L654 654 L205 654 Z" },
  // Karın / Core — x:224-602, y:654-891
  { id: "waist",
    d: "M224 654 L602 654 L602 891 L224 891 Z" },
  // Sol omuz — x:127-276, y:309-491
  { id: "shoulders",
    d: "M127 309 L276 309 L276 491 L127 491 Z" },
  // Sağ omuz — x:501-689, y:309-491
  { id: "shoulders",
    d: "M501 309 L689 309 L689 491 L501 491 Z" },
  // Sol üst kol (bicep) — x:42-215, y:491-855
  { id: "upper arms",
    d: "M42 491 L215 491 L215 855 L42 855 Z" },
  // Sağ üst kol — x:569-741, y:491-836
  { id: "upper arms",
    d: "M569 491 L741 491 L741 836 L569 836 Z" },
  // Sol üst bacak — x:189-429, y:911-1366
  { id: "upper legs",
    d: "M189 911 L429 911 L429 1366 L189 1366 Z" },
  // Sağ üst bacak — x:387-621, y:911-1366
  { id: "upper legs",
    d: "M387 911 L621 911 L621 1366 L387 1366 Z" },
  // Sol alt bacak — x:189-397, y:1382-1710
  { id: "lower legs",
    d: "M189 1382 L397 1382 L397 1710 L189 1710 Z" },
  // Sağ alt bacak — x:377-585, y:1382-1710
  { id: "lower legs",
    d: "M377 1382 L585 1382 L585 1710 L377 1710 Z" },
];

/**
 * Arka görünüm: anatomy-back.svg (619 × 1468)
 * Koordinatlar Playwright ile kalibrasyon.html üzerinden ölçüldü.
 */
const BACK_REGIONS: Region[] = [
  // Boyun — x:247-370, y:176-278
  { id: "neck",
    d: "M247 176 L370 176 L370 278 L247 278 Z" },
  // Sol omuz — x:85-221, y:233-367
  { id: "shoulders",
    d: "M85 233 L221 233 L221 367 L85 367 Z" },
  // Sağ omuz — x:384-530, y:233-367
  { id: "shoulders",
    d: "M384 233 L530 233 L530 367 L384 367 Z" },
  // Sırt (trapez + lat + lomber) — x:148-470, y:278-763
  { id: "back",
    d: "M148 278 L470 278 L470 763 L148 763 Z" },
  // Sol üst kol (tricep) — x:48-140, y:351-689
  { id: "upper arms",
    d: "M48 351 L140 351 L140 689 L48 689 Z" },
  // Sağ üst kol — x:462-567, y:351-689
  { id: "upper arms",
    d: "M462 351 L567 351 L567 689 L462 689 Z" },
  // Sol üst bacak (glute + hamstring) — x:135-308, y:763-1203
  { id: "upper legs",
    d: "M135 763 L308 763 L308 1203 L135 1203 Z" },
  // Sağ üst bacak — x:302-475, y:763-1203
  { id: "upper legs",
    d: "M302 763 L475 763 L475 1203 L302 1203 Z" },
  // Sol alt bacak (baldır) — x:135-297, y:1216-1423
  { id: "lower legs",
    d: "M135 1216 L297 1216 L297 1423 L135 1423 Z" },
  // Sağ alt bacak — x:297-462, y:1216-1423
  { id: "lower legs",
    d: "M297 1216 L462 1216 L462 1423 L297 1423 Z" },
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
