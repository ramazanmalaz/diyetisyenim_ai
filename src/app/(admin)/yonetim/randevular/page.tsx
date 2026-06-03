import Link from "next/link";

import { AppointmentStatusControl } from "@/components/admin/appointment-status-control";
import {
  APPOINTMENT_STATUS_LABEL,
  formatDateTime,
} from "@/lib/appointments";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function RandevularPage() {
  await requireStaff();
  const supabase = await createClient();

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, client_id, scheduled_at, status, notes")
    .order("scheduled_at", { ascending: false });

  const rows = appointments ?? [];
  const clientIds = [...new Set(rows.map((a) => a.client_id))];
  const { data: clients } = clientIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", clientIds)
    : { data: [] };
  const nameById = new Map((clients ?? []).map((c) => [c.id, c.full_name]));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link href="/yonetim" className="text-sm text-emerald-600">
          ← Yönetim
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Randevular</h1>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">Henüz randevu yok.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
            >
              <div>
                <p className="font-medium">
                  {nameById.get(a.client_id) ?? "Danışan"}
                </p>
                <p className="text-sm text-gray-500">
                  {formatDateTime(a.scheduled_at)} ·{" "}
                  {APPOINTMENT_STATUS_LABEL[a.status]}
                  {a.notes ? ` · ${a.notes}` : ""}
                </p>
              </div>
              <AppointmentStatusControl id={a.id} current={a.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
