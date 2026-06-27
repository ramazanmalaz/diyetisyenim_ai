"use client";

import { UtensilsCrossed, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { playAlertChime } from "@/lib/alert-sound";

// Uygulama AÇIKKEN öğün saatinde hatırlatma (su hatırlatıcısıyla aynı desen).
// Ayarlar tek kaynaktır: enable + saatler DB'den prop olarak gelir. Kapalıyken
// push'u cron gönderir; bu bileşen yalnızca açık uygulamadaki toast'tır.

type MealDef = { key: "breakfast" | "lunch" | "dinner"; label: string; emoji: string; body: string };

const MEALS: MealDef[] = [
  { key: "breakfast", label: "Kahvaltı", emoji: "🍳", body: "Güne sağlıklı bir kahvaltıyla başla." },
  { key: "lunch", label: "Öğle yemeği", emoji: "🥗", body: "Öğle öğününün zamanı geldi, afiyet olsun!" },
  { key: "dinner", label: "Akşam yemeği", emoji: "🍲", body: "Akşam öğününün vakti. Bugünü güzel kapat!" },
];

function getLs(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function setLs(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* no-op */
  }
}
const pad = (n: number) => String(n).padStart(2, "0");

export function MealReminder({
  enabled = false,
  breakfast = "08:00",
  lunch = "13:00",
  dinner = "19:00",
}: {
  enabled?: boolean;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
}) {
  const [due, setDue] = useState<MealDef | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const times: Record<MealDef["key"], string> = { breakfast, lunch, dinner };
    const shownKey = (k: string) => `meal_shown_${k}`;

    const check = () => {
      const now = new Date();
      const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const today = now.toISOString().slice(0, 10);
      for (const m of MEALS) {
        if (times[m.key] !== hhmm) continue;
        if (getLs(shownKey(m.key)) === today) continue; // bugün gösterildi
        setLs(shownKey(m.key), today);
        setDue(m);
        playAlertChime();
        try {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`${m.emoji} ${m.label} vakti — UzmanDiyet`, {
              body: m.body,
              tag: "meal",
            });
          }
        } catch {
          /* no-op */
        }
        break;
      }
    };

    const id = window.setInterval(check, 60_000);
    check();
    return () => window.clearInterval(id);
  }, [enabled, breakfast, lunch, dinner]);

  if (!due) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,360px)] -translate-x-1/2 rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-float)] ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300">
          <UtensilsCrossed className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {due.emoji} {due.label} vakti
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{due.body}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href="/plan"
              onClick={() => setDue(null)}
              className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-amber-600 active:scale-[0.96]"
            >
              Planı aç
            </Link>
            <button
              type="button"
              onClick={() => setDue(null)}
              className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100 active:scale-[0.96] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Kapat
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDue(null)}
          aria-label="Kapat"
          className="shrink-0 text-gray-400 transition hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
