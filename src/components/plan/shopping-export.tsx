"use client";

import { ArrowRight, Check, Loader2, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { exportShoppingList } from "@/app/(app)/plan/shopping-actions";
import { SHOPPING_DAY_OPTIONS, type ShoppingDays } from "@/lib/plan/shopping";
import { triggerPremiumWall } from "@/lib/premium-wall";
import { cn } from "@/lib/utils";

/** Plandaki malzemeleri reyonlara göre gruplayıp Hatırlatıcı'ya liste olarak aktarır. */
export function ShoppingExport() {
  const [days, setDays] = useState<ShoppingDays>(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ listId: string; count: number } | null>(
    null,
  );

  async function run() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setDone(null);
    try {
      const res = await exportShoppingList({ days });
      if ("quota" in res) {
        triggerPremiumWall("chat");
      } else if ("error" in res) {
        setError(res.error);
      } else {
        setDone({ listId: res.listId, count: res.count });
      }
    } catch {
      setError("Alışveriş listesi şu an hazırlanamadı, tekrar dene.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-[var(--shadow-soft)] dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_8px_18px_-10px_rgb(11_109_72/0.7)]">
          <ShoppingCart className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold">Alışveriş listesi</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Planındaki malzemeleri sebze, meyve, bakliyat diye gruplayıp
            Hatırlatıcı&apos;ya ekleyelim.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div
          role="radiogroup"
          aria-label="Kaç günlük alışveriş"
          className="flex rounded-full bg-gray-100 p-1 dark:bg-gray-800"
        >
          {SHOPPING_DAY_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={days === d}
              onClick={() => setDays(d)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-[background-color,color] duration-200 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-emerald-500",
                days === d
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400",
              )}
            >
              {d} gün
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-[background-color,transform,opacity] duration-200 ease-[var(--ease-out)] hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Hazırlanıyor…
            </>
          ) : (
            "Hatırlatıcıya aktar"
          )}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}

      {done && (
        <Link
          href={`/hatirlatici?liste=${done.listId}`}
          className="group mt-3 flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 transition-[background-color] duration-200 ease-[var(--ease-out)] hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-100"
        >
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" strokeWidth={2.5} />
            {done.count} ürün Hatırlatıcı&apos;ya eklendi
          </span>
          <span className="flex items-center gap-1 font-semibold">
            Listeyi aç
            <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}
    </section>
  );
}
