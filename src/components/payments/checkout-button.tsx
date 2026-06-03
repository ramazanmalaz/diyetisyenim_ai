"use client";

import { useState } from "react";

import { startCheckout } from "@/app/(app)/abonelik/actions";
import { Button } from "@/components/ui/button";

export function CheckoutButton({ price }: { price: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    setLoading(true);
    const result = await startCheckout();
    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }
    window.location.href = result.paymentPageUrl;
  }

  return (
    <div className="space-y-2">
      <Button onClick={onClick} disabled={loading}>
        {loading ? "Ödemeye yönlendiriliyor…" : `${price} ₺ — Öde`}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
