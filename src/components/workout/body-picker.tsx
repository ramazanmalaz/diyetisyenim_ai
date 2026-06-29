"use client";

import { ArrowLeft, Loader2, X } from "lucide-react";
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
  chest: "Göğüs",
  waist: "Karın / Core",
  shoulders: "Omuzlar",
  "upper arms": "Kollar",
  "upper legs": "Bacaklar",
  "lower legs": "Alt Bacak",
  back: "Sırt",
  neck: "Boyun",
};

type Region = { id: BodyPart; d: string };

// ─── Beden bölgesi yolları (200×490 viewBox) ─────────────────────────────────

const FRONT_REGIONS: Region[] = [
  // Göğüs (pektoraller)
  {
    id: "chest",
    d: "M62 90 C74 80 90 75 100 75 C110 75 126 80 138 90 L140 155 C126 168 112 175 100 175 C88 175 74 168 60 155 Z",
  },
  // Karın / Core (rectus abdominis + obliqueler)
  { id: "waist", d: "M60 158 L140 158 L140 218 L60 218 Z" },
  // Sol omuz (ön deltoid)
  {
    id: "shoulders",
    d: "M34 104 C28 116 26 128 30 138 L48 130 C46 124 46 116 48 108 Z",
  },
  // Sağ omuz (ön deltoid)
  {
    id: "shoulders",
    d: "M166 104 C172 116 174 128 170 138 L152 130 C154 124 154 116 152 108 Z",
  },
  // Sol üst kol (biceps)
  {
    id: "upper arms",
    d: "M30 138 C24 150 22 164 24 178 L44 172 C42 162 42 150 44 136 Z",
  },
  // Sağ üst kol (biceps)
  {
    id: "upper arms",
    d: "M170 138 C176 150 178 164 176 178 L156 172 C158 162 158 150 156 136 Z",
  },
  // Sol üst bacak (quadriceps)
  {
    id: "upper legs",
    d: "M60 272 C56 286 54 304 54 322 C54 340 56 356 62 366 L94 360 C92 350 90 336 90 322 C90 308 92 294 94 280 Z",
  },
  // Sağ üst bacak (quadriceps)
  {
    id: "upper legs",
    d: "M140 272 C144 286 146 304 146 322 C146 340 144 356 138 366 L106 360 C108 350 110 336 110 322 C110 308 108 294 106 280 Z",
  },
  // Sol alt bacak
  {
    id: "lower legs",
    d: "M62 370 C58 384 56 402 56 422 C56 442 60 458 66 466 L92 462 C90 452 90 438 90 422 C90 406 92 390 94 378 Z",
  },
  // Sağ alt bacak
  {
    id: "lower legs",
    d: "M138 370 C142 384 144 402 144 422 C144 442 140 458 134 466 L108 462 C110 452 110 438 110 422 C110 406 108 390 106 378 Z",
  },
];

const BACK_REGIONS: Region[] = [
  // Sırt (lat + trapez + rhomboid)
  { id: "back", d: "M60 90 L140 90 L140 218 L60 218 Z" },
  // Sol arka omuz
  {
    id: "shoulders",
    d: "M34 104 C28 116 26 128 30 138 L48 130 C46 124 46 116 48 108 Z",
  },
  // Sağ arka omuz
  {
    id: "shoulders",
    d: "M166 104 C172 116 174 128 170 138 L152 130 C154 124 154 116 152 108 Z",
  },
  // Sol üst kol (triceps)
  {
    id: "upper arms",
    d: "M30 138 C24 150 22 164 24 178 L44 172 C42 162 42 150 44 136 Z",
  },
  // Sağ üst kol (triceps)
  {
    id: "upper arms",
    d: "M170 138 C176 150 178 164 176 178 L156 172 C158 162 158 150 156 136 Z",
  },
  // Kalça + arka bacak (glute + hamstring) — tek bölge
  {
    id: "upper legs",
    d: "M60 270 C56 284 54 302 54 320 C54 338 56 354 60 364 L140 364 C144 354 146 338 146 320 C146 302 144 284 140 270 Z",
  },
  // Sol baldır
  {
    id: "lower legs",
    d: "M62 370 C58 384 56 402 56 422 C56 442 60 458 66 466 L92 462 C90 452 90 438 90 422 C90 406 92 390 94 378 Z",
  },
  // Sağ baldır
  {
    id: "lower legs",
    d: "M138 370 C142 384 144 402 144 422 C144 442 140 458 134 466 L108 462 C110 452 110 438 110 422 C110 406 108 390 106 378 Z",
  },
];

