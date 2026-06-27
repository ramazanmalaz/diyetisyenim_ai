import { Droplets, Dumbbell, Scale, UtensilsCrossed } from "lucide-react";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

type Props = {
  weightDelta: number | null;
  currentWeight: number | null;
  workoutDays: number;
  mealDays: number;
  waterGoalDays: number;
};

type Tile = {
  icon: ComponentType<LucideProps>;
  label: string;
  value: string;
  sub: string;
  tint: string; // ikon karosu
};

export function WeeklySummary({
  weightDelta,
  currentWeight,
  workoutDays,
  mealDays,
  waterGoalDays,
}: Props) {
  // Kilo karosu — değişim varsa yön+renk, yoksa güncel/ölçüm yok.
  let weightValue = "—";
  let weightSub = "ölçüm yok";
  let weightTint = "from-gray-300 to-gray-400";
  if (weightDelta != null) {
    const lost = weightDelta < 0;
    weightValue = `${weightDelta > 0 ? "+" : ""}${weightDelta
      .toFixed(1)
      .replace(".", ",")} kg`;
    weightSub = "bu hafta";
    weightTint = lost
      ? "from-emerald-400 to-emerald-600"
      : weightDelta === 0
        ? "from-gray-300 to-gray-400"
        : "from-amber-400 to-orange-500";
  } else if (currentWeight != null) {
    weightValue = `${currentWeight.toFixed(1).replace(".", ",")} kg`;
    weightSub = "güncel";
    weightTint = "from-sky-400 to-cyan-600";
  }

  const tiles: Tile[] = [
    {
      icon: Scale,
      label: "Kilo",
      value: weightValue,
      sub: weightSub,
      tint: weightTint,
    },
    {
      icon: Dumbbell,
      label: "Antrenman",
      value: `${workoutDays}`,
      sub: "gün",
      tint: "from-lime-400 to-green-600",
    },
    {
      icon: UtensilsCrossed,
      label: "Öğün takibi",
      value: `${mealDays}/7`,
      sub: "gün",
      tint: "from-amber-400 to-orange-500",
    },
    {
      icon: Droplets,
      label: "Su hedefi",
      value: `${waterGoalDays}/7`,
      sub: "gün",
      tint: "from-sky-400 to-cyan-600",
    },
  ];

  const active = workoutDays > 0 || mealDays > 0 || waterGoalDays > 0;

  return (
    <section className="reveal rounded-3xl border border-gray-200 bg-white p-5 shadow-[var(--shadow-soft)] dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Bu hafta
        </h2>
        <span className="text-[11px] font-medium tracking-[0.14em] text-gray-400 uppercase">
          Son 7 gün
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.label}
              className="flex flex-col items-start gap-2 rounded-2xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-950/40"
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br text-white ${t.tint}`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <div>
                <p className="font-display text-lg font-extrabold tabular-nums leading-none text-gray-900 dark:text-gray-50">
                  {t.value}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  {t.label} · {t.sub}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
        {active
          ? "Güzel gidiyorsun, ritmi koru! 💪"
          : "Bu hafta veriye başlamak için harika bir gün ✨"}
      </p>
    </section>
  );
}
