import { redirect } from "next/navigation";

import { WorkoutBoard } from "@/components/workout/workout-board";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { WorkoutProgram } from "@/lib/workout";

export const metadata = { title: "Spor Asistanı — UzmanDiyet" };

export default async function SporPage() {
  await requireProfile();
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("workout_plans")
    .select("id, mode, level, goal, days_per_week, program, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan) redirect("/spor/baslangic");

  const todayKey = new Date().toISOString().slice(0, 10);
  const { data: logs } = await supabase
    .from("workout_logs")
    .select("day_index, exercise_index, log_date")
    .eq("log_date", todayKey);

  return (
    <WorkoutBoard
      program={plan.program as unknown as WorkoutProgram}
      mode={plan.mode}
      level={plan.level}
      goal={plan.goal}
      daysPerWeek={plan.days_per_week}
      todayDate={todayKey}
      initialLogs={logs ?? []}
    />
  );
}
