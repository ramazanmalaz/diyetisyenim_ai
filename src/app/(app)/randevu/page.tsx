import { CalendarPlus, CheckCircle2 } from "lucide-react";
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

type Row = {
  id: string;
  scheduled_at: string;
  status: keyof typeof APPOINTMENT_STATUS_LABEL;
  notes: string | null;
  dietitians: { full_name: string; title: string; photo_url: string | null } | null;
};

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

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Randevularım</h1>
        <p className="text-sm text-gray-500">
          Diyetisyen randevularını buradan görüntüleyebilirsin.{" "}
          <Link href="/diyetisyenler" className="text-emerald-600 hover:underline">
            Yeni randevu al →
          </Link>
        </p>
      </div>

      {ok && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <CheckCircle2 className="h-5 w-5" /> Randevun oluşturuldu. Görüşmek üzere!
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          Henüz randevun yok.{" "}
          <Link href="/diyetisyenler" className="text-emerald-600 hover:underline">
            Bir diyetisyen seç
          </Link>{" "}
          ve uygun bir saate randevu al.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
            >
              {a.dietitians && (
                <DietitianAvatar
                  name={a.dietitians.full_name}
                  photoUrl={a.dietitians.photo_url}
                  className="h-12 w-12"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {a.dietitians?.full_name ?? "Randevu"}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {formatDateTime(a.scheduled_at)}
                </p>
                <p className="text-xs text-gray-500">
                  {APPOINTMENT_STATUS_LABEL[a.status]}
                  {a.notes ? ` · ${a.notes}` : ""}
                </p>
                {(a.status === "requested" || a.status === "confirmed") && (
                  <a
                    href={googleCalendarUrl(
                      `UzmanDiyet — ${a.dietitians?.full_name ?? "Diyetisyen"} randevusu`,
                      a.scheduled_at,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" /> Google Takvim&apos;e
                    ekle
                  </a>
                )}
              </div>
              {(a.status === "requested" || a.status === "confirmed") && (
                <form action={cancelAppointment}>
                  <input type="hidden" name="id" value={a.id} />
                  <button
                    type="submit"
                    className="shrink-0 text-xs text-red-600 hover:underline"
                  >
                    İptal et
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
