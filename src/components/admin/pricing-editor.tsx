"use client";

import { useState } from "react";

import { savePricing } from "@/app/(admin)/yonetim/ayarlar/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Plan } from "@/lib/settings";

export function PricingEditor({
  monthly,
  annual,
}: {
  monthly: Plan;
  annual: Plan;
}) {
  const [mPrice, setMPrice] = useState(monthly.price);
  const [mTitle, setMTitle] = useState(monthly.title);
  const [mDays, setMDays] = useState(String(monthly.days));
  const [aPrice, setAPrice] = useState(annual.price);
  const [aTitle, setATitle] = useState(annual.title);
  const [aDays, setADays] = useState(String(annual.days));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await savePricing({
      monthlyPrice: mPrice,
      monthlyTitle: mTitle,
      monthlyDays: mDays,
      annualPrice: aPrice,
      annualTitle: aTitle,
      annualDays: aDays,
    });
    setBusy(false);
    setMsg(
      "error" in res
        ? { ok: false, text: res.error }
        : { ok: true, text: "Kaydedildi. Değişiklikler yayına yansıdı." },
    );
  }

  return (
    <div className="space-y-5">
      <PlanFields
        heading="Aylık paket"
        price={mPrice}
        setPrice={setMPrice}
        title={mTitle}
        setTitle={setMTitle}
        days={mDays}
        setDays={setMDays}
        unit="ay"
      />
      <PlanFields
        heading="Yıllık paket"
        price={aPrice}
        setPrice={setAPrice}
        title={aTitle}
        setTitle={setATitle}
        days={aDays}
        setDays={setADays}
        unit="yıl"
      />

      {msg && (
        <p className={msg.ok ? "text-sm text-emerald-600" : "text-sm text-red-600"}>
          {msg.text}
        </p>
      )}

      <Button type="button" onClick={save} disabled={busy} className="w-full">
        {busy ? "Kaydediliyor…" : "Kaydet"}
      </Button>

      <p className="text-xs text-gray-400">
        Not: iyzico tek ödeme = belirtilen gün kadar erişim. Otomatik yenileme
        yoktur. Fiyat 199.00 biçiminde (nokta ile).
      </p>
    </div>
  );
}

function PlanFields({
  heading,
  price,
  setPrice,
  title,
  setTitle,
  days,
  setDays,
  unit,
}: {
  heading: string;
  price: string;
  setPrice: (v: string) => void;
  title: string;
  setTitle: (v: string) => void;
  days: string;
  setDays: (v: string) => void;
  unit: string;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
      <p className="font-semibold">{heading}</p>
      <div className="space-y-1.5">
        <Label>Başlık</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Fiyat (₺ / {unit})</Label>
          <Input
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="199.00"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Süre (gün)</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
