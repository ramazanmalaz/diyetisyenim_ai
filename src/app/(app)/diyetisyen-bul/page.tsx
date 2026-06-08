import { CalendarClock, Users } from "lucide-react";
import Link from "next/link";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DiyetisyenBulPage() {
  await requireProfile();
  const supabase = await createClient();

  // Aktif diyetisyen sayısı ve yaklaşan randevu sayısı (özet rozetler).
  const [{ count: dietitianCount }, { count: apptCount }] = await Promise.all([
    supabase
      .from("dietitians")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("scheduled_at", new Date().toISOString()),
  ]);

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-10">
      <div>
        <Link href="/panel" className="text-sm text-gray-400 hover:underline">
          ← Ana sayfa
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Diyetisyen Bul</h1>
        <p className="text-sm text-gray-500">
          Uzman diyetisyenleri incele ve randevularını buradan yönet.
        </p>
      </div>

      <div className="grid gap-4">
        <Link
          href="/diyetisyenler"
          className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-[var(--shadow-float)] transition hover:brightness-105"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <Users className="h-7 w-7" />
          </span>
          <span>
            <span className="block text-lg font-bold">Diyetisyenler</span>
            <span className="mt-0.5 block text-sm text-white/85">
              {dietitianCount ?? 0} uzman diyetisyeni incele ve randevu al.
            </span>
          </span>
        </Link>

        <Link
          href="/randevu"
          className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-600 p-5 text-white shadow-[var(--shadow-float)] transition hover:brightness-105"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <CalendarClock className="h-7 w-7" />
          </span>
          <span>
            <span className="block text-lg font-bold">Randevularım</span>
            <span className="mt-0.5 block text-sm text-white/90">
              {apptCount && apptCount > 0
                ? `${apptCount} yaklaşan randevun var.`
                : "Randevularını görüntüle ve yönet."}
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
