"use client";

import { useState } from "react";

import { savePricing } from "@/app/(admin)/yonetim/ayarlar/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PricingEditor({
  initial,
}: {
  initial: { price: string; title: string; premiumDays: number };
}) {
  const [price, setPrice] = useState(initial.price);
  const [title, setTitle] = useState(initial.title);
  const [premiumDays, setPremiumDays] = useState(String(initial.premiumDays));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await savePricing({ price, title, premiumDays });
    setBusy(false);
    if ("error" in res) {
      setMsg({ ok: false, text: res.error });
      return;
    }
    setMsg({ ok: true, text: "Kaydedildi. Değişiklikler yayına yansıdı." });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
      <div className="space-y-1.5">
        <Label htmlFor="title">Tarife başlığı</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Premium (Aylık)"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="price">Fiyat (₺)</Label>
          <Input
            id="price"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="199.00"
          />
          <p className="text-xs text-gray-400">Örn. 199.00 (nokta ile)</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="days">Erişim süresi (gün)</Label>
          <Input
            id="days"
            type="number"
            inputMode="numeric"
            value={premiumDays}
            onChange={(e) => setPremiumDays(e.target.value)}
            placeholder="30"
          />
        </div>
      </div>

      {msg && (
        <p
          className={
            msg.ok
              ? "text-sm text-emerald-600"
              : "text-sm text-red-600"
          }
        >
          {msg.text}
        </p>
      )}

      <Button type="button" onClick={save} disabled={busy} className="w-full">
        {busy ? "Kaydediliyor…" : "Kaydet"}
      </Button>

      <p className="text-xs text-gray-400">
        Not: iyzico tek ödeme = belirtilen gün kadar erişim. Otomatik yenileme
        yoktur.
      </p>
    </div>
  );
}
