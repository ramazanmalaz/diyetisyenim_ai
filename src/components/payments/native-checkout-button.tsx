"use client";

import { useEffect, useState } from "react";
import { RotateCcw, ShieldCheck, Sparkles } from "lucide-react";

import {
  initRevenueCat,
  getOffering,
  purchasePackage,
  restorePurchases,
  type RcOffering,
  type PurchasesPackage,
} from "@/lib/purchases/revenuecat";

type Props = {
  userId: string;
  plan: "monthly" | "annual";
  label: string;
};

type State = "idle" | "loading" | "success" | "error";

export function NativeCheckoutButton({ userId, plan, label }: Props) {
  const [offering, setOffering] = useState<RcOffering | null>(null);
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    initRevenueCat(userId)
      .then(() => getOffering())
      .then(setOffering)
      .catch(() => setError("Ürünler yüklenemedi."));
  }, [userId]);

  async function handlePurchase() {
    const pkg: PurchasesPackage | null =
      plan === "monthly" ? (offering?.monthly ?? null) : (offering?.annual ?? null);
    if (!pkg) {
      setError("Ürün bulunamadı. Lütfen tekrar dene.");
      return;
    }

    setState("loading");
    setError(null);

    try {
      const { success } = await purchasePackage(pkg);
      if (success) {
        setState("success");
      } else {
        // Kullanıcı iptal etti
        setState("idle");
      }
    } catch {
      setState("error");
      setError("Satın alma tamamlanamadı. Lütfen tekrar dene.");
    }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      const active = await restorePurchases();
      if (active) {
        setState("success");
      } else {
        setError("Aktif abonelik bulunamadı.");
      }
    } catch {
      setError("Geri yükleme başarısız.");
    } finally {
      setRestoring(false);
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-xl bg-emerald-50 px-4 py-4 text-center dark:bg-emerald-950/40">
        <p className="font-semibold text-emerald-700 dark:text-emerald-300">
          ✓ Premium aktif!
        </p>
        <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
          Uygulamayı yeniden başlatırsan değişiklikler görünür.
        </p>
      </div>
    );
  }

  const ready = !!offering && state !== "loading";

  return (
    <div className="space-y-3">
      <button
        onClick={handlePurchase}
        disabled={!ready}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3 text-sm font-bold text-white shadow-md transition-[transform,opacity] duration-200 ease-out hover:opacity-90 active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-black"
      >
        <Sparkles className="h-4 w-4" />
        {state === "loading" ? "İşleniyor…" : label}
      </button>

      {error && (
        <p className="text-center text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        Ödeme Apple üzerinden güvenli şekilde işlenir
      </div>

      <button
        onClick={handleRestore}
        disabled={restoring}
        className="flex w-full items-center justify-center gap-1.5 text-xs text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline"
      >
        <RotateCcw className="h-3 w-3" />
        {restoring ? "Yükleniyor…" : "Satın alımı geri yükle"}
      </button>
    </div>
  );
}
