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
 * Ön görünüm: anatomy_realistic_bw.svg (864 × 1821)
 * Hotspot konumları bu koordinat uzayında tanımlandı.
 */
const FRONT_REGIONS: Region[] = [
  // Boyun
  { id: "neck",
    d: "M356 212 L510 212 L507 272 L354 272 Z" },
  // Göğüs (her iki pektoral)
  { id: "chest",
    d: "M242 265 C295 248 364 240 432 242 C500 244 570 253 620 272 L618 636 C565 650 498 656 432 654 C366 652 296 642 240 624 Z" },
  // Karın / Core
  { id: "waist",
    d: "M240 628 C298 644 366 652 432 650 C498 652 565 644 618 630 L614 852 C566 864 498 870 432 868 C366 866 296 856 246 842 Z" },
  // Sol omuz (ekranda sol)
  { id: "shoulders",
    d: "M152 258 L282 258 L280 452 L150 452 Z" },
  // Sağ omuz (ekranda sağ)
  { id: "shoulders",
    d: "M582 258 L714 258 L714 452 L580 452 Z" },
  // Sol üst kol (bicep)
  { id: "upper arms",
    d: "M85 452 L216 452 L214 832 L83 832 Z" },
  // Sağ üst kol (bicep)
  { id: "upper arms",
    d: "M648 452 L786 452 L788 832 L646 832 Z" },
  // Sol üst bacak (quadricep)
  { id: "upper legs",
    d: "M205 875 L432 875 L428 1445 L202 1445 Z" },
  // Sağ üst bacak (quadricep)
  { id: "upper legs",
    d: "M432 875 L660 875 L656 1445 L432 1445 Z" },
  // Sol alt bacak
  { id: "lower legs",
    d: "M205 1452 L422 1452 L420 1818 L202 1818 Z" },
  // Sağ alt bacak
  { id: "lower legs",
    d: "M422 1452 L656 1452 L653 1818 L420 1818 Z" },
];

/**
 * Arka görünüm: body-{sex}-back.jpg (945 × 2048)
 */
const BACK_REGIONS: Region[] = [
  // Sırt (trapez + lat + lomber)
  { id: "back",
    d: "M232 362 L598 362 L590 842 L238 842 Z" },
  // Sol omuz arka
  { id: "shoulders",
    d: "M542 348 L668 348 L664 500 L538 500 Z" },
  // Sağ omuz arka
  { id: "shoulders",
    d: "M178 348 L280 348 L278 494 L176 494 Z" },
  // Sol üst kol (tricep)
  { id: "upper arms",
    d: "M538 500 L646 500 L642 782 L536 782 Z" },
  // Sağ üst kol (tricep)
  { id: "upper arms",
    d: "M174 494 L272 494 L270 778 L172 778 Z" },
  // Kalça + arka üst bacak (glute + hamstring)
  { id: "upper legs",
    d: "M236 846 L592 846 L586 1292 L240 1292 Z" },
  // Sol alt bacak (baldır)
  { id: "lower legs",
    d: "M244 1296 L402 1296 L398 1728 L242 1728 Z" },
  // Sağ alt bacak (baldır)
  { id: "lower legs",
    d: "M402 1296 L548 1296 L544 1728 L402 1728 Z" },
];

// ─── Beden Haritası ───────────────────────────────────────────────────────────

type ViewConfig = {
  imgSrc: string;
  aspectW: number;
  aspectH: number;
  regions: Region[];
};

function getViewConfig(view: BodyView, sex: BodySex): ViewConfig {
  if (view === "front") {
    return {
      imgSrc:  "/images/anatomy-front.svg",
      aspectW: 864,
      aspectH: 1821,
      regions: FRONT_REGIONS,
    };
  }
  return {
    imgSrc:  `/images/body-${sex}-back.jpg`,
    aspectW: 945,
    aspectH: 2048,
    regions: BACK_REGIONS,
  };
}

function BodyMap({
  view,
  sex,
  selected,
  onSelect,
}: {
  view: BodyView;
  sex: BodySex;
  selected: BodyPart | null;
  onSelect: (bp: BodyPart) => void;
}) {
  const cfg = getViewConfig(view, sex);

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
              <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2">
                {/* Cinsiyet (yalnızca arka görünüm için gerekli) */}
                <div className="flex flex-1 overflow-hidden rounded-xl border border-zinc-200 text-xs font-semibold">
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
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {view === "front" ? "Ön" : "Arka"}
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
                  sex={sex}
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
