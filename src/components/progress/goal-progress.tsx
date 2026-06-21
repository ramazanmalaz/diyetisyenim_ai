import { Flag, Target, TrendingDown } from "lucide-react";

type Props = {
  startKg: number;
  currentKg: number;
  goalKg: number;
  goalLossKg: number; // hedeflenen toplam değişim (pozitif = verme)
  finishDate: string | null;
};

const f1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

export function GoalProgress({
  startKg,
  currentKg,
  goalKg,
  goalLossKg,
  finishDate,
}: Props) {
  const losing = goalLossKg >= 0; // kilo verme mi (vs alma)
  const changed = startKg - currentKg; // verilen kg (verme için pozitif)
  const progressed = losing ? changed : -changed; // hedefe doğru ilerleme
  const target = Math.abs(goalLossKg);
  const pct =
    target > 0 ? Math.max(0, Math.min(100, (progressed / target) * 100)) : 0;
  const remaining = Math.max(0, target - progressed);
  const reached = progressed >= target && target > 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-teal-50/40 p-5 shadow-[var(--shadow-soft)] dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-teal-950/10">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-100">
          <Target className="h-4 w-4 text-emerald-600" strokeWidth={2} />
          Hedefe İlerleme
        </h2>
        <span
          className={
            "rounded-full px-2.5 py-1 text-xs font-bold tabular-nums " +
            (reached
              ? "bg-emerald-600 text-white"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300")
          }
        >
          %{Math.round(pct)}
        </span>
      </div>

      {/* Büyük durum */}
      <p className="mt-3 flex items-baseline gap-1.5">
        <TrendingDown className="h-5 w-5 self-center text-emerald-600" strokeWidth={2} />
        <span className="text-2xl font-extrabold tabular-nums tracking-tight text-emerald-900 dark:text-emerald-50">
          {f1(Math.abs(changed))}
        </span>
        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          kg {losing ? (changed >= 0 ? "verildi" : "alındı") : "değişti"}
        </span>
      </p>
      <p className="mt-0.5 text-sm text-emerald-800/80 dark:text-emerald-200/70">
        {reached
          ? "Hedefine ulaştın, tebrikler! 🎉"
          : `Hedefe ${f1(remaining)} kg kaldı`}
      </p>

      {/* İlerleme çubuğu: başlangıç → hedef */}
      <div className="relative mt-4">
        <div className="h-3 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-[width] duration-700 ease-[var(--ease-out)]"
            style={{ width: `${Math.max(pct, 3)}%` }}
          />
        </div>
        {/* Güncel işaretçi */}
        <div
          className="absolute -top-1 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-emerald-500 bg-white shadow dark:bg-gray-900"
          style={{ left: `${Math.max(2, Math.min(98, pct))}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-2 flex justify-between text-xs">
        <span className="text-gray-500">
          Başlangıç <b className="tabular-nums text-gray-700 dark:text-gray-300">{f1(startKg)}</b> kg
        </span>
        <span className="font-medium text-emerald-700 dark:text-emerald-300">
          Şu an {f1(currentKg)} kg
        </span>
        <span className="text-gray-500">
          Hedef <b className="tabular-nums text-gray-700 dark:text-gray-300">{f1(goalKg)}</b> kg
        </span>
      </div>

      {finishDate && !reached && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700/80 dark:text-emerald-300/70">
          <Flag className="h-3.5 w-3.5" /> Tahmini hedef tarihi: <b>{finishDate}</b>
        </p>
      )}
    </section>
  );
}
