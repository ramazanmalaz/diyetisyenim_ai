type Props = {
  dailyTarget: number | null;
  goalLossKg: number | null;
  estimatedWeeks: number | null;
  plannedToday: number;
  consumedToday: number;
};

/**
 * "Bugünün özeti" — yarım daire kalori göstergesi (NUTRIFLOW çizgisi).
 * Gösterge, tiklenen (alınan) kalorinin günlük hedefe oranını gösterir.
 */
export function CalorieHero({
  dailyTarget,
  goalLossKg,
  estimatedWeeks,
  plannedToday,
  consumedToday,
}: Props) {
  const target = dailyTarget ?? 0;
  const ratio = target > 0 ? Math.min(consumedToday / target, 1) : 0;
  const pct = Math.round(ratio * 100);
  const left = Math.max(target - consumedToday, 0);

  // Yarım daire ark
  const R = 90;
  const len = Math.PI * R; // ≈ 282.7
  const dash = len * ratio;

  return (
    <section className="glass reveal relative overflow-hidden rounded-3xl p-5 shadow-[var(--shadow-float)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-16 h-52 w-52 rounded-full bg-emerald-200/50 blur-3xl"
      />

      <div className="relative flex items-center justify-between">
        <p className="text-sm font-semibold">Bugünün özeti</p>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {goalLossKg ?? "—"} kg · ~{estimatedWeeks ?? "—"} hf
        </span>
      </div>

      {/* Üst stat: Toplam / Kalan */}
      <div className="relative mt-3 flex items-center justify-between text-center">
        <Stat label="Toplam" value={`${target}`} />
        <Stat label="Kalan" value={`${left}`} accent />
      </div>

      {/* Yarım daire gösterge */}
      <div className="relative mx-auto mt-1 w-full max-w-[280px]">
        <svg viewBox="0 0 220 124" className="w-full">
          <defs>
            <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#a3e635" />
              <stop offset="100%" stopColor="#6aa621" />
            </linearGradient>
          </defs>
          <path
            d="M 20 112 A 90 90 0 0 1 200 112"
            fill="none"
            strokeWidth={16}
            strokeLinecap="round"
            className="stroke-gray-100 dark:stroke-gray-800"
          />
          <path
            d="M 20 112 A 90 90 0 0 1 200 112"
            fill="none"
            strokeWidth={16}
            strokeLinecap="round"
            stroke="url(#gaugeGrad)"
            strokeDasharray={`${dash} ${len}`}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-1 flex flex-col items-center">
          <span className="text-3xl font-bold tabular-nums">%{pct}</span>
          <span className="text-xs text-gray-500">tamamlandı</span>
        </div>
      </div>

      {/* Alt bilgi */}
      <p className="relative mt-1 text-center text-xs text-gray-500">
        Alınan <b className="text-emerald-700 dark:text-emerald-300">
          {consumedToday}
        </b>{" "}
        / planlanan {plannedToday} kcal · hedef {target} kcal
      </p>
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex-1">
      <p
        className={
          accent
            ? "text-xl font-bold text-emerald-600"
            : "text-xl font-bold"
        }
      >
        {value}
        <span className="text-xs font-normal text-gray-400"> kcal</span>
      </p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
