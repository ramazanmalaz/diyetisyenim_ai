"use client";

import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ImageUp,
  MapPin,
  Minus,
  RefreshCw,
  Ruler,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { scanWatermelon } from "@/app/(app)/karpuz/actions";
import { Watermelon } from "@/components/icons/watermelon";
import type { WatermelonResult } from "@/lib/ai/watermelon";
import { cn } from "@/lib/utils";

const SERVINGS = [
  "1-2 kişilik",
  "3-4 kişilik",
  "5-6 kişilik",
  "kalabalık (7+)",
];

const AUTO_INTERVAL_MS = 4500;

type Capture = { base64: string; mediaType: "image/jpeg"; dataUrl: string };

export function WatermelonScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [camReady, setCamReady] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [auto, setAuto] = useState(false);
  const [result, setResult] = useState<WatermelonResult | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [servings, setServings] = useState(SERVINGS[1]);
  // Manuel çekim/yüklemede kareyi dondurup üstüne işaret koyarız.
  const [shot, setShot] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Dahili kamerayı başlat (telefonun kendi kamera uygulamasını açmaz).
  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCamReady(true);
      } catch {
        setCamError(
          "Kameraya erişilemedi. Fotoğraf yükleyerek de karpuz analizi yapabilirsin.",
        );
      }
    }
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const captureFrame = useCallback((): Capture | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return null;
    const maxW = 1024;
    const scale = Math.min(1, maxW / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    return {
      base64: dataUrl.split(",")[1] ?? "",
      mediaType: "image/jpeg",
      dataUrl,
    };
  }, []);

  const runAnalysis = useCallback(
    async (cap: Capture | null, freeze = false) => {
      if (!cap || !cap.base64) return;
      if (freeze) setShot(cap.dataUrl);
      setShowDetails(false);
      setAnalyzing(true);
      setResultError(null);
      const res = await scanWatermelon({
        imageBase64: cap.base64,
        mediaType: cap.mediaType,
        servings,
      });
      setAnalyzing(false);
      if ("error" in res) {
        setResultError(res.error);
      } else {
        setResult(res.result);
      }
    },
    [servings],
  );

  function retake() {
    setShot(null);
    setResult(null);
    setResultError(null);
  }

  // Otomatik tarama: açıkken belirli aralıkla kareyi analiz eder.
  useEffect(() => {
    if (!auto || !camReady) return;
    let stop = false;
    const tick = async () => {
      if (stop) return;
      if (!analyzing) await runAnalysis(captureFrame());
    };
    const id = setInterval(tick, AUTO_INTERVAL_MS);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [auto, camReady, analyzing, captureFrame, runAnalysis]);

  function onCapture() {
    if (analyzing) return;
    void runAnalysis(captureFrame(), true);
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      // Büyük telefon fotoğraflarını da küçült (API görsel boyut limiti ≈5 MB).
      const cap = await fileToScaledCapture(file);
      await runAnalysis(cap, true);
    } catch {
      setResultError("Görsel okunamadı, başka bir fotoğraf dene.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-8">
      <div className="text-center">
        <span className="reveal inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-emerald-700 uppercase ring-1 ring-black/5 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-white/10">
          <Watermelon className="h-3.5 w-3.5" strokeWidth={1.75} /> Karpuz
          Seçici
        </span>
        <h1 className="reveal mt-3 text-3xl font-extrabold tracking-tight text-balance">
          Doğru karpuzu birlikte bulalım
        </h1>
        <p className="reveal mx-auto mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Karpuzu çerçeveye al; olgunluk işaretlerini okuyup en tatlısını
          önereyim. İstersen kaç kişilik aradığını da seç.
        </p>
      </div>

      {/* Kaç kişilik? */}
      <div className="reveal">
        <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          Kaç kişilik karpuz arıyorsun?
        </p>
        <div className="flex flex-wrap gap-2">
          {SERVINGS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setServings(s)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition-[background-color,color,transform] duration-200 ease-[var(--ease-out)] active:scale-[0.96]",
                servings === s
                  ? "bg-emerald-600 text-white shadow-[0_8px_18px_-10px_rgb(11_109_72/0.7)]"
                  : "bg-white/70 text-gray-600 ring-1 ring-black/5 hover:bg-white dark:bg-white/5 dark:text-gray-300 dark:ring-white/10",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Kamera çerçevesi — Double-Bezel */}
      <div className="reveal rounded-[1.75rem] bg-white/40 p-1.5 shadow-[var(--shadow-float)] ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
        <div
          className={cn(
            "relative overflow-hidden rounded-[calc(1.75rem-0.375rem)] bg-gray-900",
            !shot && "aspect-[3/4]",
          )}
        >
          {shot ? (
            // Donmuş kare + alınacak karpuzun işareti
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shot} alt="Çekilen karpuz" className="block w-full" />
              {result?.detected &&
                result.box.w > 0.02 &&
                result.box.h > 0.02 && <PickMarker box={result.box} />}
            </div>
          ) : camError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <Watermelon
                className="h-10 w-10 text-emerald-400"
                strokeWidth={1.5}
              />
              <p className="text-sm text-gray-200">{camError}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              {/* Tarama köşeleri */}
              <div className="pointer-events-none absolute inset-5 rounded-2xl border border-white/30">
                <Corner className="-top-px -left-px" />
                <Corner className="-top-px -right-px rotate-90" />
                <Corner className="-right-px -bottom-px rotate-180" />
                <Corner className="-bottom-px -left-px -rotate-90" />
              </div>
              {/* Otomatik toggle */}
              <button
                type="button"
                onClick={() => setAuto((v) => !v)}
                className={cn(
                  "absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur transition-[background-color,transform] duration-200 ease-[var(--ease-out)] active:scale-[0.95]",
                  auto
                    ? "bg-emerald-500 text-white"
                    : "bg-black/40 text-white/90",
                )}
                aria-pressed={auto}
              >
                <Zap
                  className="h-3.5 w-3.5"
                  strokeWidth={2}
                  fill={auto ? "currentColor" : "none"}
                />
                Otomatik
              </button>
            </>
          )}
          {/* Analiz sırasında tarama çizgisi (canlı + donmuş kare) */}
          {analyzing && (
            <>
              <div className="scanline pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-400/40 to-transparent" />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
                Analiz ediliyor…
              </div>
            </>
          )}
        </div>
      </div>

      {/* Kontroller */}
      {shot ? (
        <button
          type="button"
          onClick={retake}
          disabled={analyzing}
          className="reveal mx-auto flex items-center gap-2 rounded-full bg-white/70 px-5 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-black/5 transition-[background-color,transform] duration-200 ease-[var(--ease-out)] hover:bg-white active:scale-[0.97] disabled:opacity-50 dark:bg-white/5 dark:text-gray-200 dark:ring-white/10"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={1.75} /> Yeniden çek
        </button>
      ) : (
        <div className="reveal flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/70 text-gray-600 ring-1 ring-black/5 transition-[background-color,transform] duration-200 ease-[var(--ease-out)] hover:bg-white active:scale-[0.94] dark:bg-white/5 dark:text-gray-300 dark:ring-white/10"
            aria-label="Fotoğraf yükle"
          >
            <ImageUp className="h-5 w-5" strokeWidth={1.75} />
          </button>

          <button
            type="button"
            onClick={onCapture}
            disabled={analyzing || (!camReady && !camError)}
            className="group flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_10px_28px_-8px_rgb(11_109_72/0.7)] transition-transform duration-200 ease-[var(--ease-out)] active:scale-[0.92] disabled:opacity-50"
            aria-label="Analiz et"
          >
            <Camera
              className="h-7 w-7 transition-transform duration-200 ease-[var(--ease-out)] group-active:scale-90"
              strokeWidth={1.75}
            />
          </button>

          <div className="h-12 w-12" aria-hidden />
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onUpload}
      />
      <canvas ref={canvasRef} className="hidden" />

      {resultError && (
        <p className="reveal rounded-2xl bg-rose-50 px-4 py-3 text-center text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          {resultError}
        </p>
      )}

      {result && (
        <ResultCard
          result={result}
          open={showDetails}
          onToggle={() => setShowDetails((v) => !v)}
        />
      )}
    </div>
  );
}

