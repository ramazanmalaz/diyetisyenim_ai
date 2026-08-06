"use client";

/**
 * Platform algılayan ödeme sarmalayıcı.
 *
 * iOS native  →  uygulama içinde satın alma yok (App Store 2.1(b)/3.1.1
 *                uyumu); premium'a yalnızca web üzerinden abone olunur.
 * Web         →  CheckoutButton (iyzico — değişmez)
 *
 * İlk render'da `isNative` false; useEffect'te Capacitor sorgulanır.
 * Bu gecikme ~1 frame; kullanıcı fark etmez.
 */

import { useEffect, useState } from "react";

import { CheckoutButton } from "@/components/payments/checkout-button";

type Props = {
  userId: string;
  price: string;
  plan: "monthly" | "annual";
  label?: string;
};

export function SmartCheckout({ price, plan, label }: Props) {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    // Capacitor modülü yalnızca tarayıcı ortamında çalışır.
    import("@capacitor/core").then(({ Capacitor }) => {
      setIsNative(Capacitor.isNativePlatform());
    });
  }, []);

  // Native kabukta hiçbir şey render etme. Dış siteye yönlendiren bir metin
  // bile App Store'da anti-steering ihlali sayılır (Guideline 3.1.1).
  // Not: /abonelik sayfası zaten <WebOnly> ile sarılı; bu ikinci savunma hattı.
  if (isNative) return null;

  return (
    <CheckoutButton
      price={price}
      plan={plan}
      label={label}
    />
  );
}
