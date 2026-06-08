"use client";

import { Droplets, Minus, Plus } from "lucide-react";
import { useState } from "react";

import { updateWater } from "@/app/(app)/plan/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const GLASS_ML = 200; // 1 bardak
const GOAL_ML = 2500; // günlük hedef

export function WaterTracker({ initialMl }: { initialMl: number }) {
  const [total, setTotal] = useState(initialMl);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);

  const pct = Math.min(100, Math.round((total / GOAL_ML) * 100));
  const glasses = Math.round((total / GLASS_ML) * 10) / 10;
  const reached = total >= GOAL_ML;

  async function change(deltaMl: number) {
    setBusy(true);
    setTotal((t) => Math.max(0, t + deltaMl)); // iyimser
    const res = await updateWater({ deltaMl });
    setBusy(false);
    if ("total" in res) setTotal(res.total);
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
    const res = await updateWater({ reset: true });
    setBusy(false);
    if ("total" in res) setTotal(res.total);
  }

  return (
    <section className="rounded-3xl border border-sky-200 bg-sky-50/60 p-5 shadow-[var(--shadow-soft)] dark:border-sky-900/50 dark:bg-sky-950/20">
      <style>{`
        @keyframes water-wave { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .water-wave { animation: water-wave 3.5s linear infinite; }
      `}</style>

      <div className="flex items-center gap-4">
        {/* Animasyonlu bardak */}
        <div className="relative h-28 w-20 shrink-0">
          <div className="absolute inset-0 overflow-hidden rounded-b-2xl rounded-t-md border-2 border-sky-300 bg-white/70 dark:border-sky-800 dark:bg-gray-900/40">
            {/* Su seviyesi */}
            <div
              className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-sky-400 to-sky-500 transition-[height] duration-700 ease-out"
              style={{ height: `${pct}%` }}
            >
              {/* Dalga */}
              <div className="water-wave absolute -top-2 left-0 h-3 w-[200%] opacity-70">
                <svg viewBox="0 0 120 12" preserveAspectRatio="none" className="h-full w-full">
                  <path
                    d="M0 6 Q 15 0 30 6 T 60 6 T 90 6 T 120 6 V12 H0 Z"
                    fill="#38bdf8"
                  />
                </svg>
              </div>
            </div>
          </div>
          <Droplets className="absolute -top-1 left-1/2 h-4 w-4 -translate-x-1/2 text-sky-400" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold text-sky-800 dark:text-sky-200">
            Su takibi
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
              %{pct}
            </span>
          </p>
          <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-200">
            <b className="tabular-nums">{total}</b> / {GOAL_ML} ml
            <span className="text-gray-400"> · ~{glasses} bardak</span>
          </p>
          <p className="mt-1 text-xs text-sky-700/80 dark:text-sky-300/80">
            {reached
              ? "Günlük su hedefini tamamladın, harika! 💧"
              : "Gün boyu küçük yudumlar al; günde ~2.5 L (≈10 bardak) hedefle."}
          </p>
        </div>
      </div>

      {/* Hızlı ekleme */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => change(GLASS_ML)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" /> 1 bardak
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => change(250)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" /> 250 ml
        </Button>
        <button
          type="button"
          disabled={busy || total === 0}
          onClick={() => change(-GLASS_ML)}
          aria-label="Bir bardak geri al"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <Minus className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1">
          <Input
            type="number"
            inputMode="numeric"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="ml"
            className="w-20"
          />
          <Button type="button" disabled={busy} onClick={addCustom}>
            Ekle
          </Button>
        </div>

        {total > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={reset}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600 hover:underline"
          >
            Sıfırla
          </button>
        )}
      </div>
    </section>
  );
}
