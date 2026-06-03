import { cancelAppointment } from "@/app/(app)/randevu/actions";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import {
  APPOINTMENT_STATUS_LABEL,
  formatDateTime,
} from "@/lib/appointments";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function RandevuPage() {
  await requireProfile();
  const supabase = await createClient();

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, scheduled_at, status, notes")
    .order("scheduled_at", { ascending: false });

  const rows = appointments ?? [];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Randevular</h1>

      <AppointmentForm />

      <div className="space-y-3">
        <h2 className="font-semibold">Randevularım</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">Henüz randevun yok.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
              >
                <div>
                  <p className="font-medium">{formatDateTime(a.scheduled_at)}</p>
                  <p className="text-sm text-gray-500">
                    {APPOINTMENT_STATUS_LABEL[a.status]}
                    {a.notes ? ` · ${a.notes}` : ""}
                  </p>
                </div>
                {(a.status === "requested" || a.status === "confirmed") && (
                  <form action={cancelAppointment}>
                    <input type="hidden" name="id" value={a.id} />
                    <button
                      type="submit"
                      className="text-xs text-red-600 hover:underline"
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
    </div>
  );
}
