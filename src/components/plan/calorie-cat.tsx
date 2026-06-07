"use client";

/**
 * Kalori durumuna göre tepki veren kedi.
 * Hedef içinde → mutlu & zinde. Hedef aşıldı → mutsuz & şişman (sallanır).
 * Bağımsız: harici kütüphane yok, SVG + scoped CSS. Beğenilmezse tek dosya silinir.
 */
export function CalorieCat({
  consumed,
  target,
}: {
  consumed: number;
  target: number | null;
}) {
  const t = target ?? 0;
  const ratio = t > 0 ? consumed / t : 0;
  const over = ratio > 1;
  const none = consumed <= 0;

  // Yedikçe şişer; hedefi aşınca belirgin şişman.
  const belly = 1 + Math.min(Math.max(ratio - 0.4, 0), 1.4) * 0.45; // ~1 → ~1.63
  const overBy = Math.max(0, Math.round(consumed - t));

  const message = none
    ? "Henüz bir şey işaretlemedin 🐾"
    : over
      ? `Bugün hedefi ${overBy} kcal aştın! Pati bozuldu 😾`
      : ratio > 0.85
        ? "Hedefe çok yakınsın, aferin! 😺"
        : "Harika gidiyorsun! 😻";

  const mood = over ? "over" : none ? "idle" : "happy";

  return (
    <div
      className={`flex items-center gap-4 rounded-3xl border p-4 shadow-[var(--shadow-soft)] transition-colors ${
        over
          ? "border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30"
          : "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30"
      }`}
    >
      <style>{`
        @keyframes cat-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes cat-wobble { 0%,100%{transform:rotate(-4deg)} 50%{transform:rotate(4deg)} }
        @keyframes cat-tail { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-14deg)} }
        @keyframes cat-sweat { 0%{opacity:0;transform:translateY(-2px)} 25%{opacity:1} 100%{opacity:0;transform:translateY(10px)} }
        .cat-happy { animation: cat-bob 2.4s ease-in-out infinite; transform-origin:center bottom; }
        .cat-over { animation: cat-wobble 0.7s ease-in-out infinite; transform-origin:center bottom; }
        .cat-idle { animation: cat-bob 4s ease-in-out infinite; transform-origin:center bottom; }
        .cat-tail { animation: cat-tail 1.6s ease-in-out infinite; transform-origin: 86px 120px; }
        .cat-drop { animation: cat-sweat 1.1s ease-in-out infinite; }
      `}</style>

      <svg
        viewBox="0 0 160 150"
        className={`h-24 w-24 shrink-0 cat-${mood}`}
        role="img"
        aria-label={over ? "Mutsuz şişman kedi" : "Mutlu kedi"}
      >
        {/* Kuyruk */}
        <path
          className="cat-tail"
          d="M118 118 q34 -6 22 -40 q-4 -12 -16 -10 q10 4 8 18 q-2 18 -22 22 z"
          fill="#f59e0b"
        />

        {/* Gövde (yedikçe şişer) */}
        <g transform={`translate(80 100) scale(${belly} ${0.9 + (belly - 1) * 0.5}) translate(-80 -100)`}>
          <ellipse cx="80" cy="104" rx="40" ry="34" fill="#fbbf24" />
          <ellipse cx="80" cy="112" rx="24" ry="22" fill="#fde68a" />
          {/* Patiler */}
          <ellipse cx="64" cy="134" rx="11" ry="7" fill="#f59e0b" />
          <ellipse cx="96" cy="134" rx="11" ry="7" fill="#f59e0b" />
        </g>

        {/* Kafa */}
        <g>
          {/* Kulaklar */}
          <path d="M48 44 L40 16 L66 34 Z" fill="#fbbf24" />
          <path d="M112 44 L120 16 L94 34 Z" fill="#fbbf24" />
          <path d="M50 40 L46 26 L60 35 Z" fill="#fb923c" />
          <path d="M110 40 L114 26 L100 35 Z" fill="#fb923c" />

          <circle cx="80" cy="58" r="34" fill="#fcd34d" />

          {/* Gözler */}
          {over ? (
            <>
              {/* kızgın/üzgün gözler */}
              <path d="M60 50 l16 6" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
              <path d="M100 50 l-16 6" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
              <circle cx="68" cy="58" r="3.2" fill="#1f2937" />
              <circle cx="92" cy="58" r="3.2" fill="#1f2937" />
            </>
          ) : mood === "idle" ? (
            <>
              {/* uykulu/sakin */}
              <path d="M62 58 q6 5 14 0" stroke="#1f2937" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M84 58 q6 5 14 0" stroke="#1f2937" strokeWidth="3" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              {/* mutlu parlak gözler */}
              <circle cx="69" cy="57" r="5" fill="#1f2937" />
              <circle cx="91" cy="57" r="5" fill="#1f2937" />
              <circle cx="70.6" cy="55.4" r="1.6" fill="#fff" />
              <circle cx="92.6" cy="55.4" r="1.6" fill="#fff" />
            </>
          )}

          {/* Yanak allığı (şişman/mutlu) */}
          <circle cx="58" cy="68" r="5" fill="#fb7185" opacity={over ? 0.7 : 0.45} />
          <circle cx="102" cy="68" r="5" fill="#fb7185" opacity={over ? 0.7 : 0.45} />

          {/* Burun */}
          <path d="M77 66 h6 l-3 4 z" fill="#fb7185" />

          {/* Ağız */}
          {over ? (
            <path d="M70 80 q10 -8 20 0" stroke="#1f2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          ) : (
            <path d="M70 76 q10 9 20 0" stroke="#1f2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          )}

          {/* Bıyıklar */}
          <g stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
            <path d="M52 66 h-16" />
            <path d="M52 72 h-15" />
            <path d="M108 66 h16" />
            <path d="M108 72 h15" />
          </g>

          {/* Ter damlası (hedef aşıldı) */}
          {over && (
            <path
              className="cat-drop"
              d="M116 40 q4 6 0 9 a4.5 4.5 0 1 1 0 -9 z"
              fill="#38bdf8"
            />
          )}
        </g>
      </svg>

      <div>
        <p
          className={`text-sm font-semibold ${
            over
              ? "text-rose-700 dark:text-rose-300"
              : "text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {over ? "Hoop, fazla kaçtı!" : "Pati formda"}
        </p>
        <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
          {message}
        </p>
      </div>
    </div>
  );
}
