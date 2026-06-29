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

// ─── Renk sabitleri ──────────────────────────────────────────────────────────

const B = "#e4e4e7";   // body fill (zinc-200)
const S = "#a1a1aa";   // body stroke (zinc-400)
const D = "#d4d4d8";   // detail line (zinc-300)

// ─── Tıklanabilir bölge yolları ─ viewBox "0 0 200 490" ─────────────────────

type Region = { id: BodyPart; d: string };

const FRONT_REGIONS: Region[] = [
  // Boyun
  { id: "neck",
    d: "M93 56 Q100 60 107 56 L106 73 Q100 76 94 73 Z" },
  // Göğüs (her iki pek)
  { id: "chest",
    d: "M62 90 C72 80 88 74 100 74 C112 74 128 80 138 90 L138 160 C128 168 116 173 100 173 C84 173 72 168 62 160 Z" },
  // Karın / Core
  { id: "waist",
    d: "M62 162 C72 170 84 174 100 174 C116 174 128 170 138 162 L136 222 L64 222 Z" },
  // Sol omuz (ekranda sol — figürün sağ deltoid)
  { id: "shoulders",
    d: "M24 112 C20 122 18 134 22 142 L40 134 C38 128 38 120 40 114 Z" },
  // Sağ omuz (ekranda sağ)
  { id: "shoulders",
    d: "M176 112 C180 122 182 134 178 142 L160 134 C162 128 162 120 160 114 Z" },
  // Sol üst kol (bicep)
  { id: "upper arms",
    d: "M22 142 C16 154 12 168 14 182 L36 174 C34 164 34 152 36 140 Z" },
  // Sağ üst kol (bicep)
  { id: "upper arms",
    d: "M178 142 C184 154 188 168 186 182 L164 174 C166 164 166 152 164 140 Z" },
  // Sol üst bacak (quadricep)
  { id: "upper legs",
    d: "M56 228 C50 244 46 264 46 284 C46 304 50 322 56 336 L90 332 C88 318 86 300 86 284 C86 268 88 250 90 236 Z" },
  // Sağ üst bacak (quadricep)
  { id: "upper legs",
    d: "M110 236 C112 250 114 268 114 284 C114 300 112 318 110 332 L144 336 C150 322 154 304 154 284 C154 264 150 244 144 228 Z" },
  // Sol alt bacak
  { id: "lower legs",
    d: "M56 338 C50 354 48 372 48 392 C48 414 50 432 56 444 L88 440 C88 428 86 412 86 392 C86 372 88 356 90 342 Z" },
  // Sağ alt bacak
  { id: "lower legs",
    d: "M110 342 C112 356 114 372 114 392 C114 412 112 428 112 440 L144 444 C150 432 152 414 152 392 C152 372 150 354 144 338 Z" },
];

const BACK_REGIONS: Region[] = [
  // Sırt (trapez + lat + rhomboid + lomber)
  { id: "back",
    d: "M62 90 C72 80 88 74 100 74 C112 74 128 80 138 90 L138 222 L62 222 Z" },
  // Sol omuz arka
  { id: "shoulders",
    d: "M24 112 C20 122 18 134 22 142 L40 134 C38 128 38 120 40 114 Z" },
  // Sağ omuz arka
  { id: "shoulders",
    d: "M176 112 C180 122 182 134 178 142 L160 134 C162 128 162 120 160 114 Z" },
  // Sol üst kol (tricep)
  { id: "upper arms",
    d: "M22 142 C16 154 12 168 14 182 L36 174 C34 164 34 152 36 140 Z" },
  // Sağ üst kol (tricep)
  { id: "upper arms",
    d: "M178 142 C184 154 188 168 186 182 L164 174 C166 164 166 152 164 140 Z" },
  // Kalça + arka bacak (glute + hamstring)
  { id: "upper legs",
    d: "M52 228 C46 246 42 266 42 288 C42 308 46 326 54 340 L146 340 C154 326 158 308 158 288 C158 266 154 246 148 228 Z" },
  // Sol alt bacak (baldır)
  { id: "lower legs",
    d: "M54 342 C48 358 46 376 46 396 C46 418 50 436 56 448 L88 444 C88 432 86 414 86 396 C86 376 88 360 90 346 Z" },
  // Sağ alt bacak (baldır)
  { id: "lower legs",
    d: "M110 346 C112 360 114 376 114 396 C114 414 112 432 112 444 L144 448 C150 436 154 418 154 396 C154 376 152 358 146 342 Z" },
];

// ─── Anatomik SVG Siluet ─────────────────────────────────────────────────────

