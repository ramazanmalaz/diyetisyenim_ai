"use client";

/**
 * Platform algılayan ödeme sarmalayıcı.
 *
 * iOS native  →  NativeCheckoutButton (RevenueCat / StoreKit 2)
 * Web         →  CheckoutButton (iyzico — değişmez)
 *
 * İlk render'da `isNative` false; useEffect'te Capacitor sorgulanır.
 * Bu gecikme ~1 frame; kullanıcı fark etmez.
 */

import { useEffect, useState } from "react";

import { CheckoutButton } from "@/components/payments/checkout-button";
import { NativeCheckoutButton } from "@/components/payments/native-checkout-button";

type Props = {
  userId: string;
  price: string;
  plan: "monthly" | "annual";
  label?: string;
};

export function SmartCheckout({ userId, price, plan, label }: Props) {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    // Capacitor modülü yalnızca tarayıcı ortamında çalışır.
    import("@capacitor/core").then(({ Capacitor }) => {
      setIsNative(Capacitor.isNativePlatform());
    });
  }, []);

  if (isNative) {
    return (
      <NativeCheckoutButton
        userId={userId}
        plan={plan}
        label={label ?? `${plan === "monthly" ? "Aylık" : "Yıllık"} Al`}
      />
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