function Corner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "absolute h-5 w-5 rounded-tl-lg border-t-2 border-l-2 border-emerald-400",
        className,
      )}
    />
  );
}

const VERDICT: Record<
  WatermelonResult["verdict"],
  { label: string; text: string; stroke: string }
> = {
  great: {
    label: "Harika seçim",
    text: "text-emerald-700 dark:text-emerald-300",
    stroke: "stroke-emerald-500",
  },
  good: {
    label: "İyi karpuz",
    text: "text-emerald-700 dark:text-emerald-300",
    stroke: "stroke-emerald-500",
  },
  average: {
    label: "İdare eder",
    text: "text-amber-700 dark:text-amber-300",
    stroke: "stroke-amber-500",
  },
  poor: {
    label: "Başka bak",
    text: "text-rose-700 dark:text-rose-300",
    stroke: "stroke-rose-500",
  },
  unknown: {
    label: "Karpuz görünmüyor",
    text: "text-gray-600 dark:text-gray-300",
    stroke: "stroke-gray-400",
  },
};

const SIZE_FIT_LABEL: Record<WatermelonResult["size_fit"], string> = {
  small: "Aradığına göre küçük",
  fits: "Boyu tam uygun",
  large: "Aradığına göre büyük",
  unknown: "Boy belirsiz",
};

