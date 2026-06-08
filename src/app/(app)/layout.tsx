import Link from "next/link";

import { logout } from "@/app/(auth)/actions";
import { BottomNav } from "@/components/app/bottom-nav";
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
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/40 bg-[var(--background)]/70 px-4 py-3 backdrop-blur-xl dark:border-white/10">
        <Link href="/panel" className="font-bold text-emerald-600">
          UzmanDiyet
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              {initial}
            </span>
            <span className="hidden text-gray-600 sm:inline dark:text-gray-300">
              {name}
            </span>
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg px-3 py-1.5 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Çıkış
            </button>
          </form>
        </div>
      </header>

      <main className="flex flex-1 flex-col pb-28">{children}</main>

      <BottomNav />
    </div>
  );
}
