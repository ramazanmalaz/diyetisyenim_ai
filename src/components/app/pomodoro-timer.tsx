"use client";

import {
  Check,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  savePomodoroRun,
  clearPomodoroRun,
} from "@/app/(app)/pomodoro/actions";
import {
  buildPhases,
  DEFAULT_POMODORO_CONFIG,
  modeMinutes,
  nextMode,
  type PomoMode,
  type PomodoroConfig,
  upcomingBoundaries,
} from "@/lib/pomodoro";
import { cn } from "@/lib/utils";

const CFG_KEY = "pomodoro_config_v2";
const SNAP_KEY = "pomodoro_snapshot_v2";
const MUTE_KEY = "pomodoro_muted";

type Meta = { label: string; sub: string; bg: string };
const META: Record<PomoMode, Meta> = {
  focus: {
    label: "Odak",
    sub: "Odaklanma zamanı — telefonu bırak! 💪",
    bg: "#ba4949",
  },
  short: {
    label: "Kısa Mola",
    sub: "Kısa bir mola ver, nefes al ☕",
    bg: "#38858a",
  },
  long: {
    label: "Uzun Mola",
    sub: "Uzun mola — hak ettin, dinlen 🌿",
    bg: "#397097",
  },
  lunch: {
    label: "Öğle Arası",
    sub: "Afiyet olsun — sağlıklı bir öğün zamanı 🍽️",
    bg: "#b9770e",
  },
};

const TABS: { mode: PomoMode; label: string }[] = [
  { mode: "focus", label: "Odak" },
  { mode: "short", label: "Kısa Mola" },
  { mode: "long", label: "Uzun Mola" },
];

