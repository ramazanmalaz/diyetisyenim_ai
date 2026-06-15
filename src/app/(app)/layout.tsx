import { Crown, LogOut, Salad } from "lucide-react";
import Link from "next/link";

import { logout } from "@/app/(auth)/actions";
import { BottomNav } from "@/components/app/bottom-nav";
import { PushSetup } from "@/components/app/push-setup";
import { WaterReminder } from "@/components/app/water-reminder";
import { requireProfile } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const name = profile.full_name ?? "Danışan";
  const initial = name.trim().charAt(0).toUpperCase() || "D";

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

      <BottomNav />
      <WaterReminder />
      <PushSetup />
    </div>
  );
}
