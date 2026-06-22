import { CalendarClock, CalendarPlus, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

import { cancelAppointment } from "@/app/(app)/randevu/actions";
import { DietitianAvatar } from "@/components/dietitians/dietitian-avatar";
import {
  APPOINTMENT_STATUS_LABEL,
  formatDateTime,
  googleCalendarUrl,
} from "@/lib/appointments";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus } from "@/types/database";

type Row = {
  id: string;
  scheduled_at: string;
  status: AppointmentStatus;
  notes: string | null;
  dietitians: {
    full_name: string;
    title: string;
    photo_url: string | null;
  } | null;
};

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  requested:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  confirmed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  completed: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
};

function AppointmentCard({ a, past }: { a: Row; past: boolean }) {
  const active = a.status === "requested" || a.status === "confirmed";
  return (
    <li
      className={
        "flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-[var(--shadow-soft)] dark:bg-gray-900 " +
        (past
          ? "border-gray-200 opacity-90 dark:border-gray-800"
          : "border-emerald-200/70 dark:border-emerald-900/40")
      }
    >
      {a.dietitians && (
        <DietitianAvatar
          name={a.dietitians.full_name}
          photoUrl={a.dietitians.photo_url}
          className="h-12 w-12"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold">{a.dietitians?.full_name ?? "Randevu"}</p>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[a.status]}`}
          >
            {APPOINTMENT_STATUS_LABEL[a.status]}
          </span>
        </div>
        {a.dietitians?.title && (
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            {a.dietitians.title}
          </p>
        )}
        <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
          <Clock className="h-4 w-4 text-gray-400" />
          {formatDateTime(a.scheduled_at)}
        </p>
        {a.notes && (
          <p className="mt-1 text-xs text-gray-500">{a.notes}</p>
        )}

        {active && (
          <div className="mt-2.5 flex items-center gap-4">
            <a
              href={googleCalendarUrl(
                `UzmanDiyet — ${a.dietitians?.full_name ?? "Diyetisyen"} randevusu`,
                a.scheduled_at,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline"
            >
              <CalendarPlus className="h-3.5 w-3.5" /> Takvime ekle
            </a>
            <form action={cancelAppointment}>
              <input type="hidden" name="id" value={a.id} />
              <button
                type="submit"
                className="text-xs font-medium text-red-600 hover:underline"
              >
                İptal et
              </button>
            </form>
          </div>
        )}
      </div>
    </li>
  );
}

export default async function RandevuPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  await requireProfile();
  const supabase = await createClient();

  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "id, scheduled_at, status, notes, dietitians:dietitian_ref(full_name, title, photo_url)",
    )
    .order("scheduled_at", { ascending: false });

  const rows = (appointments ?? []) as unknown as Row[];
  const now = new Date().getTime();
  const upcoming = rows
    .filter(
      (a) =>
        new Date(a.scheduled_at).getTime() >= now &&
        (a.status === "requested" || a.status === "confirmed"),
    )
    .sort(
      (x, y) =>
        new Date(x.scheduled_at).getTime() - new Date(y.scheduled_at).getTime(),
    );
  const past = rows.filter((a) => !upcoming.includes(a));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Randevularım</h1>
          <p className="text-sm text-gray-500">
            Diyetisyen randevularını buradan yönet.
          </p>
        </div>
        <Link
          href="/diyetisyen-bul"
          className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_16px_-8px_rgba(5,150,105,0.7)] transition hover:brightness-105 active:scale-[0.97]"
        >
          Yeni randevu
        </Link>
      </div>

      {ok && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <CheckCircle2 className="h-5 w-5" /> Randevun oluşturuldu. Görüşmek
          üzere!
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-gray-200 bg-white/60 px-6 py-12 text-center dark:border-gray-800 dark:bg-gray-900/50">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CalendarClock className="h-7 w-7" strokeWidth={1.75} />
          </span>
          <p className="mt-4 font-semibold">Henüz randevun yok</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500">
            Bir diyetisyen seçip uygun bir saate kolayca randevu alabilirsin.
          </p>
          <Link
            href="/diyetisyen-bul"
            className="mt-5 inline-flex rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(5,150,105,0.7)] transition hover:brightness-105 active:scale-[0.98]"
          >
            Diyetisyen seç
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="px-1 text-xs font-semibold tracking-[0.14em] text-emerald-700 uppercase dark:text-emerald-300">
                Yaklaşan ({upcoming.length})
              </h2>
              <ul className="space-y-3">
                {upcoming.map((a) => (
                  <AppointmentCard key={a.id} a={a} past={false} />
                ))}
              </ul>
            </section>
          )}

          {past.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="px-1 text-xs font-semibold tracking-[0.14em] text-gray-400 uppercase">
                Geçmiş
              </h2>
              <ul className="space-y-3">
                {past.map((a) => (
                  <AppointmentCard key={a.id} a={a} past />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
