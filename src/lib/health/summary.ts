/**
 * Gelişim özeti — diyet (yenen kalori), spor (uygulama + Apple Sağlık
 * antrenmanları), hareket, uyku ve kiloyu tek dönemde birleştiren saf
 * hesaplar. DB/AI yok; sayfa ve AI değerlendirmesi aynı özeti kullanır.
 */

export type DayInput = {
  day: string; // YYYY-MM-DD
  consumedKcal: number | null; // planda "yedim" işaretlenen öğünler
  steps: number | null;
  activeKcal: number | null;
  sleepMinutes: number | null;
  restingHr: number | null;
};

export type WorkoutInput = {
  day: string;
  minutes: number;
  kcal: number | null;
  source: "app" | "health";
};

export type WeightInput = { day: string; kg: number };

export type PeriodSummary = {
  days: number;
  loggedDays: number; // yenen kalori kaydı olan gün
  avgConsumed: number | null;
  target: number | null;
  avgActive: number | null;
  avgNet: number | null; // yenen − aktif yakılan (ikisi de olan günler)
  avgSteps: number | null;
  workoutCount: number;
  workoutMinutes: number;
  activeDays: number; // antrenman ya da 7.000+ adım olan gün
  avgSleepHours: number | null;
  restingHrStart: number | null;
  restingHrEnd: number | null;
  weightStart: number | null;
  weightEnd: number | null;
  weightDelta: number | null;
  hasHealthData: boolean;
};

function avg(values: (number | null)[]): number | null {
  const v = values.filter((x): x is number => x != null && Number.isFinite(x));
  if (v.length === 0) return null;
  return v.reduce((s, x) => s + x, 0) / v.length;
}

function round(n: number | null, digits = 0): number | null {
  if (n == null) return null;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** İlk ve son yarının ortalaması — tek ölçümlük gürültüyü yumuşatır. */
function halves(values: (number | null)[]): [number | null, number | null] {
  const v = values.filter((x): x is number => x != null);
  if (v.length < 2) return [null, null];
  const mid = Math.ceil(v.length / 2);
  return [avg(v.slice(0, mid)), avg(v.slice(v.length - mid))];
}

export function summarizePeriod(
  days: DayInput[],
  workouts: WorkoutInput[],
  weights: WeightInput[],
  target: number | null,
): PeriodSummary {
  const sorted = [...days].sort((a, b) => a.day.localeCompare(b.day));
  const dayKeys = new Set(sorted.map((d) => d.day));
  const inRange = workouts.filter((w) => dayKeys.has(w.day));
  const workoutDays = new Set(inRange.map((w) => w.day));

  const consumedDays = sorted.filter(
    (d) => d.consumedKcal != null && d.consumedKcal > 0,
  );
  const net = sorted
    .filter((d) => d.consumedKcal && d.activeKcal != null)
    .map((d) => (d.consumedKcal ?? 0) - (d.activeKcal ?? 0));

  const [hrStart, hrEnd] = halves(sorted.map((d) => d.restingHr));

  const w = [...weights]
    .filter((x) => dayKeys.has(x.day))
    .sort((a, b) => a.day.localeCompare(b.day));
  const weightStart = w.length >= 2 ? w[0].kg : null;
  const weightEnd = w.length >= 1 ? w[w.length - 1].kg : null;

  return {
    days: sorted.length,
    loggedDays: consumedDays.length,
    avgConsumed: round(avg(consumedDays.map((d) => d.consumedKcal))),
    target,
    avgActive: round(avg(sorted.map((d) => d.activeKcal))),
    avgNet: round(avg(net)),
    avgSteps: round(avg(sorted.map((d) => d.steps))),
    workoutCount: inRange.length,
    workoutMinutes: Math.round(inRange.reduce((s, x) => s + x.minutes, 0)),
    activeDays: sorted.filter(
      (d) => workoutDays.has(d.day) || (d.steps ?? 0) >= 7000,
    ).length,
    avgSleepHours: round(
      avg(sorted.map((d) => (d.sleepMinutes ? d.sleepMinutes / 60 : null))),
      1,
    ),
    restingHrStart: round(hrStart),
    restingHrEnd: round(hrEnd),
    weightStart,
    weightEnd,
    weightDelta:
      weightStart != null && weightEnd != null
        ? round(weightEnd - weightStart, 1)
        : null,
    hasHealthData: sorted.some(
      (d) => d.steps != null || d.activeKcal != null || d.sleepMinutes != null,
    ),
  };
}

/** Bugün dahil geriye doğru `count` günün anahtarları (eskiden yeniye). */
export function lastDays(todayKey: string, count: number): string[] {
  const base = new Date(`${todayKey}T00:00:00Z`).getTime();
  return Array.from({ length: count }, (_, i) =>
    new Date(base - (count - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  );
}

/** ISO zaman damgasının İstanbul günü. */
export function istanbulDay(iso: string): string {
  return new Date(new Date(iso).getTime() + 3 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
}
