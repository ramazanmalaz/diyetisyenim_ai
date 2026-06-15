"use client";

import { Droplets, X } from "lucide-react";
import { useEffect, useState } from "react";

import { updateWater } from "@/app/(app)/plan/actions";

const ENABLED_KEY = "su_reminder_enabled";
const LAST_KEY = "su_reminder_last";
const SNOOZE_KEY = "su_reminder_snooze";

const INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 saatte bir
const SNOOZE_MS = 60 * 60 * 1000; // 1 saat ertele
const ACTIVE_START = 8; // 08:00
const ACTIVE_END = 22; // 22:00

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

/**
 * Gün içi su içme hatırlatıcısı. Uygulama açıkken belirli aralıklarla (aktif
 * saatlerde) uyarı gösterir; izin verilmişse OS bildirimi de gönderir.
 * Ayarlar localStorage'da; su takibi WaterTracker'daki anahtarla açılır/kapanır.
 */
export function WaterReminder() {
  const [due, setDue] = useState(false);

  useEffect(() => {
    // İlk açılışta varsayılan: açık. 'last' yoksa şimdi (hemen tetiklenmesin).
    if (getLs(ENABLED_KEY) === null) setLs(ENABLED_KEY, "1");
    if (!getLs(LAST_KEY)) setLs(LAST_KEY, String(Date.now()));

    const check = () => {
      if (getLs(ENABLED_KEY) === "0") return;
      const now = Date.now();
      if (now < Number(getLs(SNOOZE_KEY) ?? 0)) return;
      const hour = new Date().getHours();
      if (hour < ACTIVE_START || hour >= ACTIVE_END) return;
      if (now - Number(getLs(LAST_KEY) ?? 0) >= INTERVAL_MS) {
        setDue(true);
        setLs(LAST_KEY, String(now));
        try {
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("Su molası 💧", {
              body: "Bir bardak su içmeyi unutma!",
            });
          }
        } catch {
          /* no-op */
        }
      }
    };

    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!due) return null;

  async function drink() {
    setDue(false);
    setLs(LAST_KEY, String(Date.now()));
    await updateWater({ deltaMl: 200 });
  }
  function snooze() {
    setDue(false);
    setLs(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
  }

  return (
    <div className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,360px)] -translate-x-1/2 rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-float)] ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-300">
          <Droplets className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Su molası 💧</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Bir bardak su içmeye ne dersin?
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={drink}
              className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-sky-700 active:scale-[0.96]"
            >
              + 1 bardak içtim
            </button>
            <button
              type="button"
              onClick={snooze}
              className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100 active:scale-[0.96] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              1 saat sonra
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDue(false)}
          aria-label="Kapat"
          className="shrink-0 text-gray-400 transition hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