function ResultCard({
  result,
  open,
  onToggle,
}: {
  result: WatermelonResult;
  open: boolean;
  onToggle: () => void;
}) {
  const v = VERDICT[result.verdict];

  if (!result.detected) {
    return (
      <div className="reveal rounded-[1.5rem] bg-white/70 p-5 text-center shadow-[var(--shadow-soft)] ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
        <Watermelon
          className="mx-auto h-9 w-9 text-emerald-500"
          strokeWidth={1.5}
        />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {result.recommendation}
        </p>
      </div>
    );
  }

  return (
    <div className="reveal space-y-4 rounded-[1.5rem] bg-white/70 p-5 shadow-[var(--shadow-float)] ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
      {/* Özet: skor + verdict */}
      <div className="flex items-center gap-4">
        <ScoreRing score={result.score} strokeClass={v.stroke} />
        <div className="min-w-0">
          <p className={cn("text-lg font-bold", v.text)}>{v.label}</p>
          {result.count > 1 && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
              İşaretli karpuz: {result.best_location}
            </p>
          )}
        </div>
      </div>

      {/* Tavsiye (özet, her zaman görünür) */}
      <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        {result.recommendation}
      </p>

      {/* Detay aç/kapat */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl bg-black/[0.03] px-3 py-2 text-sm font-medium text-gray-600 transition-[background-color] duration-200 ease-[var(--ease-out)] hover:bg-black/[0.06] dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
      >
        {open ? "Analizi gizle" : "Analizi göster"}
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200 ease-[var(--ease-out)]",
            open && "rotate-180",
          )}
          strokeWidth={1.75}
        />
      </button>

      {open && (
        <div className="step-in space-y-4">
          {/* Olgunluk ipuçları */}
          {result.signals.length > 0 && (
            <ul className="space-y-2">
              {result.signals.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <SignalIcon status={s.status} />
                  <span className="min-w-0">
                    <span className="font-medium">{s.label}: </span>
                    <span className="text-gray-600 dark:text-gray-300">
                      {s.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Boy / kişi sayısı */}
          <div className="flex items-start gap-2.5 border-t border-black/5 pt-3 text-sm dark:border-white/10">
            <Ruler
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
              strokeWidth={1.75}
            />
            <span className="min-w-0">
              <span className="font-medium">
                {result.size_estimate} · {SIZE_FIT_LABEL[result.size_fit]}
              </span>
              <span className="mt-0.5 block text-gray-600 dark:text-gray-300">
                {result.size_advice}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Çekilen kare üzerinde alınacak karpuzu işaretleyen kutu + etiket. */
function PickMarker({
  box,
}: {
  box: { x: number; y: number; w: number; h: number };
}) {
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: `${box.x * 100}%`,
        top: `${box.y * 100}%`,
        width: `${box.w * 100}%`,
        height: `${box.h * 100}%`,
      }}
    >
      <div className="marker-pulse absolute inset-0 rounded-2xl ring-2 ring-emerald-400 ring-offset-2 ring-offset-black/20" />
      <span className="absolute top-1 left-1 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-white shadow-md">
        <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} /> Bunu al
      </span>
    </div>
  );
}

function ScoreRing({
  score,
  strokeClass,
}: {
  score: number;
  strokeClass: string;
}) {
  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
      <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          strokeWidth="3"
          className="stroke-gray-100 dark:stroke-gray-800"
        />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          className={cn("gauge-arc", strokeClass)}
          strokeDasharray={2 * Math.PI * 15.5}
          strokeDashoffset={2 * Math.PI * 15.5 * (1 - score / 100)}
        />
      </svg>
      <span className="absolute text-base font-extrabold tabular-nums">
        {score}
      </span>
    </div>
  );
}

function SignalIcon({ status }: { status: "good" | "bad" | "neutral" }) {
  if (status === "good") {
    return (
      <CheckCircle2
        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
        strokeWidth={2}
      />
    );
  }
  if (status === "bad") {
    return (
      <AlertTriangle
        className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
        strokeWidth={2}
      />
    );
  }
  return (
    <Minus className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} />
  );
}

/** Yüklenen görseli max 1024px'e küçültüp JPEG base64 üretir (EXIF döndürmesiyle). */
async function fileToScaledCapture(file: File): Promise<Capture> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  }).catch(() => createImageBitmap(file));
  const maxW = 1024;
  const scale = Math.min(1, maxW / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas yok");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  return {
    base64: dataUrl.split(",")[1] ?? "",
    mediaType: "image/jpeg",
    dataUrl,
  };
}
