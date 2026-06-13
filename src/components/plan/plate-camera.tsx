"use client";

import { Camera, ImageUp, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** Canvas'ı sıkıştırılmış JPEG File'a çevirir. */
function canvasToFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("blob yok"));
        resolve(new File([blob], name, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.82,
    );
  });
}

/** Yüklenen görseli max 1024px'e küçültüp JPEG File üretir (EXIF döndürmesiyle). */
async function fileToScaledFile(file: File): Promise<File> {
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
  return canvasToFile(canvas, "tabak.jpg");
}

/**
 * Dahili kamera modalı (karpuz tarayıcısıyla aynı dil): telefonun kendi kamera
 * uygulamasını açmaz; sayfa içinde canlı kamerayı gösterir, kareyi yakalar.
 * Kamera yoksa fotoğraf yükleme fallback'i sunar. Yakalanan kare File olarak döner.
 */
export function PlateCamera({
  open,
  title,
  onClose,
  onCapture,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camReady, setCamReady] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
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
          "Kameraya erişilemedi. Aşağıdaki butonla fotoğraf da yükleyebilirsin.",
        );
      }
    }
    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCamReady(false);
      setCamError(null);
    };
  }, [open]);

  const capture = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    const maxW = 1024;
    const scale = Math.min(1, maxW / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const file = await canvasToFile(canvas, "tabak.jpg");
    onCapture(file);
    onClose();
  }, [onCapture, onClose]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const scaled = await fileToScaledFile(file);
      onCapture(scaled);
      onClose();
    } catch {
      setCamError("Görsel okunamadı, başka bir fotoğraf dene.");
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between text-white">
          <p className="text-sm font-semibold">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition-[background-color,transform] duration-200 ease-[var(--ease-out)] hover:bg-white/25 active:scale-[0.94]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Kamera çerçevesi — Double-Bezel (karpuz tasarımı) */}
        <div className="rounded-[1.75rem] bg-white/10 p-1.5 ring-1 ring-white/15">
          <div className="relative aspect-[3/4] overflow-hidden rounded-[calc(1.75rem-0.375rem)] bg-gray-900">
            {camError ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <Camera className="h-10 w-10 text-emerald-400" strokeWidth={1.5} />
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
              </>
            )}
          </div>
        </div>

        {/* Kontroller: yükle + çek */}
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white transition-[background-color,transform] duration-200 ease-[var(--ease-out)] hover:bg-white/25 active:scale-[0.94]"
            aria-label="Fotoğraf yükle"
          >
            <ImageUp className="h-5 w-5" strokeWidth={1.75} />
          </button>

          <button
            type="button"
            onClick={capture}
            disabled={!camReady}
            className="group flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_10px_28px_-8px_rgb(11_109_72/0.7)] transition-transform duration-200 ease-[var(--ease-out)] active:scale-[0.92] disabled:opacity-50"
            aria-label="Tabağı çek"
          >
            <Camera
              className="h-7 w-7 transition-transform duration-200 ease-[var(--ease-out)] group-active:scale-90"
              strokeWidth={1.75}
            />
          </button>

          <div className="h-12 w-12" aria-hidden />
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onUpload}
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
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
