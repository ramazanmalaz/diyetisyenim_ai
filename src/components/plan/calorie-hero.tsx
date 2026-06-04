type Props = {
  dailyTarget: number | null;
  goalLossKg: number | null;
  estimatedWeeks: number | null;
  plannedTotal: number; // seçili/ortalama günün planlanan kalorisi
};

/**
 * "Bugünün beslenmesi" tarzı kalori ring kartı (temiz, app benzeri çizgi).
 * Ring, planlanan günlük toplamın hedefe oranını gösterir.
 */
export function CalorieHero({
  dailyTarget,
  goalLossKg,
  estimatedWeeks,
  plannedTotal,
}: Props) {
  const target = dailyTarget ?? 0;
  const ratio = target > 0 ? Math.min(plannedTotal / target, 1) : 0;

  const size = 132;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * ratio;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-float)] dark:border-gray-800 dark:bg-gray-950">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-100/60 blur-2xl dark:bg-emerald-900/20"
      />
      <div className="relative flex items-center gap-5">
        {/* Ring */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#36c980" />
                <stop offset="100%" stopColor="#0b6d48" />
              </linearGradient>
            </defs>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              className="stroke-gray-100 dark:stroke-gray-800"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              stroke="url(#ringGrad)"
              strokeDasharray={`${dash} ${circ}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums">{target}</span>
            <span className="text-[11px] text-gray-500">kcal / gün</span>
          </div>
        </div>

        {/* Bilgiler */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Günlük hedefin
          </p>
          <p className="mt-0.5 text-sm text-gray-500">
            Bir günde planlanan ~{plannedTotal} kcal
          </p>
          <div className="mt-3 flex gap-2">
            <Stat value={`${goalLossKg ?? "—"} kg`} label="hedef" />
            <Stat value={`~${estimatedWeeks ?? "—"} hf`} label="süre" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-emerald-50 px-3.5 py-2 text-center dark:bg-emerald-950/40">
      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
        {value}
      </p>
      <p className="text-[11px] text-emerald-700/70 dark:text-emerald-400/70">
        {label}
      </p>
    </div>
  );
}
