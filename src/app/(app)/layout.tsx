import Link from "next/link";

import { logout } from "@/app/(auth)/actions";
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
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
        <Link href="/panel" className="font-bold text-emerald-600">
          DiyetChat
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

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="border-t border-gray-100 px-4 py-3 text-center text-xs text-gray-400 dark:border-gray-800">
        DiyetChat · Yapay zekâ destekli öneriler bilgilendirme amaçlıdır, tıbbi
        tavsiye yerine geçmez.
      </footer>
    </div>
  );
}
