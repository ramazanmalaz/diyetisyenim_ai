type Point = { date: string; weight: number };

/**
 * Bağımlılıksız basit SVG kilo grafiği (kronolojik artan veri bekler).
 */
export function WeightChart({ points }: { points: Point[] }) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-gray-500">
        Grafik için en az iki kilo kaydı gerekir.
      </p>
    );
  }

  const W = 600;
  const H = 180;
  const pad = 24;

  const weights = points.map((p) => p.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const x = (i: number) =>
    pad + (i * (W - 2 * pad)) / (points.length - 1);
  const y = (w: number) =>
    H - pad - ((w - min) / range) * (H - 2 * pad);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.weight)}`)
    .join(" ");

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-44 w-full min-w-[480px]"
        role="img"
        aria-label="Kilo değişim grafiği"
      >
        <path
          d={path}
          fill="none"
          stroke="rgb(5 150 105)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.weight)}
            r={3}
            fill="rgb(5 150 105)"
          />
        ))}
        <text x={pad} y={14} fontSize={11} fill="currentColor">
          {max} kg
        </text>
        <text x={pad} y={H - 6} fontSize={11} fill="currentColor">
          {min} kg
        </text>
      </svg>
    </div>
  );
}
