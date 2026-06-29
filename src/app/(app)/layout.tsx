import { Crown, LogOut, Salad, Settings } from "lucide-react";
import Link from "next/link";

import { logout } from "@/app/(auth)/actions";
import { AudioArmer } from "@/components/app/audio-armer";
import { BottomNav } from "@/components/app/bottom-nav";
import { PremiumWall } from "@/components/app/premium-wall";
import { MealReminder } from "@/components/app/meal-reminder";
import { PushSetup } from "@/components/app/push-setup";
import { WaterReminder } from "@/components/app/water-reminder";
import { requireProfile } from "@/lib/auth";
import { getPricing } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const name = profile.full_name ?? "Danışan";
  const initial = name.trim().charAt(0).toUpperCase() || "D";
  const pricing = await getPricing();

  // Su hatırlatıcısı program/miktar ayarları (RLS: yalnızca kendi satırı).
  const supabase = await createClient();
  const { data: waterCfg } = await supabase
    .from("profiles")
    .select(
      "water_reminder_enabled, water_start_hour, water_end_hour, water_interval_hours, water_amount_ml, meal_reminders_enabled, breakfast_time, lunch_time, dinner_time",
    )
    .maybeSingle();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Yüzen cam ada — tepeye yapışık değil; alt nav ile aynı dil. */}
      <header className="sticky top-0 z-30 px-4 pt-3">
        <div className="glass mx-auto flex max-w-2xl items-center justify-between rounded-full py-2 pr-2 pl-4 shadow-[var(--shadow-soft)] ring-1 ring-black/5 dark:ring-white/10">
          <Link
            href="/panel"
            className="flex items-center gap-2 text-sm font-bold tracking-tight text-emerald-700 transition-opacity duration-200 ease-[var(--ease-out)] hover:opacity-80 dark:text-emerald-300"
          >
            <Salad className="h-4 w-4" strokeWidth={1.5} /> UzmanDiyet
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/abonelik"
              aria-label="Premium"
              className="flex h-9 items-center gap-1.5 rounded-full bg-amber-100 px-3 text-xs font-semibold text-amber-700 transition-[background-color,transform] duration-200 ease-[var(--ease-out)] hover:bg-amber-200 active:scale-[0.96] dark:bg-amber-950/40 dark:text-amber-300"
            >
              <Crown className="h-4 w-4" strokeWidth={1.75} /> Premium
            </Link>
            <span className="flex items-center gap-2">
              <span className="hidden text-gray-600 sm:inline dark:text-gray-300">
                {name}
              </span>
              {/* Avatar — double-bezel: dış halka + iç çekirdek */}
              <span className="rounded-full bg-white/60 p-[2px] ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  {initial}
                </span>
              </span>
            </span>
            <Link
              href="/ayarlar"
              aria-label="Bildirim ayarları"
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-[background-color,color,transform] duration-200 ease-[var(--ease-out)] hover:bg-black/5 hover:text-gray-600 active:scale-[0.94] dark:hover:bg-white/5"
            >
              <Settings className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </Link>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Çıkış"
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-[background-color,color,transform] duration-200 ease-[var(--ease-out)] hover:bg-black/5 hover:text-gray-600 active:scale-[0.94] dark:hover:bg-white/5"
              >
                <LogOut className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col pb-28">{children}</main>

      <BottomNav isAdmin={profile.role === "admin" || profile.role === "dietitian"} />
      <WaterReminder
        enabled={waterCfg?.water_reminder_enabled ?? true}
        startHour={waterCfg?.water_start_hour ?? 10}
        endHour={waterCfg?.water_end_hour ?? 20}
        intervalHours={waterCfg?.water_interval_hours ?? 2}
        amountMl={waterCfg?.water_amount_ml ?? 200}
      />
      <MealReminder
        enabled={waterCfg?.meal_reminders_enabled ?? false}
        breakfast={waterCfg?.breakfast_time ?? "08:00"}
        lunch={waterCfg?.lunch_time ?? "13:00"}
        dinner={waterCfg?.dinner_time ?? "19:00"}
      />
      <PushSetup />
      <AudioArmer />
      <PremiumWall monthlyPrice={pricing.monthly.price} />
    </div>
  );
}
