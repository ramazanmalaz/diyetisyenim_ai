"use client";

import Link from "next/link";
import { useState } from "react";

import { startCheckout } from "@/app/(app)/abonelik/actions";
import { Button } from "@/components/ui/button";

export function CheckoutButton({
  price,
  plan = "monthly",
  label,
}: {
  price: string;
  plan?: "monthly" | "annual";
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!agreed) {
      setError("Devam etmek için sözleşmeleri onaylamalısın.");
      return;
    }
    setError(null);
    setLoading(true);
    const result = await startCheckout(plan);
    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }
    window.location.href = result.paymentPageUrl;
  }

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
        <span>
          <Link
            href="/on-bilgilendirme"
            target="_blank"
            className="text-emerald-600 underline"
          >
            Ön Bilgilendirme Formu
          </Link>{" "}
          ve{" "}
          <Link
            href="/mesafeli-satis"
            target="_blank"
            className="text-emerald-600 underline"
          >
            Mesafeli Satış Sözleşmesi
          </Link>
          ’ni okudum, onaylıyorum.
        </span>
      </label>

      <Button onClick={onClick} disabled={loading || !agreed}>
        {loading
          ? "Ödemeye yönlendiriliyor…"
          : (label ?? `${price} ₺ — Öde`)}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
