import {
  Activity,
  Dumbbell,
  Footprints,
  HeartPulse,
  Moon,
  Scale,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

import { HealthConnect } from "@/components/health/health-connect";
import { ProgressReview } from "@/components/health/progress-review";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { requireProfile } from "@/lib/auth";
import { istanbulNow } from "@/lib/group-assistant/schedule";
import { loadProgressData } from "@/lib/health/load";
import { lastDays, summarizePeriod, type DayInput } from "@/lib/health/summary";
import { workoutLabel } from "@/lib/health/workout-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata = { title: "Gelişimim — UzmanDiyet" };

const fmt = (n: number | null, digits = 0) =>
  n == null
    ? "–"
    : n.toLocaleString("tr-TR", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      });

export default async function GelisimPage({
  searchParams,
}: {
  searchParams: Promise<{ donem?: string }>;
}) {
  const profile = await requireProfile();
  const { donem } = await searchParams;
  const period: 7 | 30 = donem === "30" ? 30 : 7;

  const supabase = await createClient();
  const dayKeys = lastDays(istanbulNow().date, period);
  const [data, { data: recentWorkouts }] = await Promise.all([
    loadProgressData(supabase, profile.id, dayKeys),
    supabase
      .from("health_workouts")
      .select("id, workout_type, started_at, duration_min, kcal, source")
      .eq("client_id", profile.id)
      .order("started_at", { ascending: false })
      .limit(5),
  ]);
  const s = summarizePeriod(
    data.days,
    data.workouts,
    data.weights,
    data.target,
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-emerald-700 uppercase ring-1 ring-black/5 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-white/10">
            Diyet + spor + sağlık
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
            Gelişimim
          </h1>
        </div>
        <nav
          aria-label="Dönem"
          className="flex rounded-full bg-gray-100 p-1 dark:bg-gray-800"
        >
          {([7, 30] as const).map((p) => (
            <Link
              key={p}
              href={p === 7 ? "/gelisim" : "/gelisim?donem=30"}
              aria-current={period === p ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-[background-color,color] duration-200 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-emerald-500",
                period === p
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400",
              )}
            >
              {p} gün
            </Link>
          ))}
        </nav>
      </div>

      <HealthConnect
        connected={data.healthConnected}
        syncedAt={data.healthSyncedAt}
      />

      <EnergyBalance s={s} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          icon={Footprints}
          tint="from-sky-400 to-cyan-600"
          label="Günlük adım"
          value={fmt(s.avgSteps)}
          hint={s.avgSteps == null ? "Apple Sağlık'tan gelir" : "ortalama"}
        />
        <Stat
          icon={Dumbbell}
          tint="from-lime-400 to-green-600"
          label="Antrenman"
          value={`${s.workoutCount}`}
          hint={`${s.workoutMinutes} dk toplam`}
        />
        <Stat
          icon={Activity}
          tint="from-amber-400 to-orange-500"
          label="Aktif gün"
          value={`${s.activeDays}/${s.days}`}
          hint="antrenman ya da 7.000+ adım"
        />
        <Stat
          icon={Moon}
          tint="from-indigo-400 to-violet-600"
          label="Uyku"
          value={
            s.avgSleepHours == null ? "–" : `${fmt(s.avgSleepHours, 1)} sa`
          }
          hint={
            s.avgSleepHours == null
              ? "Apple Sağlık'tan gelir"
              : "gecelik ortalama"
          }
        />
        <Stat
          icon={HeartPulse}
          tint="from-rose-400 to-pink-600"
          label="Dinlenik nabız"
          value={s.restingHrEnd == null ? "–" : `${s.restingHrEnd}`}
          hint={
            s.restingHrStart != null && s.restingHrEnd != null
              ? `dönem başı ${s.restingHrStart} bpm`
              : "Apple Watch'tan gelir"
          }
        />
        <Stat
          icon={Scale}
          tint="from-emerald-400 to-emerald-600"
          label="Kilo"
          value={
            s.weightDelta != null
              ? `${s.weightDelta > 0 ? "+" : ""}${fmt(s.weightDelta, 1)} kg`
              : s.weightEnd != null
                ? `${fmt(s.weightEnd, 1)} kg`
                : "–"
          }
          hint={
            s.weightDelta != null
              ? `${fmt(s.weightStart, 1)} → ${fmt(s.weightEnd, 1)} kg`
              : "bu dönemde tek tartı yok"
          }
        />
      </div>

      <DailyChart days={data.days} target={s.target} />

      {(recentWorkouts ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-semibold tracking-[0.14em] text-gray-400 uppercase">
            Son antrenmanlar
          </h2>
          <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200/80 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
            {(recentWorkouts ?? []).map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">{workoutLabel(w.workout_type)}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {new Date(w.started_at).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      weekday: "short",
                      timeZone: "Europe/Istanbul",
                    })}
                    {w.source ? ` · ${w.source}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-right tabular-nums">
                  {Math.round(Number(w.duration_min))} dk
                  {w.kcal != null && (
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {w.kcal} kcal
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ProgressReview period={period} />

      <MedicalDisclaimer />
    </div>
  );
}

function EnergyBalance({ s }: { s: ReturnType<typeof summarizePeriod> }) {
  const max = Math.max(s.target ?? 0, s.avgConsumed ?? 0, 1);
  const pct = (n: number | null) => `${Math.min(100, ((n ?? 0) / max) * 100)}%`;
  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[var(--shadow-soft)] dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">Kalori dengesi</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          günlük ortalama
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <Bar
          label="Yenen"
          value={s.avgConsumed}
          width={pct(s.avgConsumed)}
          color="bg-emerald-500"
          note={
            s.loggedDays === 0
              ? "Planında öğünleri işaretledikçe dolar"
              : `${s.loggedDays}/${s.days} gün işaretli`
          }
          marker={s.target ? pct(s.target) : null}
        />
        <Bar
          label="Hareketle yakılan"
          value={s.avgActive}
          width={pct(s.avgActive)}
          color="bg-orange-400"
          note={s.avgActive == null ? "Apple Sağlık'tan gelir" : "aktif enerji"}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {s.target != null && (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            Hedef {fmt(s.target)} kcal
          </span>
        )}
        {s.avgNet != null && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            Yenen − yakılan: {fmt(s.avgNet)} kcal
          </span>
        )}
      </div>
    </section>
  );
}

function Bar({
  label,
  value,
  width,
  color,
  note,
  marker = null,
}: {
  label: string;
  value: number | null;
  width: string;
  color: string;
  note: string;
  marker?: string | null;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">
          {fmt(value)} <span className="text-xs text-gray-500">kcal</span>
        </span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className={cn("h-full rounded-full", color)} style={{ width }} />
        {marker && (
          <span
            aria-hidden
            className="absolute top-0 h-full w-0.5 bg-gray-900/40 dark:bg-white/50"
            style={{ left: marker }}
          />
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{note}</p>
    </div>
  );
}

function Stat({
  icon: Icon,
  tint,
  label,
  value,
  hint,
}: {
  icon: ComponentType<LucideProps>;
  tint: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-[var(--shadow-soft)] dark:border-gray-800 dark:bg-gray-900">
      <span
        className={cn(
          "grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br text-white",
          tint,
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-gray-400">{hint}</p>
    </div>
  );
}

/** Gün gün yenen (yeşil) ve hareketle yakılan (turuncu) kalori. */
function DailyChart({
  days,
  target,
}: {
  days: DayInput[];
  target: number | null;
}) {
  const hasAny = days.some((d) => d.consumedKcal || d.activeKcal);
  if (!hasAny) return null;
  const max = Math.max(
    target ?? 0,
    ...days.map((d) => Math.max(d.consumedKcal ?? 0, d.activeKcal ?? 0)),
    1,
  );
  const dense = days.length > 10;
  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[var(--shadow-soft)] dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">Gün gün</h2>
        <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Yenen
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-orange-400" /> Yakılan
          </span>
        </div>
      </div>
      <div
        className="relative mt-4 flex h-36 items-end gap-1"
        role="img"
        aria-label="Günlük yenen ve yakılan kalori grafiği"
      >
        {target != null && (
          <span
            aria-hidden
            className="absolute inset-x-0 border-t border-dashed border-gray-300 dark:border-gray-700"
            style={{ bottom: `${(target / max) * 100}%` }}
          />
        )}
        {days.map((d) => (
          <div
            key={d.day}
            className="flex h-full flex-1 items-end justify-center gap-px"
          >
            <span
              className="w-full max-w-3 rounded-t bg-emerald-500"
              style={{ height: `${((d.consumedKcal ?? 0) / max) * 100}%` }}
            />
            <span
              className="w-full max-w-3 rounded-t bg-orange-400"
              style={{ height: `${((d.activeKcal ?? 0) / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1 text-center text-[10px] text-gray-400">
        {days.map((d, i) => (
          <span key={d.day} className="flex-1">
            {!dense || i % 5 === 0 || i === days.length - 1
              ? new Date(`${d.day}T12:00:00Z`).toLocaleDateString(
                  "tr-TR",
                  dense ? { day: "numeric" } : { weekday: "short" },
                )
              : ""}
          </span>
        ))}
      </div>
    </section>
  );
}
