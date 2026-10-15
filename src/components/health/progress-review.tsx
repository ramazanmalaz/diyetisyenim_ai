"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

import { reviewMyProgress } from "@/app/(app)/gelisim/actions";
import { triggerPremiumWall } from "@/lib/premium-wall";

/** Dönem verisini AI'a yorumlatır; sonuç kart içinde gösterilir. */
export function ProgressReview({ period }: { period: 7 | 30 }) {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await reviewMyProgress({ period });
      if ("quota" in res) triggerPremiumWall("chat");
      else if ("error" in res) setError(res.error);
      else setText(res.text);
    } catch {
      setError("Şu an değerlendirme yapılamıyor, tekrar dene.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-white p-4 shadow-[var(--shadow-soft)] dark:border-emerald-900/40 dark:from-emerald-950/30 dark:via-gray-900 dark:to-gray-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Diyet Asistanı değerlendirmesi</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Son {period} günün diyet, hareket, uyku ve kilo verisi birlikte.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-[background-color,transform,opacity] duration-200 ease-[var(--ease-out)] hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 active:scale-[0.97] disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {text ? "Yenile" : "Değerlendir"}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}
      {text && (
        <div className="step-in mt-3 space-y-1.5 text-sm leading-relaxed whitespace-pre-line text-gray-700 dark:text-gray-200">
          {text.replace(/\*\*/g, "")}
        </div>
      )}
    </section>
  );
}
