import {
  ArrowRight,
  Droplets,
  Flame,
  LineChart,
  MessageCircle,
  Timer,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

type Props = {
  consumed: number;
  target: number | null;
  waterMl: number;
  waterGoal: number;
  streak: number;
};

const QUICK: {
  href: string;
  label: string;
  icon: ComponentType<LucideProps>;
  tint: string;
}[] = [
  {
    href: "/sohbet",
    label: "Asistana sor",
    icon: MessageCircle,
    tint: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  {
    href: "/plan",
    label: "Planım",
    icon: UtensilsCrossed,
    tint: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  },
  {
    href: "/ilerleme",
    label: "İlerleme",
    icon: LineChart,
    tint: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  },
  {
    href: "/pomodoro",
    label: "Odak",
    icon: Timer,
    tint: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  },
];

export function HomeDashboard({
  consumed,
  target,
  waterMl,
  waterGoal,
  streak,
}: Props) {
  const t = target ?? 0;
  const pct = t > 0 ? Math.min(100, Math.round((consumed / t) * 100)) : 0;
  const left = Math.max(0, t - consumed);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const waterPct =
    waterGoal > 0 ? Math.min(100, Math.round((waterMl / waterGoal) * 100)) : 0;

  return (
    <div className="space-y-5">
      {/* Bugünün özeti */}
      <section className="overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-teal-50/40 p-5 shadow-[var(--shadow-soft)] dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-teal-950/10">
        <div className="flex items-center gap-5">
          {/* Kalori halkası */}
          <div className="relative grid h-32 w-32 shrink-0 place-items-center">
            <svg className="h-32 w-32 -rotate-90" viewBox="0 0 128 128">
              <circle
                cx="64"
                cy="64"
                r={r}
                fill="none"
                strokeWidth="11"
                className="stroke-emerald-100 dark:stroke-emerald-950/60"
              />
              <circle
                cx="64"
                cy="64"
                r={r}
                fill="none"
                strokeWidth="11"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                className="stroke-emerald-500 transition-[stroke-dasharray] duration-700 ease-[var(--ease-out)]"
              />
            </svg>
            <div className="absolute text-center">
              <p className="text-2xl font-extrabold tabular-nums leading-none text-emerald-900 dark:text-emerald-50">
                {consumed}
              </p>
              <p className="text-[11px] text-gray-500">
                / {target ?? "—"} kcal
              </p>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-[0.14em] text-emerald-700 uppercase dark:text-emerald-300">
              Bugün
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-900 dark:text-emerald-50">
              {target
                ? pct >= 100
                  ? "Hedefe ulaştın 🎉"
                  : `${left} kcal kaldı`
                : "Kalori takibine başla"}
            </p>

            {/* Su + Seri */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                <Droplets className="h-3.5 w-3.5" /> Su %{waterPct}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                <Flame className="h-3.5 w-3.5" fill="currentColor" /> {streak} gün
                seri
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/plan"
          className="group mt-4 flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(5,150,105,0.7)] transition-[transform,filter] duration-200 ease-[var(--ease-out)] hover:brightness-105 active:scale-[0.98]"
        >
          Planımı aç
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </section>

      {/* Hızlı erişim */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK.map((q) => {
          const Icon = q.icon;
          return (
            <Link
              key={q.href}
              href={q.href}
              className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 active:scale-[0.97] dark:border-gray-800 dark:bg-gray-900"
            >
              <span
                className={`grid h-11 w-11 place-items-center rounded-xl ${q.tint}`}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                {q.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Diyetisyen bul */}
      <Link
        href="/diyetisyen-bul"
        className="flex items-center justify-between rounded-2xl border border-amber-200/70 bg-amber-50/50 px-4 py-3 text-sm transition hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20"
      >
        <span className="font-medium text-amber-800 dark:text-amber-200">
          Uzman bir diyetisyenle çalışmak ister misin?
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-amber-600" />
      </Link>
    </div>
  );
}
