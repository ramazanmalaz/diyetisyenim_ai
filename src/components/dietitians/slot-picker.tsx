"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { bookSlot } from "@/app/(app)/diyetisyenler/actions";
import { Button } from "@/components/ui/button";
import { formatSlotTime, groupSlotsByDay, type Slot } from "@/lib/dietitians";
import { cn } from "@/lib/utils";

export function SlotPicker({
  dietitianId,
  slots,
}: {
  dietitianId: string;
  slots: Slot[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = groupSlotsByDay(slots);

  async function onBook() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const res = await bookSlot({ dietitianId, slotId: selected });
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.push("/randevu?ok=1");
  }

  if (slots.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400 dark:border-gray-700">
        Şu an müsait randevu saati yok. Lütfen daha sonra tekrar bak.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {days.map((day) => (
        <div key={day.dayKey}>
          <p className="mb-1.5 text-sm font-medium capitalize">{day.dayLabel}</p>
          <div className="flex flex-wrap gap-2">
            {day.slots.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelected(s.id)}
                className={cn(
                  "rounded-xl border px-3.5 py-2 text-sm font-medium transition",
                  selected === s.id
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-gray-200 hover:border-emerald-400 dark:border-gray-700",
                )}
              >
                {formatSlotTime(s.start_at)}
              </button>
            ))}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={onBook} disabled={!selected || busy} className="w-full">
        {busy ? "Randevu alınıyor…" : "Randevu al"}
      </Button>
    </div>
  );
}