// ─── Siluet — tek renk fill + stroke (anatomik illüstrasyon tarzı) ───────────

const S = "fill-zinc-200 stroke-zinc-400/80 stroke-[0.75]";   // siluet
const L = "fill-none stroke-zinc-400/50 stroke-[0.6]";        // iç kas çizgileri

function BodySilhouette({ view }: { view: BodyView }) {
  return (
    <g>
      {/* ── Baş ── */}
      <ellipse cx="100" cy="33" rx="23" ry="27" className={S} />

      {/* ── Boyun ── */}
      <path d="M91 57 C91 63 89 69 89 73 L111 73 C111 69 109 63 109 57 Z" className={S} />

      {/* ── Sol omuz kapısı ── */}
      <path
        d="M89 73 C79 73 65 77 52 85 C42 91 34 102 32 114 C30 124 32 134 36 140 L48 134 C46 126 46 118 48 110 C50 102 56 96 62 92 Z"
        className={S}
      />
      {/* ── Sağ omuz kapısı ── */}
      <path
        d="M111 73 C121 73 135 77 148 85 C158 91 166 102 168 114 C170 124 168 134 164 140 L152 134 C154 126 154 118 152 110 C150 102 144 96 138 92 Z"
        className={S}
      />

      {/* ── Gövde ── */}
      <path
        d="M62 92 C58 98 56 110 56 124 C56 144 56 164 58 180 C60 194 62 206 62 220 L138 220 C138 206 140 194 142 180 C144 164 144 144 144 124 C144 110 142 98 138 92 Z"
        className={S}
      />

      {/* ── Kalça / pelvis ── */}
      <path
        d="M62 220 C58 228 54 240 54 250 C54 260 56 268 60 272 L140 272 C144 268 146 260 146 250 C146 240 142 228 138 220 Z"
        className={S}
      />

      {/* ── Sol üst kol ── */}
      <path d="M32 114 C26 124 22 138 22 152 C22 166 24 178 28 186 L48 180 C46 172 44 160 44 152 C44 138 46 126 48 116 Z" className={S} />
      {/* ── Sağ üst kol ── */}
      <path d="M168 114 C174 124 178 138 178 152 C178 166 176 178 172 186 L152 180 C154 172 156 160 156 152 C156 138 154 126 152 116 Z" className={S} />

      {/* ── Sol önkol ── */}
      <path d="M28 186 C22 198 18 214 18 232 C18 250 20 264 24 272 L40 268 C38 258 36 244 36 232 C36 218 38 204 42 192 Z" className={S} />
      {/* ── Sağ önkol ── */}
      <path d="M172 186 C178 198 182 214 182 232 C182 250 180 264 176 272 L160 268 C162 258 164 244 164 232 C164 218 162 204 158 192 Z" className={S} />

      {/* ── Eller ── */}
      <ellipse cx="32" cy="278" rx="14" ry="9" className={S} />
      <ellipse cx="168" cy="278" rx="14" ry="9" className={S} />

      {/* ── Sol üst bacak ── */}
      <path d="M62 272 C58 286 56 304 56 322 C56 340 58 356 64 366 L96 360 C94 350 92 336 92 322 C92 308 94 294 96 280 Z" className={S} />
      {/* ── Sağ üst bacak ── */}
      <path d="M138 272 C142 286 144 304 144 322 C144 340 142 356 136 366 L104 360 C106 350 108 336 108 322 C108 308 106 294 104 280 Z" className={S} />

      {/* ── Dizler ── */}
      <ellipse cx="80" cy="364" rx="16" ry="10" className={S} />
      <ellipse cx="120" cy="364" rx="16" ry="10" className={S} />

      {/* ── Sol alt bacak ── */}
      <path d="M64 372 C60 384 58 402 58 420 C58 440 60 456 66 466 L90 462 C90 452 90 438 90 420 C90 402 90 386 92 376 Z" className={S} />
      {/* ── Sağ alt bacak ── */}
      <path d="M136 372 C140 384 142 402 142 420 C142 440 140 456 134 466 L110 462 C110 452 110 438 110 420 C110 402 110 386 108 376 Z" className={S} />

      {/* ── Ayaklar ── */}
      <path d="M66 466 C62 472 54 479 50 481 L90 481 L92 466 Z" className={S} />
      <path d="M134 466 C138 472 146 479 150 481 L110 481 L108 466 Z" className={S} />

      {/* ════════════════════════════════════════
          İÇ KAS ÇİZGİLERİ (ön / arka ayrı)
          ════════════════════════════════════════ */}
      {view === "front" ? (
        <>
          {/* Sternum dikey çizgi */}
          <line x1="100" y1="88" x2="100" y2="155" className={L} />
          {/* Sol pek eğri çizgileri */}
          <path d="M100 97  C90 94  78 98  68 107" className={L} />
          <path d="M100 110 C90 107 76 113 66 123" className={L} />
          <path d="M100 124 C90 122 76 128 65 138" className={L} />
          {/* Sağ pek - ayna */}
          <path d="M100 97  C110 94  122 98  132 107" className={L} />
          <path d="M100 110 C110 107 124 113 134 123" className={L} />
          <path d="M100 124 C110 122 124 128 135 138" className={L} />
          {/* Karın orta çizgisi */}
          <line x1="100" y1="158" x2="100" y2="218" className={L} />
          {/* Karın yatay bantlar */}
          <path d="M67 173 L133 173" className={L} />
          <path d="M65 188 L135 188" className={L} />
          <path d="M64 203 L136 203" className={L} />
          {/* Bicep tepe çizgisi */}
          <path d="M37 122 Q35 152 37 179" className={L} />
          <path d="M163 122 Q165 152 163 179" className={L} />
          {/* Delt / pek ayrım çizgisi */}
          <path d="M48 110 C52 120 58 130 62 140" className={L} />
          <path d="M152 110 C148 120 142 130 138 140" className={L} />
          {/* Quad orta çizgisi */}
          <path d="M76 278 Q74 320 76 358" className={L} />
          <path d="M124 278 Q126 320 124 358" className={L} />
          {/* Baldır orta */}
          <path d="M76 374 Q75 420 76 460" className={L} />
          <path d="M124 374 Q125 420 124 460" className={L} />
        </>
      ) : (
        <>
          {/* ─ ARKA GÖRÜNÜM kas çizgileri ─ */}
          {/* Vertebra (omurga) */}
          <path d="M100 88 L100 218" className={L} strokeDasharray="3 3" />
          {/* Trapez çizgileri */}
          <path d="M100 88  C90 90  78 94  68 100" className={L} />
          <path d="M100 88  C110 90 122 94  132 100" className={L} />
          <path d="M100 100 C88 104 74 108 62 112" className={L} />
          <path d="M100 100 C112 104 126 108 138 112" className={L} />
          {/* Lat çizgileri */}
          <path d="M62 112 C60 128 60 145 62 160" className={L} />
          <path d="M138 112 C140 128 140 145 138 160" className={L} />
          <path d="M66 125 C64 140 64 155 66 168" className={L} />
          <path d="M134 125 C136 140 136 155 134 168" className={L} />
          {/* Alt sırt / lomber */}
          <path d="M90 190 C92 200 94 210 96 218" className={L} />
          <path d="M110 190 C108 200 106 210 104 218" className={L} />
          {/* Tricep çizgisi */}
          <path d="M35 122 Q34 152 36 179" className={L} />
          <path d="M165 122 Q166 152 164 179" className={L} />
          {/* Gluteal çizgi */}
          <path d="M100 272 C100 290 100 310 100 330" className={L} />
          <path d="M80 278 Q78 318 80 355" className={L} />
          <path d="M120 278 Q122 318 120 355" className={L} />
          {/* Hamstring */}
          <path d="M70 278 Q68 318 70 356" className={L} />
          <path d="M130 278 Q132 318 130 356" className={L} />
          {/* Gastrocnemius (baldır) */}
          <path d="M76 374 Q75 412 76 450" className={L} />
          <path d="M124 374 Q125 412 124 450" className={L} />
        </>
      )}
    </g>
  );
}