function BodySilhouette() {
  return (
    <g fill={B} stroke={S} strokeWidth="0.8" strokeLinejoin="round">
      {/* Baş */}
      <ellipse cx="100" cy="30" rx="22" ry="26" />

      {/* Boyun */}
      <path d="M92 54 Q100 58 108 54 L107 72 Q100 75 93 72 Z" />

      {/* Sol omuz kapısı (figür sağ — ekranda sol) */}
      <path d="M92 70 C76 72 56 76 42 86 C32 92 24 104 24 116 C24 126 28 132 34 134 L48 128 C46 122 46 116 48 110 C50 102 56 96 64 92 C74 86 84 82 94 76 Z" />

      {/* Sağ omuz kapısı */}
      <path d="M108 70 C116 82 126 86 136 92 C144 96 150 102 152 110 C154 116 154 122 152 128 L166 134 C172 132 176 126 176 116 C176 104 168 92 158 86 C144 76 124 72 108 70 Z" />

      {/* Gövde */}
      <path d="M64 90 C60 98 56 110 56 126 C56 146 56 164 58 180 C60 194 62 206 64 222 L136 222 C138 206 140 194 142 180 C144 164 144 146 144 126 C144 110 140 98 136 90 Z" />

      {/* Kalça / pelvis */}
      <path d="M64 222 C60 232 56 244 54 256 C52 266 54 272 58 276 L142 276 C146 272 148 266 146 256 C144 244 140 232 136 222 Z" />

      {/* Sol üst kol */}
      <path d="M24 116 C18 128 14 143 14 158 C14 172 16 184 20 192 L38 186 C36 176 34 164 34 154 C34 140 36 128 40 118 Z" />

      {/* Sağ üst kol */}
      <path d="M176 116 C182 128 186 143 186 158 C186 172 184 184 180 192 L162 186 C166 176 166 164 166 154 C166 140 164 128 160 118 Z" />

      {/* Sol önkol */}
      <path d="M20 194 C14 206 10 222 10 240 C10 258 12 272 16 280 L32 274 C30 264 28 250 28 238 C28 222 30 208 34 196 Z" />

      {/* Sağ önkol */}
      <path d="M180 194 C186 206 190 222 190 240 C190 258 188 272 184 280 L168 274 C170 264 172 250 172 238 C172 222 170 208 166 196 Z" />

      {/* Eller */}
      <ellipse cx="23" cy="288" rx="12" ry="8" />
      <ellipse cx="177" cy="288" rx="12" ry="8" />

      {/* Sol üst bacak */}
      <path d="M58 278 C52 292 48 312 48 332 C48 350 50 368 56 380 L90 376 C88 364 86 348 86 332 C86 312 88 294 90 282 Z" />

      {/* Sağ üst bacak */}
      <path d="M110 282 C112 294 114 312 114 332 C114 348 112 364 110 376 L144 380 C150 368 152 350 152 332 C152 312 148 292 142 278 Z" />

      {/* Dizler */}
      <ellipse cx="74" cy="380" rx="16" ry="10" />
      <ellipse cx="126" cy="380" rx="16" ry="10" />

      {/* Sol alt bacak */}
      <path d="M56 386 C50 400 48 418 48 438 C48 456 50 472 56 481 L88 477 C88 467 86 452 86 438 C86 418 88 402 90 390 Z" />

      {/* Sağ alt bacak */}
      <path d="M110 390 C112 402 114 418 114 438 C114 452 112 467 112 477 L144 481 C150 472 152 456 152 438 C152 418 150 400 144 386 Z" />

      {/* Ayaklar */}
      <path d="M56 481 C52 487 44 492 38 494 L90 494 L90 481 Z" />
      <path d="M110 481 L110 494 L162 494 C156 492 148 487 144 481 Z" />
    </g>
  );
}

// ─── Kas tanımlama çizgileri (dekoratif) ─────────────────────────────────────

