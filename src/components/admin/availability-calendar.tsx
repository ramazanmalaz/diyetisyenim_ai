"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { addSlot, deleteSlot } from "@/app/(admin)/yonetim/diyetisyenler/actions";
import {
  MonthCalendar,
  dayKey,
} from "@/components/dietitians/month-calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { SlotStatus } from "@/types/database";

type AdminSlot = {
  id: string;
  start_at: string;
  duration_min: number;
  status: SlotStatus;
};

// 08:00–21:00 arası yarım saatlik seçenekler.
const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 8; h <= 21; h++) {
    for (const m of [0, 30]) {
      if (h === 21 && m === 30) continue;
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

function timeOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

export function AvailabilityCalendar({
  dietitianId,
  slots,
}: {
  dietitianId: string;
  slots: AdminSlot[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [duration, setDuration] = useState("40");

  const byDay = useMemo(() => {
    const m = new Map<string, AdminSlot[]>();
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

  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedKey, setSelectedKey] = useState<string>(dayKey(new Date()));

  const daySlotByTime = useMemo(() => {
    const m = new Map<string, AdminSlot>();
    for (const s of byDay.get(selectedKey) ?? []) m.set(timeOf(s.start_at), s);
    return m;
  }, [byDay, selectedKey]);

  function toggle(time: string) {
    const existing = daySlotByTime.get(time);
    if (existing?.status === "booked") return; // dolu slota dokunma
    startTransition(async () => {
      if (existing) {
        const fd = new FormData();
        fd.set("id", existing.id);
        fd.set("dietitianId", dietitianId);
        await deleteSlot(fd);
      } else {
        const fd = new FormData();
        fd.set("dietitianId", dietitianId);
        fd.set("startAt", `${selectedKey}T${time}`);
        fd.set("durationMin", duration);
        await addSlot(fd);
      }
      router.refresh();
    });
  }

  const selectedLabel = new Date(`${selectedKey}T00:00`).toLocaleDateString(
    "tr-TR",
    { weekday: "long", day: "numeric", month: "long" },
  );

  return (
    <div className="space-y-4">
      <MonthCalendar
        monthDate={monthDate}
        onMonthChange={setMonthDate}
        selectedKey={selectedKey}
        onSelectDay={(k) => setSelectedKey(k)}
        markers={markers}
      />

      <div className="flex items-center gap-2">
        <Label htmlFor="dur" className="text-xs text-gray-500">
          Yeni saat süresi (dk)
        </Label>
        <Input
          id="dur"
          type="number"
          min="10"
          step="5"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-20"
        />
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium capitalize">{selectedLabel}</p>
        <p className="mb-2 text-xs text-gray-400">
          Saate dokunarak müsaitlik ekle/kaldır. Yeşil = müsait, mavi = dolu
          (randevu alınmış), gri = kapalı.
        </p>
        <div className="flex flex-wrap gap-2">
          {TIME_OPTIONS.map((t) => {
            const ex = daySlotByTime.get(t);
            const booked = ex?.status === "booked";
            return (
              <button
                key={t}
                type="button"
                disabled={pending || booked}
                onClick={() => toggle(t)}
                title={booked ? "Dolu (randevu alınmış)" : undefined}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-60",
                  booked
                    ? "cursor-not-allowed border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                    : ex
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-gray-200 text-gray-600 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300",
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