// ─── Tıklanabilir SVG beden haritası ─────────────────────────────────────────

function BodyMap({
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
    <svg viewBox="0 0 200 490" className="h-full w-auto mx-auto max-w-[220px]">
      <BodySilhouette view={view} />

      {regions.map((r, i) => (
        <path
          key={i}
          d={r.d}
          onClick={() => onSelect(r.id)}
          className={cn(
            "cursor-pointer transition-[fill,stroke] duration-200",
            selected === r.id
              ? "fill-red-500/35 stroke-red-500 stroke-[1.5]"
              : "fill-transparent stroke-transparent hover:fill-red-400/15 hover:stroke-red-400/50 hover:stroke-[1]",
          )}
        />
      ))}
    </svg>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export function BodyPicker({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<BodyView>("front");
  const [selected, setSelected] = useState<BodyPart | null>(null);
  const [exercises, setExercises] = useState<ExerciseCard[]>([]);
  const [feedOpen, setFeedOpen] = useState(false);
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

      {/* Modal — bottom sheet, beyaz arka plan */}
      <div
        className="fixed inset-x-0 bottom-0 z-[71] flex justify-center"
        style={{ perspective: "1px" }}
      >
        <div
          className="w-full max-w-[440px] overflow-hidden rounded-t-[28px] bg-white shadow-2xl flex flex-col"
          style={{ height: "min(88svh, 680px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Handle çizgisi ── */}
          <div className="mx-auto mt-3 mb-1 h-1 w-10 shrink-0 rounded-full bg-zinc-200" />

          {/* ── Header ── */}
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
              <div className="h-9 w-9" />
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

          {/* ── Beden haritası görünümü ── */}
          {!feedOpen && (
            <>
              {/* Ön / Arka toggle */}
              <div className="flex shrink-0 justify-center gap-2 px-4 pb-2">
                {(["front", "back"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    className={cn(
                      "rounded-full px-5 py-1.5 text-xs font-semibold transition-[background-color,color] duration-200",
                      view === v
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700",
                    )}
                  >
                    {v === "front" ? "Ön" : "Arka"}
                  </button>
                ))}
              </div>

              {/* Yükleniyor / ipucu */}
              <div className="flex shrink-0 h-6 items-center justify-center">
                {pending ? (
                  <span className="flex items-center gap-1.5 text-xs text-red-500 animate-pulse">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
              {selected && !pending && (
                <div className="shrink-0 px-4 pb-5">
                  <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-center">
                    <p className="text-sm font-semibold text-red-600">
                      {LABELS[selected]} seçildi
                    </p>
                  </div>
                </div>
              )}

              {!selected && <div className="shrink-0 h-5" />}
            </>
          )}

          {/* ── Egzersiz feed'i ── */}
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
