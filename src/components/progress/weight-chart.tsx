type Point = { date: string; weight: number };

/**
 * Bağımlılıksız SVG kilo grafiği (kronolojik artan veri bekler).
 * Alan dolgusu + son nokta vurgusu ile.
 */
export function WeightChart({ points }: { points: Point[] }) {
  if (points.length < 2) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white/60 px-4 py-8 text-center dark:border-gray-800 dark:bg-gray-900/50">
        <p className="text-sm text-gray-500">
          Grafik için en az iki kilo kaydı gerekir. İlk tartını ekle 👇
        </p>
      </div>
    );
  }

  const W = 600;
  const H = 200;
  const pad = 28;

  const weights = points.map((p) => p.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const x = (i: number) => pad + (i * (W - 2 * pad)) / (points.length - 1);
  const y = (w: number) => H - pad - ((w - min) / range) * (H - 2 * pad);

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.weight)}`)
    .join(" ");
  const area = `${line} L ${x(points.length - 1)} ${H - pad} L ${x(0)} ${H - pad} Z`;

  const last = points[points.length - 1];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-[var(--shadow-soft)] dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          Kilo değişimi
        </h2>
        <span className="text-xs text-gray-400">
          Güncel{" "}
          <b className="tabular-nums text-emerald-700 dark:text-emerald-300">
            {last.weight} kg
          </b>
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-48 w-full min-w-[480px]"
          role="img"
          aria-label="Kilo değişim grafiği"
        >
          <defs>
            <linearGradient id="wc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((f) => (
            <line
              key={f}
              x1={pad}
              x2={W - pad}
              y1={pad + f * (H - 2 * pad)}
              y2={pad + f * (H - 2 * pad)}
              stroke="currentColor"
              strokeWidth={1}
              className="text-gray-100 dark:text-gray-800"
            />
          ))}
          <path d={area} fill="url(#wc-fill)" />
          <path
            d={line}
            fill="none"
            stroke="rgb(5 150 105)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={x(i)}
              cy={y(p.weight)}
              r={i === points.length - 1 ? 5 : 3}
              fill="rgb(5 150 105)"
              stroke="white"
              strokeWidth={i === points.length - 1 ? 2 : 0}
            />
          ))}
          <text x={pad} y={16} fontSize={11} className="fill-gray-400">
            {max} kg
          </text>
          <text x={pad} y={H - 8} fontSize={11} className="fill-gray-400">
            {min} kg
          </text>
        </svg>
      </div>
    </div>
  );
}
