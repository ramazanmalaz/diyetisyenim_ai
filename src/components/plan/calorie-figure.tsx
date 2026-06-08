"use client";

import { useEffect, useRef, useState } from "react";

import type { Meal } from "@/components/plan/editable-meals";

/**
 * "Ümüş Teyze" — kalori/öğün durumuna göre tepki veren başörtülü teyze figürü.
 * Tepki anında sayfanın ortasında büyür (mobil ~1/3, masaüstü ~1/6 ekran),
 * konuşma baloncuğuyla mesajını söyler; ekranda herhangi bir yere tıklanınca
 * kapanır ve figür yerinde kendi etrafında döner.
 * Bağımsız: harici kütüphane yok, SVG + scoped CSS.
 */

const SWEET = [
  "çikolata",
  "baklava",
  "sütlaç",
  "künefe",
  "dondurma",
  "tatlı",
  "kek",
  "kurabiye",
  "bisküvi",
  "gofret",
  "lokum",
  "helva",
  "tulumba",
  "lokma",
  "revani",
  "şekerpare",
  "profiterol",
  "tiramisu",
  "cheesecake",
  "magnolia",
  "browni",
  "kazandibi",
  "güllaç",
  "aşure",
  "reçel",
  "pekmez",
  "nutella",
  "kola",
  "gazoz",
  "enerji içeceği",
  "limonata",
];

function isSweet(name: string): boolean {
  const n = name.toLocaleLowerCase("tr");
  return SWEET.some((k) => n.includes(k));
}

type FigureState = "idle" | "happy" | "sweet" | "over" | "full";

// Eklemede dönüşümlü söylenen şekerli/diyet dışı repliği.
const SWEET_LINES = [
  "Aman canımmm nolacak sanki 😋",
  "Bir lokmadan bir şey olmaz yavrum 🤭",
  "Tamam tamam, görmedim say 🙈",
  "Azıcık kaçamak iyidir canım 😌",
];

/**
 * Ümüş Teyze — sade/naif çizim (referans logo gibi).
 * Başörtü yalnızca arkada/çevrede çerçevedir; yüz tam bir daire olarak en üstte,
 * hiçbir zaman örtüyle kapanmaz.
 */
