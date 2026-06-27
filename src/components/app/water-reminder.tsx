"use client";

import { Droplets, X } from "lucide-react";
import { useEffect, useState } from "react";

import { updateWater } from "@/app/(app)/plan/actions";
import { playAlertChime } from "@/lib/alert-sound";
import {
  broadcastWater,
  REMINDER_ENABLED_KEY as ENABLED_KEY,
  syncReminderEnabledLs,
  WATER_GLASS_ML,
} from "@/lib/water-sync";

const LAST_KEY = "su_reminder_last";
const SNOOZE_KEY = "su_reminder_snooze";

const SNOOZE_MS = 60 * 60 * 1000; // 1 saat ertele

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
 * Gün içi su içme hatırlatıcısı. Uygulama açıkken kullanıcının /ayarlar'daki
 * programına göre (aktif saat aralığı + sıklık) uyarı gösterir; izin verilmişse
 * OS bildirimi de gönderir. Eklenen miktar da ayarlardaki bardak miktarıdır.
 * Açma/kapama localStorage'dadır (WaterTracker'daki zil ile ortak).
 */
export function WaterReminder({
  enabled = true,
  startHour = 10,
  endHour = 20,
  intervalHours = 2,
  amountMl = 200,
}: {
  enabled?: boolean;
  startHour?: number;
  endHour?: number;
  intervalHours?: number;
  amountMl?: number;
}) {
  const [due, setDue] = useState(false);
  // Ayarlardaki bardak miktarı; geçersizse ortak varsayılana düş.
  const glassMl = amountMl > 0 ? amountMl : WATER_GLASS_ML;

  useEffect(() => {
    // Tam yüklemede DB otoritedir: aç/kapa aynasını sunucu değeriyle eşitle.
    // (Oturum içinde zil/ayarlar bu aynayı canlı günceller.)
    syncReminderEnabledLs(enabled);
    if (!getLs(LAST_KEY)) setLs(LAST_KEY, String(Date.now()));

    const intervalMs = Math.max(1, intervalHours) * 60 * 60 * 1000;

    const check = () => {
      if (getLs(ENABLED_KEY) === "0") return;
      const now = Date.now();
      if (now < Number(getLs(SNOOZE_KEY) ?? 0)) return;
      const hour = new Date().getHours();
      if (hour < startHour || hour >= endHour) return;
      if (now - Number(getLs(LAST_KEY) ?? 0) >= intervalMs) {
        setDue(true);
        setLs(LAST_KEY, String(now));
        // Belirgin uyarı sesi + titreşim (sessiz kalmasın, kaçmasın).
        playAlertChime();
        try {
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("💧 Su molası — UzmanDiyet", {
              body: `Bir bardak (${glassMl} ml) su içme zamanı. Hadi bir yudum! 🥤`,
              tag: "water",
            });
          }
        } catch {
          /* no-op */
        }
      }
    };

    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [enabled, startHour, endHour, intervalHours, glassMl]);

  if (!due) return null;

  async function drink() {
    setDue(false);
    setLs(LAST_KEY, String(Date.now()));
    const res = await updateWater({ deltaMl: glassMl });
    // Açık su sayacını canlı güncelle (reload beklemeden).
    if (res && "total" in res) broadcastWater(res.total);
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
            Bir bardak ({glassMl} ml) su içmeye ne dersin?
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
