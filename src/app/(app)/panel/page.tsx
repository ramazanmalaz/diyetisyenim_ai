import {
  Camera,
  Droplets,
  LineChart,
  MessageCircle,
  Timer,
  UtensilsCrossed,
} from "lucide-react";

import { HomeChoices } from "@/components/app/home-choices";
import { HomeDashboard } from "@/components/app/home-dashboard";
import { requireProfile } from "@/lib/auth";
import { computeStreak } from "@/lib/plan/streak";
import { createClient } from "@/lib/supabase/server";

const FEATURES = [
  { icon: UtensilsCrossed, label: "Kişiye özel plan" },
  { icon: MessageCircle, label: "AI asistan" },
  { icon: Camera, label: "Tabak analizi" },
  { icon: Droplets, label: "Su takibi" },
  { icon: LineChart, label: "İlerleme grafiği" },
  { icon: Timer, label: "Odak (pomodoro)" },
];

function greetingFor(hourTr: number): string {
  if (hourTr >= 5 && hourTr < 11) return "Günaydın";
  if (hourTr >= 11 && hourTr < 18) return "İyi günler";
  if (hourTr >= 18 && hourTr < 23) return "İyi akşamlar";
  return "İyi geceler";
}

export default async function PanelPage() {
  const profile = await requireProfile();
  const firstName = (profile.full_name ?? "").trim().split(" ")[0];
  const supabase = await createClient();

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const hourTr =
    (new Date(now.getTime() + 3 * 3600 * 1000).getUTCHours() + 24) % 24;
  const greeting = greetingFor(hourTr);

  // Aktif plan (hedef kalori).
  const { data: plan } = await supabase
    .from("diet_plans")
    .select("daily_calorie_target")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasPlan = Boolean(plan);

  // Plan varsa bugünün özetini hazırla.
  let consumed = 0;
  let waterMl = 0;
  let waterGoal = 2500;
  let streak = 0;

  if (hasPlan) {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceKey = since.toISOString().slice(0, 10);

    const [
      { data: eatenRows },
      { data: water },
      { data: prefs },
      { data: logs },
    ] = await Promise.all([
      supabase
        .from("meal_logs")
        .select("meal_id")
        .eq("log_date", todayKey)
        .eq("status", "eaten"),
      supabase
        .from("water_intake")
        .select("total_ml")
        .eq("day", todayKey)
        .maybeSingle(),
      supabase.from("profiles").select("water_goal_ml").maybeSingle(),
      supabase
        .from("meal_logs")
        .select("log_date")
        .eq("status", "eaten")
        .gte("log_date", sinceKey),
    ]);

    // Bugün yenen öğünlerin kalorisini topla.
    const eatenIds = (eatenRows ?? []).map((r) => r.meal_id);
    if (eatenIds.length > 0) {
      const { data: mealRows } = await supabase
        .from("meals")
        .select("calories")
        .in("id", eatenIds);
      consumed = (mealRows ?? []).reduce((s, m) => s + (m.calories ?? 0), 0);
    }
    waterMl = water?.total_ml ?? 0;
    waterGoal = prefs?.water_goal_ml ?? 2500;
    const dates = new Set((logs ?? []).map((l) => l.log_date));
    streak = computeStreak(dates, todayKey);
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-7 px-4 py-8">
      {/* Selam */}
      <div className="reveal">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {greeting} 👋
        </p>
        <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight">
          {firstName || "Hoş geldin"}
        </h1>
        {!hasPlan && (
          <p className="mt-1.5 text-gray-500 dark:text-gray-400">
            Nasıl ilerlemek istersin? İki yol da bir mesaj penceresi kadar yakın.
          </p>
        )}
      </div>

      {hasPlan ? (
        <HomeDashboard
          consumed={consumed}
          target={plan?.daily_calorie_target ?? null}
          waterMl={waterMl}
          waterGoal={waterGoal}
          streak={streak}
        />
      ) : (
        <>
          <HomeChoices />

          {/* Neler var? */}
          <div className="reveal rounded-3xl border border-gray-200 bg-white/60 p-5 dark:border-gray-800 dark:bg-gray-900/50">
            <p className="text-center text-xs font-semibold tracking-[0.16em] text-gray-400 uppercase">
              Uygulamada neler var
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.label}
                    className="flex flex-col items-center gap-2 text-center"
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                      {f.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
