"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Google-takvim tarzı ay görünümü. Gün seçimi + işaret (marker) + pasif gün desteği. */
export function MonthCalendar({
  monthDate,
  onMonthChange,
  selectedKey,
  onSelectDay,
  isEnabled,
  markers,
}: {
  monthDate: Date;
  onMonthChange: (d: Date) => void;
  selectedKey: string | null;
  onSelectDay: (key: string, date: Date) => void;
  /** Gün tıklanabilir mi? (geçmiş günler her durumda pasif) */
  isEnabled?: (key: string, date: Date) => boolean;
  /** Gün başına işaret sayısı (nokta/rozet için). */
  markers?: Record<string, number>;
}) {
  const today = startOfDay(new Date());
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Pazartesi=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = first.toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  });

  const canPrev =
    new Date(year, month, 1) > new Date(today.getFullYear(), today.getMonth(), 1);

  return (
    <div className="rounded-2xl border border-gray-200 p-3 dark:border-gray-800">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, month - 1, 1))}
          disabled={!canPrev}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
          aria-label="Önceki ay"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold capitalize">{monthLabel}</p>
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, month + 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Sonraki ay"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-400">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const key = dayKey(d);
          const isPast = d < today;
          const enabled = !isPast && (isEnabled ? isEnabled(key, d) : true);
          const isToday = key === dayKey(today);
          const isSelected = key === selectedKey;
          const count = markers?.[key] ?? 0;

          return (
            <button
              key={key}
              type="button"
              disabled={!enabled}
              onClick={() => onSelectDay(key, d)}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-xl text-sm transition",
                isSelected
                  ? "bg-emerald-600 font-semibold text-white"
                  : enabled
                    ? "hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    : "text-gray-300 dark:text-gray-700",
                !isSelected && enabled && count > 0
                  ? "font-semibold text-emerald-700 dark:text-emerald-300"
                  : "",
                !isSelected && isToday ? "ring-1 ring-emerald-400" : "",
              )}
            >
              {d.getDate()}
              {count > 0 && !isSelected && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