function MuscleLines({ view }: { view: BodyView }) {
  const shared = (
    <>
      {/* Bicep/tricep tepe çizgisi */}
      <path d="M29 122 Q27 154 29 188" />
      <path d="M171 122 Q173 154 171 188" />
      {/* Diz üstü çizgisi */}
      <path d="M60 370 Q74 366 90 370" />
      <path d="M110 370 Q126 366 140 370" />
      {/* Baldır orta */}
      <path d="M74 390 Q72 428 74 474" />
      <path d="M126 390 Q128 428 126 474" />
    </>
  );

  if (view === "front") {
    return (
      <g fill="none" stroke={D} strokeWidth="0.6" strokeLinecap="round">
        {shared}
        {/* Sternum dikey */}
        <line x1="100" y1="88" x2="100" y2="156" />
        {/* Pektoral fiber çizgileri - sol */}
        <path d="M100 97  C89 94  76 98  66 108" />
        <path d="M100 110 C89 108 75 113 65 124" />
        <path d="M100 123 C89 121 75 127 65 138" />
        <path d="M100 137 C89 135 76 141 66 151" />
        {/* Pektoral - sağ (ayna) */}
        <path d="M100 97  C111 94  124 98  134 108" />
        <path d="M100 110 C111 108 125 113 135 124" />
        <path d="M100 123 C111 121 125 127 135 138" />
        <path d="M100 137 C111 135 124 141 134 151" />
        {/* Deltoid-pek birleşim */}
        <path d="M48 110 C53 122 60 132 64 142" />
        <path d="M152 110 C147 122 140 132 136 142" />
        {/* Karın orta */}
        <line x1="100" y1="158" x2="100" y2="222" />
        {/* Karın yatay bantlar */}
        <line x1="68" y1="172" x2="132" y2="172" />
        <line x1="66" y1="187" x2="134" y2="187" />
        <line x1="65" y1="202" x2="135" y2="202" />
        {/* Oblique çizgisi */}
        <path d="M64 170 C63 184 62 198 62 212" />
        <path d="M136 170 C137 184 138 198 138 212" />
        {/* Quad tanımı */}
        <path d="M72 286 Q70 330 72 372" />
        <path d="M128 286 Q130 330 128 372" />
        {/* Vastus medialis (iç quad şişliği) */}
        <path d="M65 340 Q68 358 72 372" />
        <path d="M135 340 Q132 358 128 372" />
      </g>
    );
  }

  return (
    <g fill="none" stroke={D} strokeWidth="0.6" strokeLinecap="round">
      {shared}
      {/* Omurga (noktalı) */}
      <line x1="100" y1="80" x2="100" y2="222" strokeDasharray="3 3" />
      {/* Trapez lifleri */}
      <path d="M100 82 C89 86 76 92 64 100" />
      <path d="M100 82 C111 86 124 92 136 100" />
      <path d="M100 95 C87 100 72 108 64 118" />
      <path d="M100 95 C113 100 128 108 136 118" />
      {/* Lat sınırı */}
      <path d="M64 100 C62 118 62 138 64 158" />
      <path d="M136 100 C138 118 138 138 136 158" />
      {/* Lomber */}
      <path d="M88 192 C92 202 94 214 94 222" />
      <path d="M112 192 C108 202 106 214 106 222" />
      {/* Gluteal çizgi */}
      <path d="M56 272 C78 266 100 265 122 266 C140 267 150 272 150 272" />
      {/* Gluteal orta */}
      <line x1="100" y1="270" x2="100" y2="336" />
      {/* Hamstring ayırım */}
      <path d="M68 290 Q66 330 68 372" />
      <path d="M132 290 Q134 330 132 372" />
    </g>
  );
}

// ─── Tıklanabilir bölgeler (şeffaf overlay) ──────────────────────────────────

function ClickableRegions({
  view,
  selected,
  onSelect,
}: {
  view: BodyView;
  selected: BodyPart | null;
  onSelect: (bp: BodyPart) => void;
}) {
  const regions = view === "front" ? FRONT_REGIONS : BACK_REGIONS;

  return (
    <>
      {regions.map((r, i) => (
        <path
          key={i}
          d={r.d}
          onClick={() => onSelect(r.id)}
          className={cn(
            "cursor-pointer transition-[fill,stroke] duration-200",
            selected === r.id
              ? "fill-red-500/40 stroke-red-600 stroke-[2]"
              : "fill-transparent stroke-transparent hover:fill-red-400/20 hover:stroke-red-400/40 hover:stroke-[1.5]",
          )}
        />
      ))}
    </>
  );
}

// ─── Ana SVG beden haritası ───────────────────────────────────────────────────

function BodyMap({
  view,
  selected,
  onSelect,
}: {
  view: BodyView;
  selected: BodyPart | null;
  onSelect: (bp: BodyPart) => void;
}) {
  return (
    <svg
      viewBox="0 0 200 500"
      className="h-full w-auto"
      style={{ maxWidth: "180px", touchAction: "manipulation" }}
    >
      <defs>
        <radialGradient id="bodyGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%"   stopColor="#f0f0f2" />
          <stop offset="100%" stopColor="#d8d8dc" />
        </radialGradient>
      </defs>

      {/* Siluet (arka plan gölgesi) */}
      <g filter="url(#shadow)" opacity="0.3" transform="translate(2,3)">
        <BodySilhouette />
      </g>

      {/* Ana siluet */}
      <BodySilhouette />

      {/* Kas çizgileri */}
      <MuscleLines view={view} />

      {/* Tıklanabilir bölgeler */}
      <ClickableRegions view={view} selected={selected} onSelect={onSelect} />
    </svg>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export function BodyPicker({ onClose }: { onClose: () => void }) {
  const [sex,       setSex]       = useState<BodySex>("male");
  const [view,      setView]      = useState<BodyView>("front");
  const [selected,  setSelected]  = useState<BodyPart | null>(null);
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

          {/* ── Beden haritası görünümü ── */}
          {!feedOpen && (
            <>
              {/* Kontroller */}
              <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2">
                {/* Cinsiyet */}
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

                {/* Ön / Arka */}
                <button
                  type="button"
                  onClick={() => { setView((v) => v === "front" ? "back" : "front"); setSelected(null); }}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {view === "front" ? "Ön görünüm" : "Arka görünüm"}
                </button>
              </div>

              {/* İpucu */}
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

              {/* Beden SVG */}
              <div className="flex-1 min-h-0 flex items-center justify-center py-2">
                <BodyMap view={view} selected={selected} onSelect={handleSelect} />
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
