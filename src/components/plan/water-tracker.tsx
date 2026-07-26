"use client";

import { Bell, BellOff, GlassWater, Plus, RotateCcw, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";

import { setWaterReminder } from "@/app/(app)/push/actions";
import { updateWater } from "@/app/(app)/plan/actions";
import { Input } from "@/components/ui/input";
import { enablePush } from "@/lib/push-client";
import {
  broadcastWater,
  REMINDER_TOGGLE_EVENT,
  setReminderEnabledLs,
  syncReminderEnabledLs,
  WATER_GLASS_ML,
  WATER_UPDATE_EVENT,
} from "@/lib/water-sync";

export function WaterTracker({
  initialMl,
  goalMl = 2500,
  glassMl = WATER_GLASS_ML,
  reminderEnabled = true,
}: {
  initialMl: number;
  goalMl?: number;
  glassMl?: number;
  reminderEnabled?: boolean;
}) {
  const GOAL_ML = goalMl > 0 ? goalMl : 2500; // günlük hedef (kullanıcı ayarı)
  const GLASS_ML = glassMl > 0 ? glassMl : WATER_GLASS_ML; // bardak (ayar)
  const [total, setTotal] = useState(initialMl);
  const [reminderOn, setReminderOn] = useState(reminderEnabled);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastAdd, setLastAdd] = useState(0); // son eklenen miktar (geri al için)

  // Tam yüklemede DB otoritedir: aynayı eşitle + başka yerde değişirse dinle.
  useEffect(() => {
    syncReminderEnabledLs(reminderEnabled);
    const onToggle = (e: Event) => {
      const on = (e as CustomEvent<{ on: boolean }>).detail?.on;
      if (typeof on === "boolean") setReminderOn(on);
    };
    window.addEventListener(REMINDER_TOGGLE_EVENT, onToggle);
    return () => window.removeEventListener(REMINDER_TOGGLE_EVENT, onToggle);
  }, [reminderEnabled]);

  // Su hatırlatıcısı "bir bardak içtim" deyince sayacı canlı güncelle.
  useEffect(() => {
    const onUpdate = (e: Event) => {
      const total = (e as CustomEvent<{ total: number }>).detail?.total;
      if (typeof total === "number") setTotal(total);
    };
    window.addEventListener(WATER_UPDATE_EVENT, onUpdate);
    return () => window.removeEventListener(WATER_UPDATE_EVENT, onUpdate);
  }, []);

  const pct = Math.min(100, Math.round((total / GOAL_ML) * 100));
  const remainingMl = Math.max(0, GOAL_ML - total);
  const remainingGlasses = Math.ceil(remainingMl / GLASS_ML);
  const reached = total >= GOAL_ML;
  const liters = (total / 1000).toFixed(total % 1000 === 0 ? 0 : 1);

  async function change(deltaMl: number) {
    if (deltaMl === 0) return;
    setLastAdd(deltaMl > 0 ? deltaMl : 0);
    setBusy(true);
    setTotal((t) => Math.max(0, t + deltaMl)); // iyimser
    const res = await updateWater({ deltaMl });
    setBusy(false);
    if ("total" in res) {
      setTotal(res.total);
      broadcastWater(res.total); // diğer açık su bileşenleriyle senkron
    }
  }

  async function addCustom() {
    const ml = Math.round(Number(custom));
    if (!ml || ml <= 0) return;
    setCustom("");
    await change(ml);
  }

  async function reset() {
    setBusy(true);
    setTotal(0);
    setLastAdd(0);
    const res = await updateWater({ reset: true });
    setBusy(false);
    if ("total" in res) {
      setTotal(res.total);
      broadcastWater(res.total);
    }
  }

  async function toggleReminder() {
    const next = !reminderOn;
    setReminderOn(next);
    setReminderEnabledLs(next); // localStorage ayna + event (in-app hatırlatıcı)
    if (next) await enablePush();
    void setWaterReminder(next); // DB (tek kaynak)
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-sky-200/80 bg-gradient-to-br from-sky-50 to-cyan-50/40 p-5 shadow-[var(--shadow-soft)] dark:border-sky-900/50 dark:from-sky-950/30 dark:to-cyan-950/10">
      <style>{`
        @keyframes wt-rise { from { transform: translateY(8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes wt-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        .wt-glass { animation: wt-rise .45s var(--ease-out) backwards; }
        .wt-bob { animation: wt-bob 2.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .wt-glass, .wt-bob { animation: none; }
        }
      `}</style>

      {/* Başlık + hatırlatıcı */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold text-sky-900 dark:text-sky-100">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-300">
            <GlassWater className="h-4 w-4" strokeWidth={2} />
          </span>
          Su Takibi
        </h3>
        <button
          type="button"
          onClick={toggleReminder}
          aria-pressed={reminderOn}
          aria-label="Su içme hatırlatıcısını aç/kapat"
          className={
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition-colors duration-200 ease-[var(--ease-out)] " +
            (reminderOn
              ? "bg-sky-100 text-sky-700 ring-sky-200 hover:bg-sky-200/70 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900"
              : "bg-gray-100 text-gray-500 ring-gray-200 hover:bg-gray-200/70 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700")
          }
        >
          {reminderOn ? (
            <Bell className="h-3.5 w-3.5" strokeWidth={2} />
          ) : (
            <BellOff className="h-3.5 w-3.5" strokeWidth={2} />
          )}
          {reminderOn ? "Hatırlat: Açık" : "Hatırlat: Kapalı"}
        </button>
      </div>

      {/* Tek büyük bardak — su ekledikçe dolar */}
      <div className="mt-4 flex flex-col items-center">
        <button
          type="button"
          onClick={() => change(GLASS_ML)}
          disabled={busy || reached}
          aria-label="Bardağa dokun, bir bardak su ekle"
          className="wt-glass group relative h-44 w-32 shrink-0 disabled:cursor-not-allowed"
        >
          {/* Bardak silueti tanımı — geniş ağız, dar taban, yuvarlatılmış köşeler */}
          <svg width="0" height="0" aria-hidden className="absolute">
            <defs>
              <clipPath id="wt-glass-clip" clipPathUnits="objectBoundingBox">
                <path
                  d="M0.14,0
                     L0.86,0
                     Q0.94,0 0.92,0.057
                     L0.80,0.943
                     Q0.79,1 0.72,1
                     L0.28,1
                     Q0.21,1 0.20,0.943
                     L0.08,0.057
                     Q0.06,0 0.14,0
                     Z"
                />
              </clipPath>
            </defs>
          </svg>

          {/* Bardak silueti */}
          <div
            className="absolute inset-0 overflow-hidden bg-white/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] ring-2 ring-inset ring-sky-200/80 transition-transform duration-200 ease-[var(--ease-out)] group-active:scale-[0.97] dark:bg-white/5 dark:ring-sky-900/60"
            style={{ clipPath: "url(#wt-glass-clip)" }}
          >
            {/* Sıvı dolumu */}
            <div
              className={
                "absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-[var(--ease-out)] " +
                (reached
                  ? "bg-gradient-to-b from-emerald-300 to-emerald-500"
                  : "bg-gradient-to-b from-sky-300 to-sky-500")
              }
              style={{ height: `${Math.max(pct, total > 0 ? 4 : 0)}%` }}
            >
              <div className="absolute inset-x-0 top-0 h-2 bg-white/40" />
              <span
                className="wt-bob absolute bottom-3 left-[30%] h-1.5 w-1.5 rounded-full bg-white/50"
                style={{ animationDelay: "0.2s" }}
              />
              <span
                className="wt-bob absolute bottom-7 left-[55%] h-1 w-1 rounded-full bg-white/40"
                style={{ animationDelay: "0.9s" }}
              />
              <span
                className="wt-bob absolute bottom-2 left-[70%] h-1.5 w-1.5 rounded-full bg-white/40"
                style={{ animationDelay: "1.5s" }}
              />
            </div>
            {/* Cam parlaklığı — sol kenarda ince ışık vurgusu */}
            <div className="absolute inset-y-0 left-[16%] w-[8%] bg-white/35" />
          </div>

          {/* Ağız (rim) çizgisi — bardağın üstten görünüşünü ima eder */}
          <svg
            viewBox="0 0 100 20"
            preserveAspectRatio="none"
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-5 w-full overflow-visible"
          >
            <ellipse
              cx="50"
              cy="6"
              rx="36"
              ry="3.2"
              className="fill-none stroke-sky-300/70 dark:stroke-sky-700/70"
              strokeWidth="1.4"
            />
          </svg>

          {/* Yüzde rozeti */}
          <span
            className={
              "absolute -top-2 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums shadow-sm " +
              (reached
                ? "bg-emerald-500 text-white"
                : "bg-white text-sky-700 ring-1 ring-sky-200 dark:bg-gray-900 dark:text-sky-300 dark:ring-sky-900")
            }
          >
            %{pct}
          </span>
        </button>

        <p className="mt-3 flex items-baseline gap-1.5">
          <span className="text-3xl font-bold tabular-nums tracking-tight text-sky-900 dark:text-sky-50">
            {liters}
            <span className="ml-0.5 text-lg font-semibold text-sky-500">L</span>
          </span>
          <span className="text-sm text-gray-400">
            / {(GOAL_ML / 1000).toFixed(1).replace(".", ",")} L
          </span>
        </p>
        <p className="text-sm font-medium text-sky-700/90 dark:text-sky-300/90">
          {reached ? (
            <>Hedefe ulaştın 🎉</>
          ) : (
            <>
              <span className="tabular-nums">{remainingGlasses}</span> bardak (
              {(remainingMl / 1000).toFixed(1)} L) kaldı
            </>
          )}
        </p>
        <p className="mt-0.5 text-[11px] text-gray-400">
          Bardağa dokun, bir bardak eklensin
        </p>
      </div>

      {/* Birincil aksiyon + yardımcılar */}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          disabled={busy || reached}
          onClick={() => change(GLASS_ML)}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-sky-500 to-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(2,132,199,0.7)] transition-[transform,filter] duration-200 ease-[var(--ease-out)] hover:brightness-105 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> 1 bardak ekle
          <span className="opacity-80">· {GLASS_ML} ml</span>
        </button>
        <button
          type="button"
          disabled={busy || lastAdd === 0}
          onClick={() => change(-lastAdd)}
          aria-label="Son eklemeyi geri al"
          title="Geri al"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-sky-200 bg-white/70 text-sky-600 transition-[background-color,transform] duration-200 ease-[var(--ease-out)] hover:bg-white active:scale-90 disabled:opacity-40 dark:border-sky-900 dark:bg-white/5 dark:text-sky-300"
        >
          <Undo2 className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* Özel miktar + sıfırla */}
      <div className="mt-2.5 flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type="number"
            inputMode="numeric"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void addCustom();
            }}
            placeholder="Özel miktar (ml)"
            className="pr-14"
            aria-label="Özel su miktarı (ml)"
          />
          <button
            type="button"
            disabled={busy || !custom}
            onClick={addCustom}
            className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-lg bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700 transition-colors duration-200 ease-[var(--ease-out)] hover:bg-sky-200 disabled:opacity-40 dark:bg-sky-950/60 dark:text-sky-300"
          >
            Ekle
          </button>
        </div>
        {total > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={reset}
            aria-label="Günü sıfırla"
            title="Sıfırla"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-gray-400 transition-colors duration-200 ease-[var(--ease-out)] hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>

      {reminderOn && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-sky-700/70 dark:text-sky-300/60">
          <Bell className="h-3 w-3" strokeWidth={2} />
          Gün içinde (08:00–22:00) düzenli olarak hatırlatırız — uygulama kapalı olsa
          bile.
        </p>
      )}
    </section>
  );
}
