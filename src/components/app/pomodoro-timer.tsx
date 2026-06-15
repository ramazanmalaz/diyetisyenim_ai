"use client";

import {
  Bell,
  BellOff,
  Brain,
  Check,
  Coffee,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Timer,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import {
  clearPomodoroPlan,
  savePomodoroPlan,
  updatePomodoroState,
  type PomodoroPlan,
} from "@/app/(app)/pomodoro/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildSchedule,
  humanMinutes,
  minToHHMM,
  resumeIndex,
  segmentSeconds,
  type Schedule,
  type Segment,
} from "@/lib/pomodoro";
import { enablePush } from "@/lib/push-client";
import { cn } from "@/lib/utils";

function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function PomodoroTimer({ initialPlan }: { initialPlan: PomodoroPlan | null }) {
  const [plan, setPlan] = useState<PomodoroPlan | null>(initialPlan);

  if (!plan) {
    return <PomodoroSetup onCreated={setPlan} />;
  }
  return (
    <PomodoroRunner
      plan={plan}
      onReset={() => setPlan(null)}
      onMutedChange={(m) => setPlan((p) => (p ? { ...p, muted: m } : p))}
    />
  );
}

// ---------------------------------------------------------------------------
// Kurulum — çalışma penceresi + süreler
// ---------------------------------------------------------------------------
function PomodoroSetup({ onCreated }: { onCreated: (p: PomodoroPlan) => void }) {
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("12:00");
  const [workMin, setWorkMin] = useState("25");
  const [breakMin, setBreakMin] = useState("5");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Anlık önizleme — formdaki değerler geçerliyse planı göster.
  const preview = useMemo<Schedule | null>(() => {
    const sm = toMin(start);
    const em = toMin(end);
    const w = Number(workMin);
    const b = Number(breakMin);
    if (sm == null || em == null || em <= sm || !w || w < 1) return null;
    return buildSchedule({ startMin: sm, endMin: em, workMin: w, breakMin: b || 0 });
  }, [start, end, workMin, breakMin]);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await savePomodoroPlan({ start, end, workMin, breakMin });
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    // Panel kapalıyken de bildirim gelsin diye push iznini iste.
    void enablePush();
    onCreated(res.plan);
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-8">
      <header className="space-y-2 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
          <Timer className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Odak Zamanlayıcı</h1>
        <p className="mx-auto max-w-xs text-sm text-gray-500 dark:text-gray-400">
          Bugün hangi saat aralığında çalışacaksın? Aralığı seç; süreyi çalışma
          ve mola seanslarına biz bölelim, süre dolunca alarmla uyaralım.
        </p>
      </header>

      <div className="space-y-4 rounded-3xl border border-gray-200 bg-white/70 p-5 shadow-[var(--shadow-soft)] dark:border-gray-800 dark:bg-gray-900/50">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Başlangıç">
            <Input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <Field label="Bitiş">
            <Input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </Field>
          <Field label="Çalışma (dk)">
            <Input
              type="number"
              inputMode="numeric"
              min={5}
              max={180}
              value={workMin}
              onChange={(e) => setWorkMin(e.target.value)}
            />
          </Field>
          <Field label="Mola (dk)">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={60}
              value={breakMin}
              onChange={(e) => setBreakMin(e.target.value)}
            />
          </Field>
        </div>

        {preview && (
          <div className="rounded-2xl bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
            {preview.workSessions > 0 ? (
              <>
                <b>{preview.workSessions} çalışma seansı</b> ·{" "}
                {humanMinutes(preview.totalWorkMin)} çalışma
                {preview.totalBreakMin > 0 && (
                  <> · {humanMinutes(preview.totalBreakMin)} mola</>
                )}
                <div className="text-emerald-700/80 dark:text-emerald-300/70">
                  Tahmini bitiş: {minToHHMM(preview.finishMin)}
                </div>
              </>
            ) : (
              <span>Bu pencere bir çalışma seansına yetmiyor; süreyi artır.</span>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <Button
          type="button"
          disabled={busy || !preview || preview.workSessions === 0}
          onClick={submit}
          className="w-full"
        >
          {busy ? "Hazırlanıyor…" : "Planı oluştur"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function toMin(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

// ---------------------------------------------------------------------------
// Zamanlayıcı — geri sayım, alarm, sustur
// ---------------------------------------------------------------------------
type Toast = { id: number; text: string; tone: "work" | "break" | "done" } | null;

function PomodoroRunner({
  plan,
  onReset,
  onMutedChange,
}: {
  plan: PomodoroPlan;
  onReset: () => void;
  onMutedChange: (muted: boolean) => void;
}) {
  const schedule = useMemo(
    () =>
      buildSchedule({
        startMin: plan.start_min,
        endMin: plan.end_min,
        workMin: plan.work_min,
        breakMin: plan.break_min,
      }),
    [plan],
  );

  const startIdx = resumeIndex(schedule, plan.completed_sessions);
  const [segIndex, setSegIndex] = useState(startIdx);
  const [remaining, setRemaining] = useState(() =>
    startIdx < schedule.segments.length
      ? segmentSeconds(schedule.segments[startIdx])
      : 0,
  );
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(plan.completed_sessions);
  const [muted, setMuted] = useState(plan.muted);
  const [toast, setToast] = useState<Toast>(null);

  const endsAtRef = useRef<number>(0);
  const audioRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const finished = segIndex >= schedule.segments.length;
  const current: Segment | null = finished ? null : schedule.segments[segIndex];

  // --- Alarm: kısa bip dizisi + titreşim. Sustur açıkken hiçbir uyarı çıkmaz.
  const alarm = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = audioRef.current;
    if (ctx) {
      const now = ctx.currentTime;
      [0, 0.28, 0.56].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = i === 2 ? 1046 : 880; // son bip biraz tiz
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.5, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.24);
      });
    }
    navigator.vibrate?.([220, 120, 220]);
  }, []);

  const showToast = useCallback(
    (text: string, tone: "work" | "break" | "done") => {
      setToast({ id: Date.now(), text, tone });
    },
    [],
  );

  // Bir segment bittiğinde: çalışma ise ilerlemeyi kaydet, alarm ver, ilerle.
  // ring=false → manuel atlama (alarm çalmaz).
  const advance = useCallback(
    (ring: boolean) => {
      const cur = schedule.segments[segIndex];
      if (!cur) return;

      let nextCompleted = completed;
      if (cur.kind === "work") {
        nextCompleted = completed + 1;
        setCompleted(nextCompleted);
        void updatePomodoroState({ completedSessions: nextCompleted });
      }

      const nextIdx = segIndex + 1;
      const next = schedule.segments[nextIdx];

      if (ring) alarm();

      if (!next) {
        setSegIndex(nextIdx);
        setRemaining(0);
        setRunning(false);
        showToast("Tüm seanslar tamamlandı, harika iş! 🎉", "done");
        return;
      }

      setSegIndex(nextIdx);
      const dur = segmentSeconds(next);
      setRemaining(dur);
      endsAtRef.current = Date.now() + dur * 1000;
      if (ring) {
        showToast(
          next.kind === "work"
            ? `${next.session}. seans başlasın, odaklan!`
            : `Mola zamanı — ${next.endMin - next.startMin} dk dinlen.`,
          next.kind,
        );
      }
    },
    [schedule, segIndex, completed, alarm, showToast],
  );

  // En güncel advance'ı interval'a refle taşı (stale closure'dan kaçın).
  const advanceRef = useRef(advance);
  useEffect(() => {
    advanceRef.current = advance;
  }, [advance]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const left = Math.round((endsAtRef.current - Date.now()) / 1000);
      if (left <= 0) {
        advanceRef.current(true);
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [running]);

  // Toast'ı birkaç saniye sonra gizle.
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(id);
  }, [toast]);

  function ensureAudio() {
    if (!audioRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctx) audioRef.current = new Ctx();
    }
    void audioRef.current?.resume();
  }

  function toggleRun() {
    if (finished) return;
    if (running) {
      setRunning(false);
      return;
    }
    ensureAudio(); // kullanıcı jesti — alarm sesini açar
    endsAtRef.current = Date.now() + remaining * 1000;
    setRunning(true);
  }

  function skip() {
    if (finished) return;
    advance(false);
  }

  function resetAll() {
    setRunning(false);
    setSegIndex(0);
    setRemaining(
      schedule.segments.length ? segmentSeconds(schedule.segments[0]) : 0,
    );
    setCompleted(0);
    setToast(null);
    void updatePomodoroState({ completedSessions: 0 });
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    onMutedChange(next);
    void updatePomodoroState({ muted: next });
  }

  async function newPlan() {
    if (!window.confirm("Bugünkü plan silinsin ve yeni plan kuralım mı?")) return;
    setRunning(false);
    await clearPomodoroPlan();
    onReset();
  }

  const total = current ? segmentSeconds(current) : 1;
  const pct = current ? 1 - remaining / total : 1;
  const isBreak = current?.kind === "break";
  const accent = finished
    ? "text-gray-400"
    : isBreak
      ? "text-amber-500"
      : "text-emerald-600";
  const ringColor = finished ? "#9ca3af" : isBreak ? "#f59e0b" : "#059669";

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-8">
      {/* Üst bilgi + sustur */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Odak</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {minToHHMM(plan.start_min)}–{minToHHMM(plan.end_min)} ·{" "}
            {schedule.workSessions} seans · bitiş {minToHHMM(schedule.finishMin)}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleMute}
          aria-pressed={muted}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-[background-color,color,transform] duration-200 ease-[var(--ease-out)] active:scale-[0.95]",
            muted
              ? "bg-rose-100 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300"
              : "bg-white/70 text-gray-600 ring-black/5 hover:bg-gray-100 dark:bg-gray-900/50 dark:text-gray-300 dark:ring-white/10",
          )}
        >
          {muted ? (
            <BellOff className="h-4 w-4" strokeWidth={1.75} />
          ) : (
            <Bell className="h-4 w-4" strokeWidth={1.75} />
          )}
          {muted ? "Susturuldu" : "Sustur"}
        </button>
      </div>

      {muted && (
        <p className="rounded-xl bg-rose-50/80 px-3 py-2 text-center text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          Sesli uyarı kapalı — süre dolunca alarm çalmaz. Tekrar açmak için
          “Susturuldu”ya dokun.
        </p>
      )}

      {/* Geri sayım halkası */}
      <div className="relative mx-auto flex h-64 w-64 items-center justify-center">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-gray-200/70 dark:text-gray-800"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={ringColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 54}
            strokeDashoffset={2 * Math.PI * 54 * (1 - pct)}
            className="transition-[stroke-dashoffset] duration-300 ease-[var(--ease-out)]"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {finished ? (
            <>
              <Check className="h-9 w-9 text-emerald-600" strokeWidth={2} />
              <p className="mt-2 text-sm font-medium text-gray-500">Bitti</p>
            </>
          ) : (
            <>
              <span
                className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold tracking-[0.14em] uppercase",
                  accent,
                )}
              >
                {isBreak ? (
                  <Coffee className="h-3.5 w-3.5" strokeWidth={2} />
                ) : (
                  <Brain className="h-3.5 w-3.5" strokeWidth={2} />
                )}
                {isBreak ? "Mola" : "Çalışma"}
              </span>
              <span className="mt-1 text-6xl font-bold tabular-nums tracking-tight">
                {fmtClock(remaining)}
              </span>
              <span className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {current
                  ? `Seans ${current.session} / ${schedule.workSessions}`
                  : ""}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Kontroller */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={resetAll}
          aria-label="Sıfırla"
          className="flex h-11 w-11 items-center justify-center rounded-full text-gray-500 ring-1 ring-black/5 transition-[background-color,transform] duration-200 ease-[var(--ease-out)] hover:bg-gray-100 active:scale-[0.94] dark:ring-white/10 dark:hover:bg-gray-800"
        >
          <RotateCcw className="h-5 w-5" strokeWidth={1.75} />
        </button>

        <Button
          type="button"
          onClick={toggleRun}
          disabled={finished}
          className="h-14 w-40 gap-2 rounded-full text-base"
        >
          {running ? (
            <>
              <Pause className="h-5 w-5" /> Duraklat
            </>
          ) : (
            <>
              <Play className="h-5 w-5" /> {completed > 0 ? "Devam" : "Başlat"}
            </>
          )}
        </Button>

        <button
          type="button"
          onClick={skip}
          aria-label="Sonraki seansa atla"
          disabled={finished}
          className="flex h-11 w-11 items-center justify-center rounded-full text-gray-500 ring-1 ring-black/5 transition-[background-color,transform] duration-200 ease-[var(--ease-out)] hover:bg-gray-100 active:scale-[0.94] disabled:opacity-40 dark:ring-white/10 dark:hover:bg-gray-800"
        >
          <SkipForward className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      {/* Zaman çizelgesi */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
            Bugünün çizelgesi
          </h2>
          <button
            type="button"
            onClick={newPlan}
            className="text-xs text-gray-400 transition-colors duration-200 ease-[var(--ease-out)] hover:text-gray-600 hover:underline"
          >
            Yeni plan
          </button>
        </div>
        <ul className="space-y-1">
          {schedule.segments.map((seg, i) => {
            const done = i < segIndex;
            const active = i === segIndex && !finished;
            return (
              <li
                key={`${seg.kind}-${i}`}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-200",
                  active
                    ? seg.kind === "break"
                      ? "bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-900/50"
                      : "bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:ring-emerald-900/50"
                    : "bg-white/50 dark:bg-gray-900/40",
                  done && "opacity-55",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs",
                    seg.kind === "break"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
                  )}
                >
                  {done ? (
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  ) : seg.kind === "break" ? (
                    <Coffee className="h-3.5 w-3.5" strokeWidth={2} />
                  ) : (
                    seg.session
                  )}
                </span>
                <span className="font-medium">
                  {seg.kind === "break" ? "Mola" : `Çalışma ${seg.session}`}
                </span>
                <span className="ml-auto tabular-nums text-gray-500 dark:text-gray-400">
                  {minToHHMM(seg.startMin)}–{minToHHMM(seg.endMin)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Alarm/durum bildirimi */}
      {toast && (
        <div
          role="status"
          className={cn(
            "fixed inset-x-0 bottom-24 z-50 mx-auto w-fit max-w-[90vw] rounded-full px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-float)]",
            toast.tone === "break"
              ? "bg-amber-500"
              : toast.tone === "done"
                ? "bg-gray-800"
                : "bg-emerald-600",
          )}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
