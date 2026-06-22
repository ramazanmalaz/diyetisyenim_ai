"use client";

import { Check, Crown, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  PREMIUM_WALL_EVENT,
  type PremiumWallKind,
} from "@/lib/premium-wall";

const BENEFITS = [
  "Sınırsız AI diyetisyen sohbeti",
  "Sınırsız fotoğraf & tabak analizi",
  "Hazır planını sınırsız okutma",
  "Yeni özelliklere öncelikli erişim",
];

export function PremiumWall({ monthlyPrice }: { monthlyPrice?: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PremiumWallKind>("chat");

  useEffect(() => {
    function onTrigger(e: Event) {
      const detail = (e as CustomEvent<{ kind?: PremiumWallKind }>).detail;
      setKind(detail?.kind ?? "chat");
      setOpen(true);
    }
    window.addEventListener(PREMIUM_WALL_EVENT, onTrigger);
    return () => window.removeEventListener(PREMIUM_WALL_EVENT, onTrigger);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const headline =
    kind === "vision"
      ? "Bugünkü ücretsiz fotoğraf analizi hakkın doldu"
      : "Bugünkü ücretsiz sohbet hakkın doldu";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={() => setOpen(false)}
    >
      <div
        className="reveal w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-float)] dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Üst görsel bant */}
        <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 px-6 pt-6 pb-7 text-white">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Kapat"
            className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white transition hover:bg-white/30 active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20">
            <Crown className="h-6 w-6" strokeWidth={2} />
          </span>
          <h2 className="mt-3 text-xl font-extrabold tracking-tight">
            Premium&apos;a geç
          </h2>
          <p className="mt-1 text-sm text-emerald-50/90">{headline}</p>
        </div>

        {/* Faydalar */}
        <div className="space-y-3 px-6 py-5">
          <ul className="space-y-2">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="text-gray-700 dark:text-gray-200">{b}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/abonelik"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(5,150,105,0.7)] transition-[transform,filter] duration-200 ease-[var(--ease-out)] hover:brightness-105 active:scale-[0.98]"
          >
            <Crown className="h-4 w-4" />
            {monthlyPrice
              ? `Premium'a geç · ${monthlyPrice} ₺/ay`
              : "Premium'a geç"}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full text-center text-xs text-gray-400 transition hover:text-gray-600"
          >
            Yarın tekrar denerim
          </button>
        </div>
      </div>
    </div>
  );
}
