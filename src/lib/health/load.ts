import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { WorkoutProgram } from "@/lib/workout";

import {
  istanbulDay,
  type DayInput,
  type WeightInput,
  type WorkoutInput,
} from "./summary";

type Client = SupabaseClient<Database>;

/** Uygulamadaki öğün kayıtlarından gün gün yenen kalori ("yedim" işaretliler). */
export async function consumedByDay(
  supabase: Client,
  userId: string,
  from: string,
  to: string,
): Promise<Map<string, number>> {
  const { data: logs } = await supabase
    .from("meal_logs")
    .select("meal_id, log_date")
    .eq("client_id", userId)
    .eq("status", "eaten")
    .gte("log_date", from)
    .lte("log_date", to);
  const out = new Map<string, number>();
  if (!logs || logs.length === 0) return out;

  const ids = [...new Set(logs.map((l) => l.meal_id))];
  const { data: meals } = await supabase
    .from("meals")
    .select("id, calories")
    .in("id", ids);
  const kcal = new Map((meals ?? []).map((m) => [m.id, m.calories ?? 0]));
  for (const l of logs) {
    out.set(
      l.log_date,
      (out.get(l.log_date) ?? 0) + (kcal.get(l.meal_id) ?? 0),
    );
  }
  return out;
}

// Programda süre yok; set başına ~2 dk (çalışma + dinlenme) varsayılır.
const MIN_PER_SET = 2;

export type ProgressData = {
  days: DayInput[];
  workouts: WorkoutInput[];
  weights: WeightInput[];
  target: number | null;
  healthConnected: boolean;
  healthSyncedAt: string | null;
};

export async function loadProgressData(
  supabase: Client,
  userId: string,
  dayKeys: string[],
): Promise<ProgressData> {
  const from = dayKeys[0];
  const to = dayKeys[dayKeys.length - 1];

  const [
    consumed,
    { data: health },
    { data: hWorkouts },
    { data: appLogs },
    { data: workoutPlan },
    { data: weights },
    { data: plan },
    { data: profile },
  ] = await Promise.all([
    consumedByDay(supabase, userId, from, to),
    supabase
      .from("health_daily")
      .select("day, steps, active_kcal, sleep_minutes, resting_hr")
      .eq("client_id", userId)
      .gte("day", from)
      .lte("day", to),
    supabase
      .from("health_workouts")
      .select("started_at, duration_min, kcal")
      .eq("client_id", userId)
      // İstanbul günü UTC'de 3 saat önce başlar.
      .gte("started_at", `${from}T00:00:00+03:00`)
      .lte("started_at", `${to}T23:59:59+03:00`),
    supabase
      .from("workout_logs")
      .select("day_index, log_date")
      .eq("client_id", userId)
      .gte("log_date", from)
      .lte("log_date", to),
    supabase
      .from("workout_plans")
      .select("program")
      .eq("client_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("progress_entries")
      .select("entry_date, weight_kg")
      .eq("client_id", userId)
      .not("weight_kg", "is", null)
      .gte("entry_date", from)
      .lte("entry_date", to)
      .order("created_at", { ascending: true }),
    supabase
      .from("diet_plans")
      .select("daily_calorie_target")
      .eq("client_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("health_connected_at, health_synced_at")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const healthByDay = new Map((health ?? []).map((h) => [h.day, h]));
  const days: DayInput[] = dayKeys.map((day) => {
    const h = healthByDay.get(day);
    return {
      day,
      consumedKcal: consumed.get(day) ?? null,
      steps: h?.steps ?? null,
      activeKcal: h?.active_kcal ?? null,
      sleepMinutes: h?.sleep_minutes ?? null,
      restingHr: h?.resting_hr ?? null,
    };
  });

  const program = (workoutPlan?.program ?? null) as WorkoutProgram | null;
  const appWorkouts: WorkoutInput[] = (appLogs ?? []).map((l) => {
    const sets =
      program?.days?.[l.day_index]?.exercises?.reduce(
        (s, e) => s + (e.sets ?? 0),
        0,
      ) ?? 15;
    return {
      day: l.log_date,
      minutes: Math.min(90, sets * MIN_PER_SET),
      kcal: null,
      source: "app",
    };
  });
  const healthWorkouts: WorkoutInput[] = (hWorkouts ?? []).map((w) => ({
    day: istanbulDay(w.started_at),
    minutes: Number(w.duration_min),
    kcal: w.kcal,
    source: "health",
  }));

  // Aynı gün birden çok tartı varsa sonuncusu.
  const weightByDay = new Map<string, number>();
  for (const w of weights ?? [])
    weightByDay.set(w.entry_date, Number(w.weight_kg));

  return {
    days,
    workouts: [...appWorkouts, ...healthWorkouts],
    weights: [...weightByDay].map(([day, kg]) => ({ day, kg })),
    target: plan?.daily_calorie_target ?? null,
    healthConnected: Boolean(profile?.health_connected_at),
    healthSyncedAt: profile?.health_synced_at ?? null,
  };
}
