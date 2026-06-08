"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { bookSlot } from "@/app/(app)/diyetisyenler/actions";
import {
  MonthCalendar,
  dayKey,
} from "@/components/dietitians/month-calendar";
import { Button } from "@/components/ui/button";
import { formatSlotTime, type Slot } from "@/lib/dietitians";
import { cn } from "@/lib/utils";

export function SlotPicker({
  dietitianId,
  slots,
}: {
  dietitianId: string;
  slots: Slot[];
}) {
  const router = useRouter();

  const byDay = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots) {
      const k = dayKey(new Date(s.start_at));
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    return m;
  }, [slots]);

  const markers = useMemo(() => {
    const r: Record<string, number> = {};
    byDay.forEach((arr, k) => (r[k] = arr.length));
    return r;
  }, [byDay]);

  const firstDate = slots.length ? new Date(slots[0].start_at) : new Date();
  const [monthDate, setMonthDate] = useState(firstDate);
  const [selectedKey, setSelectedKey] = useState<string | null>(
    slots.length ? dayKey(firstDate) : null,
  );
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (slots.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400 dark:border-gray-700">
        Şu an müsait randevu saati yok. Lütfen daha sonra tekrar bak.
      </p>
    );
  }

  const daySlots = selectedKey ? (byDay.get(selectedKey) ?? []) : [];

  async function onBook() {
    if (!selectedSlot) return;
    setBusy(true);
    setError(null);
    const res = await bookSlot({ dietitianId, slotId: selectedSlot });
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.push("/randevu?ok=1");
  }

  return (
    <div className="space-y-4">
      <MonthCalendar
        monthDate={monthDate}
        onMonthChange={setMonthDate}
        selectedKey={selectedKey}
        onSelectDay={(k) => {
          setSelectedKey(k);
          setSelectedSlot(null);
        }}
        isEnabled={(k) => byDay.has(k)}
        markers={markers}
      />
      <p className="text-xs text-gray-400">
        Yeşil işaretli günler müsait. Bir gün seç, ardından uygun saati seç.
      </p>

      {selectedKey && (
        <div>
          <p className="mb-1.5 text-sm font-medium">Uygun saatler</p>
          {daySlots.length === 0 ? (
            <p className="text-sm text-gray-400">
              Bu gün için müsait saat yok.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {daySlots.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSlot(s.id)}
                  className={cn(
                    "rounded-xl border px-3.5 py-2 text-sm font-medium transition",
                    selectedSlot === s.id
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-gray-200 hover:border-emerald-400 dark:border-gray-700",
                  )}
                >
                  {formatSlotTime(s.start_at)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={onBook} disabled={!selectedSlot || busy} className="w-full">
        {busy ? "Randevu alınıyor…" : "Randevu al"}
      </Button>
    </div>
  );
}
