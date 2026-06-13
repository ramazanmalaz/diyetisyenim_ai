import { PomodoroTimer } from "@/components/app/pomodoro-timer";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Odak (Pomodoro) — UzmanDiyet",
};

export default async function PomodoroPage() {
  await requireProfile();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("pomodoro_plans")
    .select(
      "start_min, end_min, work_min, break_min, muted, completed_sessions",
    )
    .eq("plan_date", today)
    .maybeSingle();

  return <PomodoroTimer initialPlan={data ?? null} />;
}
