"use client";

import { useState } from "react";

import { setAppointmentStatus } from "@/app/(admin)/yonetim/randevular/actions";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/types/database";

const ACTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: "confirmed", label: "Onayla" },
  { value: "completed", label: "Tamamla" },
  { value: "cancelled", label: "İptal" },
];

export function AppointmentStatusControl({
  id,
  current,
}: {
  id: string;
  current: AppointmentStatus;
}) {
  const [status, setStatus] = useState<AppointmentStatus>(current);
  const [pending, setPending] = useState(false);

  async function change(next: AppointmentStatus) {
    if (next === status || pending) return;
    setPending(true);
    const result = await setAppointmentStatus({ id, status: next });
    setPending(false);
    if (!("error" in result)) setStatus(next);
  }

  return (
    <div className="flex gap-1">
      {ACTIONS.map((a) => (
        <button
          key={a.value}
          type="button"
          onClick={() => change(a.value)}
          disabled={pending || status === a.value}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs transition disabled:opacity-40",
            a.value === "cancelled"
              ? "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
              : "border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800",
          )}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
