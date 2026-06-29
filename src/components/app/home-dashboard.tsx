import {
  ArrowRight,
  Dumbbell,
  Flame,
  Salad,
  Sparkles,
  Stethoscope,
  Timer,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

import { Watermelon } from "@/components/icons/watermelon";

type Props = {
  name: string;
  greeting: string;
  consumed: number;
  target: number | null;
  waterMl: number;
  waterGoal: number;
  streak: number;
  isAdmin?: boolean;
};

// Tüm özellikler — her biri ayrı gradient kimliği + karakterli ikon.
const ALL_FEATURES: {
  href: string;
  label: string;
  desc: string;
  icon: ComponentType<LucideProps>;
  grad: string; // ikon karosu gradyanı
  glow: string; // renkli gölge (alçak opaklık)
  adminOnly?: boolean;
}[] = [
  {
    href: "/sohbet",
    label: "AI Asistan",
    desc: "Her şeyi sor",
    icon: Sparkles,
    grad: "from-emerald-400 to-emerald-600",
    glow: "shadow-[0_10px_24px_-10px_rgba(106,166,33,0.75)]",
  },
  {
    href: "/plan",
    label: "Planım",
    desc: "Günün öğünleri",
    icon: Salad,
    grad: "from-amber-400 to-orange-500",
    glow: "shadow-[0_10px_24px_-10px_rgba(245,158,11,0.7)]",
  },
  {
    href: "/spor",
    label: "Spor",
    desc: "Antrenman planı",
    icon: Dumbbell,
    grad: "from-lime-400 to-green-600",
    glow: "shadow-[0_10px_24px_-10px_rgba(132,204,22,0.7)]",
  },
  {
    href: "/ilerleme",
    label: "İlerleme",
    desc: "Kilo & ölçüm",
    icon: TrendingUp,
    grad: "from-sky-400 to-cyan-600",
    glow: "shadow-[0_10px_24px_-10px_rgba(14,165,233,0.7)]",
  },
  {
    href: "/pomodoro",
    label: "Odak",
    desc: "Pomodoro sayacı",
    icon: Timer,
    grad: "from-rose-400 to-rose-600",
    glow: "shadow-[0_10px_24px_-10px_rgba(244,63,94,0.7)]",
    adminOnly: true,
  },
  {
    href: "/karpuz",
    label: "Karpuz",
    desc: "Olgunluk testi",
    icon: Watermelon,
    grad: "from-rose-400 to-emerald-500",
    glow: "shadow-[0_10px_24px_-10px_rgba(244,63,94,0.6)]",
    adminOnly: true,
  },
];

// İnce film greni — derinlik için (düz yüzeyden kaçın).
const NOISE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

export function HomeDashboard({
  name,
  greeting,
  consumed,
  target,
  waterMl,
  waterGoal,
  streak,
  isAdmin = false,
}: Props) {
  const FEATURES = ALL_FEATURES.filter((f) => !f.adminOnly || isAdmin);
  const t = target ?? 0;
  const pct = t > 0 ? Math.min(100, Math.round((consumed / t) * 100)) : 0;
  const left = Math.max(0, t - consumed);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const waterPct =
    waterGoal > 0 ? Math.min(100, Math.round((waterMl / waterGoal) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* ===== Hero: bugünün özeti (açık tema) ===== */}
      <section className="reveal relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 p-6 shadow-[var(--shadow-soft)] dark:border-emerald-900/40 dark:from-emerald-950/25 dark:via-gray-950 dark:to-teal-950/15">
        {/* yumuşak lime parıltı + ince gren */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-emerald-300/25 blur-3xl dark:bg-emerald-500/15"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-multiply dark:opacity-[0.06] dark:mix-blend-overlay"
          style={{ backgroundImage: `url("${NOISE}")` }}
        />

        <div className="relative">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {greeting} 👋
          </p>
          <h1 className="font-display mt-0.5 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-emerald-50">
            {name || "Hoş geldin"}
          </h1>
        </div>

        <div className="relative mt-5 flex items-center gap-5">
          {/* Kalori halkası — gradient stroke + parıltı */}
          <div className="relative grid h-32 w-32 shrink-0 place-items-center">
            <svg className="h-32 w-32 -rotate-90" viewBox="0 0 128 128">
              <defs>
                <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#97cd41" />
                  <stop offset="100%" stopColor="#51811d" />
                </linearGradient>
              </defs>
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
                stroke="url(#ring)"
                strokeDasharray={`${dash} ${circ}`}
                className="transition-[stroke-dasharray] duration-700 ease-[var(--ease-out)] drop-shadow-[0_0_5px_rgba(151,205,65,0.5)]"
              />
            </svg>
            <div className="absolute text-center">
              <p className="font-display text-3xl font-extrabold tabular-nums leading-none text-emerald-900 dark:text-emerald-50">
                {consumed}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-500">
                / {target ?? "—"} kcal
              </p>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-emerald-700 uppercase dark:text-emerald-300">
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
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                💧 Su %{waterPct}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                <Flame className="h-3.5 w-3.5" fill="currentColor" />
                {streak} gün seri
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/plan"
          className="group relative mt-5 flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(106,166,33,0.8)] transition-[transform,filter] duration-200 ease-[var(--ease-out)] hover:brightness-105 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98]"
        >
          Planımı aç
          <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5" />
        </Link>
      </section>

      {/* ===== Tüm özellikler ===== */}
      <section className="reveal">
        <div className="mb-3 flex items-center gap-2 px-1">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200 dark:to-gray-800" />
          <span className="text-[11px] font-semibold tracking-[0.18em] text-gray-400 uppercase">
            Tüm özellikler
          </span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200 dark:to-gray-800" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.href}
                href={f.href}
                className="group relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-4 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none active:scale-[0.97] dark:border-gray-800 dark:bg-gray-900"
              >
                <span
                  className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white ${f.grad} ${f.glow} transition-transform duration-200 ease-[var(--ease-out)] group-hover:scale-105`}
                >
                  <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
                </span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {f.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {f.desc}
                  </p>
                </div>
                <ArrowRight className="absolute top-4 right-4 h-4 w-4 text-gray-300 transition-[transform,color] duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5 group-hover:text-gray-500 dark:text-gray-600" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* ===== Diyetisyen bul ===== */}
      <Link
        href="/diyetisyen-bul"
        className="reveal group flex items-center gap-4 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/50 p-4 transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] active:scale-[0.98] dark:border-amber-900/40 dark:from-amber-950/20 dark:to-orange-950/10"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_8px_20px_-8px_rgba(245,158,11,0.7)]">
          <Stethoscope className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-amber-900 dark:text-amber-100">
            Uzman diyetisyenle çalış
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-300/70">
            Sana en uygun uzmanı bul, randevu al
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-amber-600 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