function TeyzeSvg({
  state,
  className,
}: {
  state: FigureState;
  className?: string;
}) {
  const SCARF = "#bb6b43";
  const SCARF_DARK = "#9c5536";
  const SKIN = "#f4dcc4";
  const INK = "#5b3b2e";
  const strongBlush = state === "full" || state === "sweet";

  return (
    <svg
      viewBox="0 0 140 152"
      className={className}
      role="img"
      aria-label="Ümüş Teyze"
    >
      {/* Gövde / örtü elbisesi (arkada) */}
      <path
        d="M70 80 C40 80 22 106 18 150 L122 150 C118 106 100 80 70 80 Z"
        fill={SCARF}
      />
      {/* Önlük (krem) + küçük kalp motifi */}
      <path
        d="M70 96 C52 96 44 116 46 150 L94 150 C96 116 88 96 70 96 Z"
        fill="#f4ead9"
      />
      <path
        d="M70 124 c-4 -7 -14 -5 -14 3 c0 6 8 10 14 15 c6 -5 14 -9 14 -15 c0 -8 -10 -10 -14 -3 z"
        fill={SCARF}
      />

      {/* Başörtü (yüzün ARKASINDA, biraz yukarı kaydık → çevre çerçevesi) */}
      <circle cx="70" cy="50" r="41" fill={SCARF} />
      {/* Örtü ön kenarı (saç hizası, yüzün üstünde değil çevresinde) */}
      <path
        d="M33 56 A 37 37 0 0 1 107 56"
        fill="none"
        stroke={SCARF_DARK}
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* YÜZ (tam görünür, en üstte) */}
      <circle cx="70" cy="60" r="32" fill={SKIN} />

      {/* Yanak allığı */}
      <circle cx="50" cy="68" r="5" fill="#e79477" opacity={strongBlush ? 0.75 : 0.5} />
      <circle cx="90" cy="68" r="5" fill="#e79477" opacity={strongBlush ? 0.75 : 0.5} />

      {/* Gözler — naif */}
      {state === "over" ? (
        <>
          <circle cx="60" cy="58" r="3" fill={INK} />
          <circle cx="80" cy="58" r="3" fill={INK} />
        </>
      ) : state === "sweet" ? (
        <>
          {/* göz kırpma */}
          <path d="M55 60 q5 -5 10 0" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="80" cy="58" r="3" fill={INK} />
        </>
      ) : (
        <>
          {/* huzurlu kapalı gözler */}
          <path d="M55 59 q5 -5 10 0" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M75 59 q5 -5 10 0" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}

      {/* Burun (minik) */}
      <path d="M69 64 q1 3 2 0" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />

      {/* Ağız */}
      {state === "full" ? (
        <path d="M60 70 q10 9 20 0 q-10 4 -20 0 z" fill="#c8554f" />
      ) : state === "over" ? (
        <ellipse cx="70" cy="72" rx="4" ry="5" fill="#c8554f" />
      ) : state === "sweet" ? (
        <path d="M61 70 q10 6 18 -1" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      ) : (
        <path d="M61 70 q9 7 18 0" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      )}

      {/* Ter damlası (aşım) */}
      {state === "over" && (
        <path
          className="teyze-drop"
          d="M100 44 q4 6 0 9 a4.5 4.5 0 1 1 0 -9 z"
          fill="#38bdf8"
        />
      )}
    </svg>
  );
}

export function CalorieFigure({
  consumed,
  target,
  meals,
  selectedDay,
}: {
  consumed: number;
  target: number | null;
  meals: Meal[];
  selectedDay: number;
}) {
  const t = target ?? 0;
  const ratio = t > 0 ? consumed / t : 0;
  const over = ratio > 1;
  const overBy = Math.max(0, Math.round(consumed - t));

  const dayItems = meals.filter((m) => m.day_of_week === selectedDay);
  const allChecked = dayItems.length > 0 && dayItems.every((m) => m.checked);
  const hasSweet = dayItems.some((m) => isSweet(m.content));

  const state: FigureState = allChecked
    ? "full"
    : hasSweet
      ? "sweet"
      : over
        ? "over"
        : consumed <= 0
          ? "idle"
          : "happy";

  const cardMsg: Record<FigureState, string> = {
    idle: "Hadi başlayalım yavrum 🤲",
    happy: "Aferin sana, böyle devam 😊",
    sweet: "Aman canımmm nolacak sanki 😋",
    over: `Yavaş ye yavrum, ${overBy} kcal kaçtı 😮`,
    full: "Bu günde doyduk 🎉",
  };
  const rose = state === "over";

  // Ortadaki büyük tepki + baloncuk.
  const [big, setBig] = useState<{ state: FigureState; msg: string } | null>(
    null,
  );
  const [spin, setSpin] = useState(false);
  const prevIds = useRef<Set<string> | null>(null);
  const prevState = useRef<FigureState | null>(null);
  const sweetTurn = useRef(0);
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null);

  function trigger(next: { state: FigureState; msg: string }) {
    setSpin(false);
    setBig(next);
    if (fallback.current) clearTimeout(fallback.current);
    // Tıklanmazsa da bir süre sonra kapansın (güvenlik).
    fallback.current = setTimeout(dismiss, 8000);
  }

  function dismiss() {
    if (fallback.current) clearTimeout(fallback.current);
    setBig(null);
    setSpin(true);
    setTimeout(() => setSpin(false), 900);
  }

  useEffect(() => {
    const ids = new Set(meals.map((m) => m.id));

    // İlk render: referansları doldur, tetikleme yapma.
    if (prevIds.current === null) {
      prevIds.current = ids;
      prevState.current = state;
      return;
    }

    // Yeni eklenen öğeler arasında şekerli/diyet dışı var mı? → her eklemede tetikle.
    const added = meals.filter((m) => !prevIds.current!.has(m.id));
    const newSweet = added.find((m) => isSweet(m.content));

    if (newSweet) {
      const line = SWEET_LINES[sweetTurn.current % SWEET_LINES.length];
      sweetTurn.current += 1;
      trigger({ state: "sweet", msg: line });
    } else if (
      prevState.current !== state &&
      (state === "over" || state === "full")
    ) {
      trigger({ state, msg: cardMsg[state] });
    }

    prevIds.current = ids;
    prevState.current = state;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meals, state]);

  return (
    <>
      <style>{`
        @keyframes teyze-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes teyze-spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes teyze-drop { 0%{opacity:0;transform:translateY(-2px)} 30%{opacity:1} 100%{opacity:0;transform:translateY(9px)} }
        @keyframes teyze-enter { 0%{transform:scale(.2);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
        @keyframes bubble-in { 0%{transform:translateY(6px) scale(.8);opacity:0} 100%{transform:translateY(0) scale(1);opacity:1} }
        .teyze-bob { animation: teyze-bob 2.8s ease-in-out infinite; }
        .teyze-spin { animation: teyze-spin .9s ease-in-out; transform-origin:center center; }
        .teyze-drop { animation: teyze-drop 1.1s ease-in-out infinite; }
        .teyze-enter { animation: teyze-enter .5s cubic-bezier(.34,1.56,.64,1); transform-origin:center bottom; }
        .bubble-in { animation: bubble-in .4s ease-out .15s both; }
      `}</style>

      {/* Yerindeki kart */}
      <div
        className={`flex items-center gap-4 rounded-3xl border p-4 shadow-[var(--shadow-soft)] transition-colors ${
          rose
            ? "border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30"
            : "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30"
        }`}
      >
        <div className={`shrink-0 ${spin ? "teyze-spin" : "teyze-bob"}`}>
          <TeyzeSvg state={state} className="h-24 w-24" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
            Ümüş Teyze
          </p>
          <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-200">
            {cardMsg[state]}
          </p>
        </div>
      </div>

      {/* Tepki: sayfa ortasında büyük + baloncuk. Herhangi bir yere tıkla → kapanır. */}
      {big && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/20 p-4 backdrop-blur-[1px]"
          onClick={dismiss}
          role="button"
          aria-label="Kapat"
        >
          <div className="teyze-enter flex flex-col items-center">
            <div className="bubble-in relative mb-3 max-w-[80vw] rounded-2xl bg-white px-5 py-3 text-center shadow-[var(--shadow-float)] dark:bg-gray-900">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Ümüş Teyze
              </p>
              <p className="mt-0.5 text-base font-semibold text-gray-800 dark:text-gray-100">
                {big.msg}
              </p>
              <span className="absolute -bottom-1.5 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white dark:bg-gray-900" />
            </div>
            <TeyzeSvg
              state={big.state}
              className="h-auto w-[33vw] max-w-[300px] md:w-[16vw]"
            />
            <p className="mt-3 text-xs text-white/80">
              (kapatmak için ekrana dokun)
            </p>
          </div>
        </div>
      )}
    </>
  );
}
