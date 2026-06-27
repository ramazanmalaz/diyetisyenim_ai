import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { PlanBoard } from "@/components/plan/plan-board";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Plan yeniden üretimi (regeneratePlan) AI çağrıları yapar; varsayılan süreyi aşmasın.
export const maxDuration = 60;

export default async function PlanPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  // RLS sayesinde danışan yalnızca kendi planlarını görür.
  const { data: plan } = await supabase
    .from("diet_plans")
    .select(
      "id, title, status, daily_calorie_target, estimated_weeks, goal_loss_kg, valid_from, valid_to",
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: meals } = plan
    ? await supabase
        .from("meals")
        .select(
          "id, week_index, day_of_week, meal_type, content, calories, food_id, quantity, checked",
        )
        .eq("plan_id", plan.id)
    : { data: [] };

  const { data: foods } = await supabase
    .from("foods")
    .select("id, name, unit_label, kcal_per_unit")
    .order("name");

  // Bugünün su tüketimi (RLS: yalnızca kendi kaydı).
  const todayKey = new Date().toISOString().slice(0, 10);
  const { data: water } = await supabase
    .from("water_intake")
    .select("total_ml")
    .eq("day", todayKey)
    .maybeSingle();

  // Kullanıcının su ayarları (hedef + bardak miktarı + hatırlatıcı; varsayılanlar).
  const { data: prefs } = await supabase
    .from("profiles")
    .select("water_goal_ml, water_amount_ml, water_reminder_enabled")
    .maybeSingle();
  const waterGoalMl = prefs?.water_goal_ml ?? 2500;
  const waterGlassMl = prefs?.water_amount_ml ?? 200;
  const waterReminderEnabled = prefs?.water_reminder_enabled ?? true;

  // Son ~30 günün öğün günlüğü (tarih-bazlı yedim/atladım; RLS: kendi kaydı).
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceKey = since.toISOString().slice(0, 10);
  const { data: mealLogs } = plan
    ? await supabase
        .from("meal_logs")
        .select("meal_id, log_date, status")
        .gte("log_date", sinceKey)
    : { data: [] };

  const todayIdx = (new Date().getDay() + 6) % 7; // 0=Pzt ... 6=Paz

  // Çok-haftalık: saklanan farklı hafta sayısı + bugünün denk geldiği hafta.
  const rows = meals ?? [];
  const weekCount = Math.max(
    1,
    rows.reduce((mx, m) => Math.max(mx, (m.week_index ?? 0) + 1), 1),
  );
  const nowMs = new Date().getTime();
  const startMs = plan?.valid_from
    ? new Date(plan.valid_from).getTime()
    : nowMs;
  const weeksSinceStart = Math.max(
    0,
    Math.floor((nowMs - startMs) / (7 * 86_400_000)),
  );
  const currentWeek = weekCount > 0 ? weeksSinceStart % weekCount : 0;
  const totalWeeks =
    plan?.valid_from && plan?.valid_to
      ? Math.max(
          1,
          Math.round(
            (new Date(plan.valid_to).getTime() - startMs) / (7 * 86_400_000),
          ),
        )
      : weekCount;

  if (!plan) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <h1 className="reveal text-2xl font-bold">Henüz planın yok</h1>
        <p className="reveal text-sm text-gray-500 dark:text-gray-400">
          Diyet asistanınla birkaç soruyu yanıtla ya da hazır planını gir;
          kalorilerini hesaplayıp takip edelim.
        </p>
        <Link
          href="/baslangic"
          className="group reveal mt-1 inline-flex items-center gap-3 rounded-full bg-emerald-600 py-2.5 pr-2.5 pl-6 text-sm font-semibold text-white shadow-[0_1px_2px_rgb(7_40_29/0.2),0_12px_28px_-10px_rgb(11_109_72/0.6)] transition-[transform,box-shadow] duration-[400ms] ease-[var(--ease-drawer)] active:scale-[0.98]"
        >
          Diyete Başla
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-transform duration-[400ms] ease-[var(--ease-drawer)] group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105">
            <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div>
        <span className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-emerald-700 uppercase ring-1 ring-black/5 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-white/10">
          Program
        </span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          Diyet Planım
        </h1>
      </div>

      <PlanBoard
        planId={plan.id}
        foods={foods ?? []}
        initialMeals={meals ?? []}
        dailyTarget={plan.daily_calorie_target}
        goalLossKg={plan.goal_loss_kg}
        estimatedWeeks={plan.estimated_weeks}
        todayIdx={todayIdx}
        initialWaterMl={water?.total_ml ?? 0}
        weekCount={weekCount}
        initialWeek={currentWeek}
        totalWeeks={totalWeeks}
        validTo={plan.valid_to}
        userName={profile.full_name}
        todayDate={todayKey}
        initialLogs={mealLogs ?? []}
        waterGoalMl={waterGoalMl}
        waterGlassMl={waterGlassMl}
        waterReminderEnabled={waterReminderEnabled}
      />
    </div>
  );
}
