import {
  CalendarClock,
  ChevronRight,
  MapPin,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { DietitianAvatar } from "@/components/dietitians/dietitian-avatar";
import { requireProfile } from "@/lib/auth";
import {
  appointmentWhatsappUrl,
  PUBLIC_DIETITIAN_COLUMNS,
  type PublicDietitian,
} from "@/lib/dietitians";
import { createClient } from "@/lib/supabase/server";

export default async function DiyetisyenBulPage() {
  await requireProfile();
  const supabase = await createClient();

  const [{ data }, { count: apptCount }] = await Promise.all([
    supabase
      .from("dietitians")
      .select(PUBLIC_DIETITIAN_COLUMNS)
      .eq("is_active", true)
      .order("featured", { ascending: false })
      .order("sort_order"),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("scheduled_at", new Date().toISOString()),
  ]);

  const dietitians = (data ?? []) as PublicDietitian[];
  const upcoming = apptCount ?? 0;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-8">
      <div>
        <Link href="/panel" className="text-sm text-gray-400 hover:underline">
          ← Ana sayfa
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Diyetisyen Bul</h1>
        <p className="text-sm text-gray-500">
          Sana uygun uzmanı seç, profilini incele ve randevu al.
        </p>
      </div>

      {/* Randevularım erişimi */}
      <Link
        href="/randevu"
        className="flex items-center gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/50 px-4 py-3 transition hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
          <CalendarClock className="h-5 w-5" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-emerald-900 dark:text-emerald-100">
            Randevularım
          </span>
          <span className="block text-xs text-emerald-700/80 dark:text-emerald-300/70">
            {upcoming > 0
              ? `${upcoming} yaklaşan randevun var`
              : "Randevularını görüntüle ve yönet"}
          </span>
        </span>
        {upcoming > 0 && (
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-emerald-600 px-1.5 text-xs font-bold text-white">
            {upcoming}
          </span>
        )}
        <ChevronRight className="h-5 w-5 shrink-0 text-emerald-600/60" />
      </Link>

      {/* Diyetisyen listesi */}
      <div className="space-y-2.5">
        <h2 className="px-1 text-xs font-semibold tracking-[0.14em] text-gray-400 uppercase">
          {dietitians.length} uzman diyetisyen
        </h2>

        {dietitians.length === 0 ? (
          <p className="rounded-2xl border border-gray-200 bg-white/60 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900/50">
            Şu an müsait diyetisyen bulunmuyor. Lütfen daha sonra tekrar bak.
          </p>
        ) : (
          <ul className="space-y-3">
            {dietitians.map((d) => (
              <li
                key={d.id}
                className={
                  "overflow-hidden rounded-3xl border bg-white shadow-[var(--shadow-soft)] dark:bg-gray-900 " +
                  (d.featured
                    ? "border-emerald-300 ring-1 ring-emerald-200 dark:border-emerald-800"
                    : "border-gray-200 dark:border-gray-800")
                }
              >
                <Link
                  href={`/diyetisyenler/${d.id}`}
                  className="flex items-start gap-4 p-4 transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                >
                  <DietitianAvatar
                    name={d.full_name}
                    photoUrl={d.photo_url}
                    className="h-16 w-16"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{d.full_name}</p>
                      {d.featured && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                          <Sparkles className="h-3 w-3" /> Öne çıkan
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                      {d.title}
                      {d.years_experience
                        ? ` · ${d.years_experience} yıl deneyim`
                        : ""}
                    </p>
                    {d.city && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" /> {d.city}
                      </p>
                    )}
                    {d.specialties.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {d.specialties.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
                <a
                  href={appointmentWhatsappUrl(d.full_name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 border-t border-gray-100 bg-emerald-50/60 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100/70 dark:border-gray-800 dark:bg-emerald-950/20 dark:text-emerald-300"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp&apos;tan randevu al
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
