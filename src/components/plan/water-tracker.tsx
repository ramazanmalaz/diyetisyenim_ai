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
  const GLASSES = Math.max(1, Math.round(GOAL_ML / GLASS_ML)); // bardak sayısı
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
  const filled = Math.min(GLASSES, Math.floor(total / GLASS_ML)); // dolu bardak sayısı
  const glassesExact = Math.round((total / GLASS_ML) * 10) / 10;
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

  // Bir bardağa dokununca o seviyeye ayarla (mutlak → delta).
  function tapGlass(index: number) {
    const target = (index + 1) * GLASS_ML;
    // Zaten o seviyedeyse (son dolu bardağa dokunma) → bir bardak geri al.
    const next = total === target ? index * GLASS_ML : target;
    void change(next - total);
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
        @keyframes wt-pop { 0%{transform:scale(1)} 40%{transform:scale(1.18)} 100%{transform:scale(1)} }
        @keyframes wt-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
        .wt-glass { animation: wt-rise .45s var(--ease-out) backwards; }
        .wt-pop { animation: wt-pop .5s var(--ease-out); }
        .wt-bob { animation: wt-bob 2.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .wt-glass, .wt-pop, .wt-bob { animation: none; }
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

      {/* Büyük sayı + ilerleme çubuğu */}
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums tracking-tight text-sky-900 dark:text-sky-50">
              {liters}
              <span className="ml-0.5 text-lg font-semibold text-sky-500">L</span>
            </span>
            <span className="text-sm text-gray-400">
              / {(GOAL_ML / 1000).toFixed(1).replace(".", ",")} L
            </span>
          </p>
          <p className="mt-0.5 text-sm font-medium text-sky-700/90 dark:text-sky-300/90">
            {reached ? (
              <>Hedefe ulaştın 🎉</>
            ) : (
              <>
                <span className="tabular-nums">{remainingGlasses}</span> bardak (
                {(remainingMl / 1000).toFixed(1)} L) kaldı
              </>
            )}
          </p>
        </div>
        <span
          className={
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums " +
            (reached
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300")
          }
        >
          %{pct}
        </span>
      </div>

      <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-sky-100 dark:bg-sky-950/60">
        <div
          className={
            "h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out)] " +
            (reached
              ? "bg-gradient-to-r from-emerald-400 to-sky-400"
              : "bg-gradient-to-r from-sky-400 to-cyan-400")
          }
          style={{ width: `${Math.max(pct, total > 0 ? 5 : 0)}%` }}
        />
      </div>

      {/* Dokunsal bardak dizisi */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-sky-800/80 dark:text-sky-200/70">
            <span className="tabular-nums font-semibold text-sky-700 dark:text-sky-300">
              {glassesExact}
            </span>{" "}
            / {GLASSES} bardak
          </p>
          <p className="text-[11px] text-gray-400">Bardağa dokunup işaretle</p>
        </div>
        <div
          className="mt-2 grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${Math.min(GLASSES, 10)}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: GLASSES }).map((_, i) => {
            const isFull = i < filled;
            return (
              <button
                key={i}
                type="button"
                disabled={busy}
                onClick={() => tapGlass(i)}
                aria-label={`${i + 1}. bardak${isFull ? " (dolu)" : ""}`}
                className={
                  "wt-glass group grid aspect-[3/4] place-items-center rounded-lg ring-1 transition-[transform,background-color,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 active:scale-90 disabled:opacity-60 " +
                  (isFull
                    ? reached
                      ? "bg-gradient-to-b from-emerald-400 to-emerald-500 text-white ring-emerald-300 shadow-[0_4px_10px_-3px_rgba(16,185,129,0.55)] dark:ring-emerald-700"
                      : "bg-gradient-to-b from-sky-400 to-cyan-500 text-white ring-sky-300 shadow-[0_4px_10px_-3px_rgba(14,165,233,0.55)] dark:ring-sky-700"
                    : "bg-white/70 text-sky-300 ring-sky-200/80 hover:bg-sky-50 dark:bg-white/5 dark:text-sky-700 dark:ring-sky-900")
                }
                style={{ animationDelay: `${i * 35}ms` }}
              >
                <GlassWater
                  className={
                    "h-4 w-4 " +
                    (isFull && i === filled - 1 ? "wt-pop" : "")
                  }
                  strokeWidth={2}
                />
              </button>
            );
          })}
        </div>
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
