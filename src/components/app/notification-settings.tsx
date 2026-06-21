"use client";

import { Bell, Check, Clock, Droplets, Timer, UtensilsCrossed } from "lucide-react";
import { useState } from "react";

import { saveNotificationPrefs } from "@/app/(app)/push/actions";
import { enablePush } from "@/lib/push-client";
import { cn } from "@/lib/utils";

type Props = {
  water: boolean;
  waterStart: number;
  waterEnd: number;
  waterInterval: number;
  waterAmount: number;
  waterGoal: number;
  meals: boolean;
  breakfast: string;
  lunch: string;
  dinner: string;
  pomodoro: boolean;
};

const AMOUNT_PRESETS = [150, 200, 250, 330, 500];
const GOAL_PRESETS = [2000, 2500, 3000, 3500];

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-[var(--ease-out)]",
        on ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-[var(--ease-out)]",
          on && "translate-x-5",
        )}
      />
    </button>
  );
}

export function NotificationSettings(props: Props) {
  const [water, setWater] = useState(props.water);
  const [waterStart, setWaterStart] = useState(props.waterStart);
  const [waterEnd, setWaterEnd] = useState(props.waterEnd);
  const [waterInterval, setWaterInterval] = useState(props.waterInterval);
  const [waterAmount, setWaterAmount] = useState(props.waterAmount);
  const [waterGoal, setWaterGoal] = useState(props.waterGoal);
  const [meals, setMeals] = useState(props.meals);
  const [breakfast, setBreakfast] = useState(props.breakfast);
  const [lunch, setLunch] = useState(props.lunch);
  const [dinner, setDinner] = useState(props.dinner);
  const [pomodoro, setPomodoro] = useState(props.pomodoro);

  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    // Herhangi bir push bildirimi açıksa izin + abonelik sağla.
    if (water || meals || pomodoro) {
      const ok = await enablePush();
      if (!ok) {
        setBusy(false);
        setError(
          "Bildirim izni verilmedi. Tarayıcı/uygulama ayarlarından izin verip tekrar dene.",
        );
        return;
      }
    }
    const res = await saveNotificationPrefs({
      water,
      waterStart,
      waterEnd,
      waterInterval,
      waterAmount,
      waterGoal,
      meals,
      breakfast,
      lunch,
      dinner,
      pomodoro,
    });
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-4">
      {/* Su */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300">
            <Droplets className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Su hatırlatıcısı</p>
            <p className="text-xs text-gray-500">
              {water
                ? `${String(waterStart).padStart(2, "0")}:00–${String(waterEnd).padStart(2, "0")}:00 arası, ${waterInterval} saatte bir ${waterAmount} ml.`
                : "Gün içinde düzenli su molası bildirimi."}
            </p>
          </div>
          <Toggle on={water} onChange={setWater} label="Su hatırlatıcısı" />
        </div>

        {/* Günlük toplam hedef (hatırlatıcıdan bağımsız; su sayacında kullanılır) */}
        <div className="mt-3 flex flex-col gap-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
          <span className="text-xs font-medium text-gray-500">
            Günlük su hedefi (toplam)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {GOAL_PRESETS.map((ml) => (
              <button
                key={ml}
                type="button"
                onClick={() => setWaterGoal(ml)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  waterGoal === ml
                    ? "bg-sky-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300",
                )}
              >
                {(ml / 1000).toFixed(1).replace(".", ",")} L
              </button>
            ))}
            <input
              type="number"
              inputMode="numeric"
              value={waterGoal}
              min={500}
              max={6000}
              onChange={(e) => setWaterGoal(Number(e.target.value) || 0)}
              aria-label="Özel günlük su hedefi (ml)"
              className="w-24 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm tabular-nums dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
        </div>

        {water && (
          <div className="mt-3 space-y-3 border-t border-gray-100 pt-3 dark:border-gray-800">
            {/* Saat aralığı */}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">Başlangıç</span>
                <select
                  value={waterStart}
                  onChange={(e) => setWaterStart(Number(e.target.value))}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  {Array.from({ length: 18 }, (_, i) => i + 5).map((h) => (
                    <option key={h} value={h} disabled={h >= waterEnd}>
                      {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">Bitiş</span>
                <select
                  value={waterEnd}
                  onChange={(e) => setWaterEnd(Number(e.target.value))}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  {Array.from({ length: 18 }, (_, i) => i + 6).map((h) => (
                    <option key={h} value={h} disabled={h <= waterStart}>
                      {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Sıklık */}
            <label className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-gray-500">Sıklık</span>
              <select
                value={waterInterval}
                onChange={(e) => setWaterInterval(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    Her {n} saatte bir
                  </option>
                ))}
              </select>
            </label>

            {/* Bardak miktarı */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gray-500">
                Bardak miktarı (ml)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AMOUNT_PRESETS.map((ml) => (
                  <button
                    key={ml}
                    type="button"
                    onClick={() => setWaterAmount(ml)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                      waterAmount === ml
                        ? "bg-sky-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300",
                    )}
                  >
                    {ml}
                  </button>
                ))}
                <input
                  type="number"
                  inputMode="numeric"
                  value={waterAmount}
                  min={50}
                  max={2000}
                  onChange={(e) => setWaterAmount(Number(e.target.value) || 0)}
                  aria-label="Özel su miktarı (ml)"
                  className="w-20 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm tabular-nums dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Öğün */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
            <UtensilsCrossed className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Öğün hatırlatmaları</p>
            <p className="text-xs text-gray-500">
              Kahvaltı, öğle ve akşam için zamanı geldiğinde bildirim.
            </p>
          </div>
          <Toggle on={meals} onChange={setMeals} label="Öğün hatırlatmaları" />
        </div>

        {meals && (
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
            {(
              [
                ["Kahvaltı", breakfast, setBreakfast],
                ["Öğle", lunch, setLunch],
                ["Akşam", dinner, setDinner],
              ] as const
            ).map(([label, value, setter]) => (
              <label key={label} className="flex flex-col gap-1">
                <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
                  <Clock className="h-3 w-3" /> {label}
                </span>
                <input
                  type="time"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm tabular-nums dark:border-gray-700 dark:bg-gray-800"
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Pomodoro */}
      <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
          <Timer className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Odak (pomodoro) bildirimleri</p>
          <p className="text-xs text-gray-500">
            Çalışma/mola seansları başlayıp bittiğinde bildirim.
          </p>
        </div>
        <Toggle on={pomodoro} onChange={setPomodoro} label="Pomodoro bildirimleri" />
      </div>

      <p className="flex items-center gap-1.5 px-1 text-[11px] text-gray-400">
        <Bell className="h-3 w-3" /> Bildirimler uygulama kapalıyken de gelir.
        iPhone&apos;da uygulamanın ana ekrana eklenmiş (PWA) olması gerekir.
      </p>

      {error && <p className="px-1 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(5,150,105,0.7)] transition-[transform,filter] duration-200 ease-[var(--ease-out)] hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
      >
        {saved ? (
          <>
            <Check className="h-4 w-4" /> Kaydedildi
          </>
        ) : busy ? (
          "Kaydediliyor…"
        ) : (
          "Ayarları kaydet"
        )}
      </button>
    </div>
  );
}
