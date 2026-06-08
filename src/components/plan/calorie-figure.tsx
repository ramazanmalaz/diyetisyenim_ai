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

// Normal (formda) durumda dönüşümlü motive edici sözler.
const MOTIVATION = [
  "Formdasın yavrum, böyle devam! 💪",
  "Sağlık her şeyden önce gelir 🌿",
  "Su içmeyi unutma canım 💧",
  "Azimle her şey güzel olacak ✨",
  "Bir adım daha, sen yaparsın! 🌟",
  "Dengeli beslen, keyfine de bak 😊",
  "Bugün dünden daha iyisin 👏",
];

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
  const over = state === "over";
  const strongBlush = state === "full" || state === "sweet" || over;
  const faceFill = over ? "#eaa07f" : SKIN; // aşımda kızarık ten

  return (
    <svg
      viewBox="0 0 140 152"
      className={className}
      role="img"
      aria-label="Ümüş Teyze"
    >
      {/* Gövde / örtü elbisesi — aşımda şişman (yatay genişler) */}
      <g
        transform={
          over ? "translate(70 150) scale(1.22 1.06) translate(-70 -150)" : undefined
        }
      >
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
      </g>

      {/* Başörtü (yüzün ARKASINDA → çevre çerçevesi) */}
      <circle cx="70" cy="50" r={over ? 45 : 41} fill={SCARF} />
      <path
        d="M33 56 A 37 37 0 0 1 107 56"
        fill="none"
        stroke={SCARF_DARK}
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* YÜZ (tam görünür) — aşımda tombul (geniş elips) */}
      <ellipse
        cx="70"
        cy="61"
        rx={over ? 39 : 32}
        ry={over ? 35 : 32}
        fill={faceFill}
      />
      {/* Aşımda kızarıklık tonu + çift gıdık */}
      {over && (
        <>
          <ellipse cx="70" cy="63" rx="39" ry="35" fill="#e8553e" opacity="0.14" />
          <path
            d="M52 88 q18 12 36 0"
            fill="none"
            stroke="#d98a63"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Yanak allığı (aşımda büyük & kırmızı) */}
      <circle
        cx={over ? 47 : 50}
        cy="69"
        r={over ? 7 : 5}
        fill={over ? "#e8553e" : "#e79477"}
        opacity={strongBlush ? 0.8 : 0.5}
      />
      <circle
        cx={over ? 93 : 90}
        cy="69"
        r={over ? 7 : 5}
        fill={over ? "#e8553e" : "#e79477"}
        opacity={strongBlush ? 0.8 : 0.5}
      />

      {/* Kızgın kaşlar (yalnızca aşım) */}
      {over && (
        <>
          <path d="M55 51 L67 57" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
          <path d="M85 51 L73 57" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
        </>
      )}

      {/* Gözler — naif */}
      {over ? (
        <>
          <circle cx="61" cy="62" r="3" fill={INK} />
          <circle cx="79" cy="62" r="3" fill={INK} />
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
      <path d="M69 66 q1 3 2 0" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />

      {/* Ağız */}
      {state === "full" ? (
        <path d="M60 70 q10 9 20 0 q-10 4 -20 0 z" fill="#c8554f" />
      ) : over ? (
        // kızgın asık ağız
        <path d="M61 76 q9 -6 18 0" fill="none" stroke="#8d3340" strokeWidth="2.8" strokeLinecap="round" />
      ) : state === "sweet" ? (
        <path d="M61 70 q10 6 18 -1" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      ) : (
        <path d="M61 70 q9 7 18 0" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      )}

      {/* Öfke buharı (aşım) */}
      {over && (
        <>
          <path
            className="teyze-drop"
            d="M104 40 q5 -6 10 -2 q-3 5 1 9 q-7 1 -11 -7 z"
            fill="#e8553e"
            opacity="0.85"
          />
          <circle cx="30" cy="44" r="2" fill="#e8553e" opacity="0.7" />
          <circle cx="26" cy="50" r="1.4" fill="#e8553e" opacity="0.6" />
        </>
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

  // Öncelik: kalori aşımı (şişman+kızgın) her şeyin önünde → sonra doyduk → şekerli.
  const state: FigureState = over
    ? "over"
    : allChecked
      ? "full"
      : hasSweet
        ? "sweet"
        : consumed <= 0
          ? "idle"
          : "happy";

  const cardMsg: Record<FigureState, string> = {
    idle: "Hadi başlayalım yavrum 🤲",
    happy: "Aferin sana, böyle devam 😊",
    sweet: "Aman canımmm nolacak sanki 😋",
    over: `Hooop! ${overBy} kcal fazla kaçtı, olmadı yavrum 😠`,
    full: "Bu günde doyduk 🎉",
  };
  const status: Record<FigureState, string> = {
    idle: "Hazırız 🤲",
    happy: "Formda 💪",
    sweet: "Eh işte 😋",
    over: "Şişmanlıyoruz! 😠",
    full: "Doyduk 🎉",
  };
  const rose = state === "over";

  // Normal (formda) durumda dönüşümlü motive edici sözler.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 5000);
    return () => clearInterval(id);
  }, []);
  const cardLine =
    state === "happy"
      ? MOTIVATION[tick % MOTIVATION.length]
      : cardMsg[state];

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

    if (newSweet && state === "sweet") {
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
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
              Ümüş Teyze
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                rose
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              }`}
            >
              {status[state]}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-200">
            {cardLine}
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
