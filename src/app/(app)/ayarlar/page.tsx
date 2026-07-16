import { DeleteAccountSection } from "@/components/app/delete-account-section";
import { NotificationSettings } from "@/components/app/notification-settings";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select(
      "water_reminder_enabled, water_start_hour, water_end_hour, water_interval_hours, water_amount_ml, water_goal_ml, meal_reminders_enabled, breakfast_time, lunch_time, dinner_time, pomodoro_reminders_enabled",
    )
    .maybeSingle();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div>
        <span className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-emerald-700 uppercase ring-1 ring-black/5 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-white/10">
          Ayarlar
        </span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          Bildirimler
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Hangi hatırlatmaları almak istediğini buradan yönet.
        </p>
      </div>

      <NotificationSettings
        water={data?.water_reminder_enabled ?? true}
        waterStart={data?.water_start_hour ?? 10}
        waterEnd={data?.water_end_hour ?? 20}
        waterInterval={data?.water_interval_hours ?? 2}
        waterAmount={data?.water_amount_ml ?? 200}
        waterGoal={data?.water_goal_ml ?? 2500}
        meals={data?.meal_reminders_enabled ?? false}
        breakfast={data?.breakfast_time ?? "08:00"}
        lunch={data?.lunch_time ?? "13:00"}
        dinner={data?.dinner_time ?? "19:00"}
        pomodoro={data?.pomodoro_reminders_enabled ?? true}
      />

      <DeleteAccountSection />
    </div>
  );
}
