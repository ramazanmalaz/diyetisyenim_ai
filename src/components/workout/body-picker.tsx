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
type BodySex  = "male" | "female";

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
  chest:         "Göğüs",
  waist:         "Karın / Core",
  shoulders:     "Omuzlar",
  "upper arms":  "Kollar",
  "upper legs":  "Bacaklar",
  "lower legs":  "Alt Bacak",
  back:          "Sırt",
  neck:          "Boyun",
};

// ─── Görseller (public/images/) ───────────────────────────────────────────────

const BODY_IMAGES: Record<BodySex, Record<BodyView, string>> = {
  male:   { front: "/images/body-male-front.jpg",   back: "/images/body-male-back.jpg"   },
  female: { front: "/images/body-female-front.jpg", back: "/images/body-female-back.jpg" },
};

// ─── SVG tıklama bölgeleri  (viewBox = 0 0 945 2048, görsel koordinatları) ──

type Region = { id: BodyPart; d: string };

// Ön görünüm — 945×2048 koordinat uzayı
const FRONT_REGIONS: Region[] = [
  // Boyun
  { id: "neck",        d: "M365 322 L492 322 L490 392 L362 392 Z" },
  // Göğüs (her iki pektoral)
  { id: "chest",       d: "M258 390 C296 368 360 355 432 358 C506 361 560 376 602 396 L596 622 C556 638 500 644 432 641 C364 638 298 628 254 612 Z" },
  // Karın / Core
  { id: "waist",       d: "M256 614 C300 630 364 639 432 637 C500 635 556 626 596 614 L576 842 C544 854 498 858 432 856 C366 854 304 846 266 834 Z" },
  // Sol omuz (ekranda SAĞ)
  { id: "shoulders",   d: "M534 344 L668 344 L666 500 L530 500 Z" },
  // Sağ omuz (ekranda SOL)
  { id: "shoulders",   d: "M174 348 L278 348 L276 488 L172 488 Z" },
  // Sol üst kol — ekranda SAĞ
  { id: "upper arms",  d: "M530 500 L648 500 L646 778 L528 778 Z" },
  // Sağ üst kol — ekranda SOL
  { id: "upper arms",  d: "M160 488 L270 488 L268 772 L158 772 Z" },
  // Sol üst bacak — ekranda SOL
  { id: "upper legs",  d: "M246 840 L418 840 L416 1290 L244 1290 Z" },
  // Sağ üst bacak — ekranda SAĞ
  { id: "upper legs",  d: "M418 840 L564 840 L562 1290 L418 1290 Z" },
  // Sol alt bacak — ekranda SOL
  { id: "lower legs",  d: "M248 1294 L410 1294 L406 1730 L246 1730 Z" },
  // Sağ alt bacak — ekranda SAĞ
  { id: "lower legs",  d: "M410 1294 L554 1294 L550 1730 L410 1730 Z" },
];

// Arka görünüm
const BACK_REGIONS: Region[] = [
  // Sırt (trapez + lat + rhomboid + lomber)
  { id: "back",        d: "M232 362 L598 362 L590 842 L238 842 Z" },
  // Sol omuz arka (ekranda SAĞ)
  { id: "shoulders",   d: "M542 348 L668 348 L664 500 L538 500 Z" },
  // Sağ omuz arka (ekranda SOL)
  { id: "shoulders",   d: "M178 348 L280 348 L278 494 L176 494 Z" },
  // Sol üst kol (tricep) — ekranda SAĞ
  { id: "upper arms",  d: "M538 500 L646 500 L642 782 L536 782 Z" },
  // Sağ üst kol (tricep) — ekranda SOL
  { id: "upper arms",  d: "M174 494 L272 494 L270 778 L172 778 Z" },
  // Kalça + arka üst bacak (glute + hamstring)
  { id: "upper legs",  d: "M236 846 L592 846 L586 1292 L240 1292 Z" },
  // Sol alt bacak (baldır) — ekranda SOL
  { id: "lower legs",  d: "M244 1296 L402 1296 L398 1728 L242 1728 Z" },
  // Sağ alt bacak (baldır) — ekranda SAĞ
  { id: "lower legs",  d: "M402 1296 L548 1296 L544 1728 L402 1728 Z" },
];

// ─── Beden Haritası — görsel + SVG overlay ───────────────────────────────────

function BodyMap({
  sex,
  view,
  selected,
  onSelect,
}: {
  sex: BodySex;
  view: BodyView;
  selected: BodyPart | null;
  onSelect: (bp: BodyPart) => void;
}) {
  const regions = view === "front" ? FRONT_REGIONS : BACK_REGIONS;
  const imgSrc  = BODY_IMAGES[sex][view];

  return (
    <div
      className="relative h-full select-none"
      style={{ aspectRatio: "945 / 2048" }}
    >
      {/* Gerçek anatomik görsel */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt="Vücut haritası"
        className="absolute inset-0 h-full w-full"
        style={{ objectFit: "fill" }}
        draggable={false}
      />

      {/* SVG tıklama bölgeleri — aynı koordinat uzayı */}
      <svg
        viewBox="0 0 945 2048"
        className="absolute inset-0 h-full w-full"
        style={{ touchAction: "manipulation" }}
      >
        {regions.map((r, i) => (
          <path
            key={i}
            d={r.d}
            onClick={() => onSelect(r.id)}
            className={cn(
              "cursor-pointer transition-[fill,stroke] duration-200",
              selected === r.id
                ? "fill-red-500/38 stroke-red-600 stroke-[4]"
                : "fill-transparent stroke-transparent hover:fill-red-400/18",
            )}
          />
        ))}
      </svg>
    </div>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export function BodyPicker({ onClose }: { onClose: () => void }) {
  const [sex,      setSex]      = useState<BodySex>("male");
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
                className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200"
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
              className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ── Beden haritası ── */}
          {!feedOpen && (
            <>
              {/* Kontroller */}
              <div className="flex shrink-0 items-center justify-between px-4 pb-2 gap-2">
                {/* Cinsiyet seçimi */}
                <div className="flex flex-1 rounded-xl border border-zinc-200 overflow-hidden text-xs font-semibold">
                  {(["male", "female"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setSex(s); setSelected(null); }}
                      className={cn(
                        "flex-1 py-1.5 transition-colors duration-150",
                        sex === s
                          ? "bg-zinc-900 text-white"
                          : "bg-white text-zinc-500 hover:bg-zinc-50",
                      )}
                    >
                      {s === "male" ? "♂ Erkek" : "♀ Kadın"}
                    </button>
                  ))}
                </div>

                {/* Ön / Arka flip */}
                <button
                  type="button"
                  onClick={toggleView}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 whitespace-nowrap"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {view === "front" ? "Ön görünüm" : "Arka görünüm"}
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

              {/* Görsel + SVG overlay */}
              <div className="flex-1 min-h-0 flex items-center justify-center py-1 px-2">
                <BodyMap
                  sex={sex}
                  view={view}
                  selected={selected}
                  onSelect={handleSelect}
                />
              </div>

              {/* Seçili bölge etiketi */}
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
