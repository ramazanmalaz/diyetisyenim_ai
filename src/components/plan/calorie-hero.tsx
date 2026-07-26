type Props = {
  dailyTarget: number | null;
  goalLossKg: number | null;
  estimatedWeeks: number | null;
  plannedToday: number;
  consumedToday: number;
  title?: string;
};

/**
 * "Bugünün özeti" — kompakt tek satırlık halka göstergesi. Halka, alınan
 * kalorinin günlük hedefe oranını gösterir; hedef aşılınca kehribar renge döner.
 */
export function CalorieHero({
  dailyTarget,
  goalLossKg,
  estimatedWeeks,
  plannedToday,
  consumedToday,
  title = "Bugünün özeti",
}: Props) {
  const target = dailyTarget ?? 0;
  const ratio = target > 0 ? Math.min(consumedToday / target, 1) : 0;
  const pct = Math.round(ratio * 100);
  const left = Math.max(target - consumedToday, 0);
  const over = target > 0 && consumedToday > target;

  // Halka
  const R = 30;
  const C = 2 * Math.PI * R;
  const dash = C * ratio;

  return (
    <section className="reveal rounded-[1.5rem] bg-white/40 p-1.5 shadow-[var(--shadow-float)] ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
      <div className="glass relative overflow-hidden rounded-[calc(1.5rem-0.375rem)] px-4 py-3.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-emerald-200/40 blur-2xl"
        />

        <div className="relative flex items-center justify-between">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-gray-500 uppercase dark:text-gray-400">
            {title}
          </p>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {goalLossKg ?? "—"} kg · ~{estimatedWeeks ?? "—"} hf
          </span>
        </div>

        <div className="relative mt-2.5 flex items-center gap-3.5">
          {/* Halka gösterge */}
          <div className="relative h-[64px] w-[64px] shrink-0">
            <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
              <circle
                cx="36"
                cy="36"
                r={R}
                strokeWidth={7}
                fill="none"
                className="stroke-gray-100 dark:stroke-gray-800"
              />
              <circle
                cx="36"
                cy="36"
                r={R}
                strokeWidth={7}
                fill="none"
                strokeLinecap="round"
                stroke={over ? "#f59e0b" : "url(#heroRingGrad)"}
                strokeDasharray={C}
                strokeDashoffset={C - dash}
                className="gauge-arc"
              />
              <defs>
                <linearGradient id="heroRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a3e635" />
                  <stop offset="100%" stopColor="#6aa621" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[15px] font-extrabold tabular-nums leading-none">
                %{pct}
              </span>
            </div>
          </div>

          {/* Alınan kalori — birincil odak */}
          <div className="min-w-0 flex-1">
            <p className="flex items-baseline gap-1 leading-none">
              <span className="text-2xl font-extrabold tabular-nums text-emerald-600">
                {consumedToday}
              </span>
              <span className="text-xs font-semibold text-gray-400">
                kcal alındı
              </span>
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Planlanan {plannedToday} kcal
            </p>
          </div>

          {/* Hedef / Kalan mini istatistikler */}
          <div className="ml-auto flex shrink-0 gap-3 border-l border-gray-200/70 pl-3 text-right dark:border-gray-700/60">
            <div>
              <p className="text-sm font-bold tabular-nums">{target}</p>
              <p className="text-[10px] text-gray-400">Hedef</p>
            </div>
            <div>
              <p
                className={
                  "text-sm font-bold tabular-nums " +
                  (over ? "text-amber-600" : "text-emerald-600")
                }
              >
                {over ? `+${consumedToday - target}` : left}
              </p>
              <p className="text-[10px] text-gray-400">
                {over ? "Aşım" : "Kalan"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
