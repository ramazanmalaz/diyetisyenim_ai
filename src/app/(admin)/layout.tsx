import { Smartphone } from "lucide-react";
import Link from "next/link";

import { logout } from "@/app/(auth)/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireStaff } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireStaff();
  const isAdmin = profile.role === "admin";
  const name = profile.full_name ?? "Diyetisyen";
  const initial = name.trim().charAt(0).toUpperCase() || "D";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
        <Link href="/yonetim" className="font-bold text-emerald-600">
          UzmanDiyet · {isAdmin ? "Yönetim" : "Diyetisyen"}
        </Link>
        <div className="flex items-center gap-2 text-sm">
          {/* Danışan arayüzü — sohbet buraya düşürüyor, geri dönüş için gerekli */}
          <Link
            href="/panel"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Uygulama görünümü"
          >
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Uygulama</span>
          </Link>
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
      <AdminNav isAdmin={isAdmin} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
