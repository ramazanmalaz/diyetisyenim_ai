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

  if (isNative) {
    return (
      <p className="rounded-xl bg-gray-50 px-4 py-3 text-center text-xs text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
        Premium&apos;a yalnızca uzmandiyet.com web sitesi üzerinden abone
        olunabilir.
      </p>
    );
  }

  return (
    <CheckoutButton
      price={price}
      plan={plan}
      label={label}
    />
  );
}
