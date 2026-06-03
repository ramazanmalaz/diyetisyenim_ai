import Link from "next/link";

import { logout } from "@/app/(auth)/actions";
import { requireProfile } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <Link href="/panel" className="font-bold text-emerald-600">
          DiyetChat
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">
            {profile.full_name ?? "Danışan"}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Çıkış
            </button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