function mmss(sec: number): string {
  const s = Math.max(0, sec);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function PomodoroTimer() {
  const [config, setConfig] = useState<PomodoroConfig>(DEFAULT_POMODORO_CONFIG);
  const [mode, setMode] = useState<PomoMode>("focus");
  const [completedFocus, setCompletedFocus] = useState(0);
  const [remaining, setRemaining] = useState(
    DEFAULT_POMODORO_CONFIG.focusMin * 60,
  );
  const [running, setRunning] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const endRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);
  const notifAsked = useRef(false);
  // Interval içinde güncel değerlere erişmek için ref aynaları.
  const modeRef = useRef<PomoMode>("focus");
  const configRef = useRef<PomodoroConfig>(DEFAULT_POMODORO_CONFIG);

  // --- localStorage yükle ---
  useEffect(() => {
    try {
      const c = localStorage.getItem(CFG_KEY);
      const cfg = c ? { ...DEFAULT_POMODORO_CONFIG, ...JSON.parse(c) } : null;
      const snap = localStorage.getItem(SNAP_KEY);
      const m = localStorage.getItem(MUTE_KEY) === "1";
      mutedRef.current = m;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMuted(m);
      if (cfg) setConfig(cfg);
      if (snap) {
        const s = JSON.parse(snap) as {
          mode: PomoMode;
          completedFocus: number;
          remaining: number;
        };
        setMode(s.mode);
        setCompletedFocus(s.completedFocus);
        setRemaining(s.remaining);
      } else if (cfg) {
        setRemaining(cfg.focusMin * 60);
      }
    } catch {
      /* no-op */
    }
  }, []);

  // --- snapshot kaydet (çalışmıyorken) ---
  useEffect(() => {
    if (running) return;
    try {
      localStorage.setItem(
        SNAP_KEY,
        JSON.stringify({ mode, completedFocus, remaining }),
      );
    } catch {
      /* no-op */
    }
  }, [mode, completedFocus, remaining, running]);

  // --- Ses ---
  function ctx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!audioRef.current) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AC) audioRef.current = new AC();
    }
    void audioRef.current?.resume();
    return audioRef.current;
  }
  function beep(freq: number, at: number, dur: number, gain = 0.18) {
    const c = audioRef.current;
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    o.connect(g);
    g.connect(c.destination);
    const t = c.currentTime + at;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function playTick() {
    if (mutedRef.current || !ctx()) return;
    beep(1150, 0, 0.07, 0.12); // tik
    beep(820, 0.14, 0.07, 0.12); // tak
  }
  function playTransition(to: PomoMode) {
    if (mutedRef.current || !ctx()) return;
    if (to === "focus") {
      beep(523, 0, 0.16); // odağa dönüş — yükselen
      beep(784, 0.18, 0.22);
    } else {
      beep(784, 0, 0.16); // molaya geçiş — yumuşak inen
      beep(587, 0.18, 0.16);
      beep(440, 0.36, 0.24);
    }
  }
  function notify(to: PomoMode) {
    try {
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification(`${META[to].label} — UzmanDiyet`, {
          body: META[to].sub,
          tag: "pomodoro",
          silent: true,
        });
      }
    } catch {
      /* no-op */
    }
  }

  // --- Geri sayım döngüsü ---
  function clearTick() {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  useEffect(() => {
    if (!running) {
      clearTick();
      return;
    }
    tickRef.current = setInterval(() => {
      const left = Math.round((endRef.current - Date.now()) / 1000);
      if (left > 0) {
        setRemaining(left);
        return;
      }
      // Faz bitti → sıradaki moda geç (otomatik devam).
      setCompletedFocus((cf) => {
        const curMode = modeRef.current;
        const newCf = curMode === "focus" ? cf + 1 : cf;
        const next = nextMode(configRef.current, curMode, newCf);
        const sec = modeMinutes(configRef.current, next) * 60;
        endRef.current = Date.now() + sec * 1000;
        setRemaining(sec);
        setMode(next);
        playTransition(next);
        notify(next);
        return newCf;
      });
    }, 250);
    return clearTick;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Ref aynalarını güncel tut.
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  function start() {
    if (running) return;
    ctx();
    if (!notifAsked.current && typeof Notification !== "undefined") {
      notifAsked.current = true;
      if (Notification.permission === "default") {
        void Notification.requestPermission();
      }
    }
    playTick();
    const now = Date.now();
    endRef.current = now + remaining * 1000;
    setRunning(true);
    // Uygulama kapalıyken push için yaklaşan faz sınırlarını DB'ye yaz.
    void savePomodoroRun({
      phases: upcomingBoundaries(config, mode, completedFocus, remaining, now),
    });
  }
  function pause() {
    setRunning(false);
    setRemaining(Math.max(0, Math.round((endRef.current - Date.now()) / 1000)));
    void clearPomodoroRun();
  }
  function reset() {
    setRunning(false);
    setMode("focus");
    setCompletedFocus(0);
    setRemaining(config.focusMin * 60);
    void clearPomodoroRun();
  }
  function switchMode(m: PomoMode) {
    setRunning(false);
    setMode(m);
    setRemaining(modeMinutes(config, m) * 60);
    void clearPomodoroRun();
  }
  function toggleMute() {
    setMuted((v) => {
      const n = !v;
      mutedRef.current = n;
      try {
        localStorage.setItem(MUTE_KEY, n ? "1" : "0");
      } catch {
        /* no-op */
      }
      return n;
    });
  }

  function applyConfig(c: PomodoroConfig) {
    setConfig(c);
    try {
      localStorage.setItem(CFG_KEY, JSON.stringify(c));
    } catch {
      /* no-op */
    }
    setShowSettings(false);
    setRunning(false);
    setMode("focus");
    setCompletedFocus(0);
    setRemaining(c.focusMin * 60);
    void clearPomodoroRun();
  }

  const meta = META[mode];
  const phases = buildPhases(config);
  const total = modeMinutes(config, mode) * 60;
  const pct = total > 0 ? ((total - remaining) / total) * 100 : 0;

  return (
    <div
      className="min-h-[calc(100vh-7rem)] w-full transition-colors duration-700 ease-[var(--ease-out)]"
      style={{ backgroundColor: meta.bg }}
    >
      <div className="mx-auto w-full max-w-md px-4 py-8">
        {/* Timer kartı */}
        <div className="rounded-3xl bg-white/15 p-5 backdrop-blur-sm">
          <div className="flex justify-center gap-1">
            {TABS.map((t) => (
              <button
                key={t.mode}
                type="button"
                onClick={() => switchMode(t.mode)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm text-white/90 transition",
                  mode === t.mode
                    ? "bg-black/20 font-semibold"
                    : "hover:bg-white/10",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <p className="mt-4 text-center text-7xl font-extrabold tabular-nums tracking-tight text-white">
            {mmss(remaining)}
          </p>

          <div className="mx-auto mt-3 h-1 w-2/3 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white/80 transition-[width] duration-500 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={running ? pause : start}
              className="flex items-center gap-2 rounded-2xl bg-white px-10 py-3.5 text-lg font-bold tracking-wide uppercase shadow-[0_8px_20px_-6px_rgba(0,0,0,0.35)] transition-[transform,filter] duration-200 ease-[var(--ease-out)] hover:brightness-105 active:scale-[0.97]"
              style={{ color: meta.bg }}
            >
              {running ? (
                <>
                  <Pause className="h-5 w-5" /> Duraklat
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" /> Başlat
                </>
              )}
            </button>
            <button
              type="button"
              onClick={reset}
              aria-label="Sıfırla"
              className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 text-white transition hover:bg-white/25 active:scale-90"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-sm font-medium text-white/80">
          #{completedFocus + (mode === "focus" ? 1 : 0)} ·{" "}
          {mode === "focus"
            ? `${completedFocus} pomodoro tamamlandı`
            : meta.label}
        </p>
        <p className="mt-0.5 text-center text-white/90">{meta.sub}</p>

        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/25"
          >
            {muted ? (
              <VolumeX className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
            {muted ? "Ses kapalı" : "Ses açık"}
          </button>
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/25"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Süreleri ayarla
          </button>
        </div>

        {/* Plan görseli */}
        <div className="mt-5 rounded-2xl bg-white/10 p-3">
          <p className="mb-2 text-center text-xs font-semibold text-white/80">
            Günün planı
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {phases.map((p, i) => (
              <span
                key={i}
                className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white/90"
              >
                {META[p.kind].label} {p.min}′
              </span>
            ))}
          </div>
        </div>
      </div>

      {showSettings && (
        <SettingsPanel
          config={config}
          onSave={applyConfig}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

// --- Ayar paneli ---
function NumField({
  label,
  value,
  onChange,
  min,
  max,
  suffix = "dk",
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  suffix?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-gray-700 dark:text-gray-200">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-16 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-right text-sm tabular-nums dark:border-gray-700 dark:bg-gray-800"
        />
        <span className="text-xs text-gray-400">{suffix}</span>
      </span>
    </label>
  );
}

function SettingsPanel({
  config,
  onSave,
  onClose,
}: {
  config: PomodoroConfig;
  onSave: (c: PomodoroConfig) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState<PomodoroConfig>(config);
  const set = (p: Partial<PomodoroConfig>) =>
    setD((prev) => ({ ...prev, ...p }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="reveal max-h-[88vh] w-full max-w-sm space-y-4 overflow-y-auto rounded-3xl bg-white p-5 shadow-[var(--shadow-float)] dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="flex items-center gap-2 font-semibold">
          <SlidersHorizontal className="h-4 w-4 text-emerald-600" /> Pomodoro
          süreleri
        </h2>

        <div className="space-y-2.5">
          <NumField
            label="Odak süresi"
            value={d.focusMin}
            onChange={(n) => set({ focusMin: n })}
            min={1}
            max={120}
          />
          <NumField
            label="Kısa mola"
            value={d.shortBreakMin}
            onChange={(n) => set({ shortBreakMin: n })}
            min={1}
            max={60}
          />
          <NumField
            label="Uzun mola"
            value={d.longBreakMin}
            onChange={(n) => set({ longBreakMin: n })}
            min={1}
            max={90}
          />
          <NumField
            label="Uzun moladan önce pomodoro"
            value={d.periods}
            onChange={(n) => set({ periods: n })}
            min={1}
            max={12}
            suffix="adet"
          />
        </div>

        <div className="rounded-2xl border border-gray-100 p-3 dark:border-gray-800">
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={d.lunchEnabled}
              onChange={(e) => set({ lunchEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="flex items-center gap-1.5 font-medium">
              <Sun className="h-4 w-4 text-amber-500" /> Öğle arası ekle
            </span>
          </label>
          {d.lunchEnabled && (
            <div className="mt-3 space-y-2.5 border-t border-gray-100 pt-3 dark:border-gray-800">
              <NumField
                label="Kaçıncı pomodorodan sonra"
                value={d.lunchAfter}
                onChange={(n) => set({ lunchAfter: n })}
                min={1}
                max={Math.max(1, d.periods - 1)}
                suffix="sonra"
              />
              <NumField
                label="Öğle arası süresi"
                value={d.lunchMin}
                onChange={(n) => set({ lunchMin: n })}
                min={10}
                max={180}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium dark:border-gray-700"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={() => onSave(d)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Check className="h-4 w-4" /> Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
