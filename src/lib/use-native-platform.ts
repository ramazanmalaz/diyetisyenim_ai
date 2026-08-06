"use client";

import { useEffect, useState } from "react";

/**
 * Uygulama native kabukta mı (Capacitor WebView / iOS) çalışıyor?
 * `null` = henüz belirlenmedi (ilk render + Capacitor modülü yüklenene kadar).
 */
export function useIsNative(): boolean | null {
  const [isNative, setIsNative] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    import("@capacitor/core")
      .then(({ Capacitor }) => {
        if (active) setIsNative(Capacitor.isNativePlatform());
      })
      .catch(() => {
        // Capacitor yoksa web'deyiz.
        if (active) setIsNative(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return isNative;
}

/**
 * Ödeme/premium arayüzü gösterilsin mi?
 *
 * FAIL-CLOSED: yalnızca web olduğu KESİNLEŞİNCE true döner. Belirsizken (SSR
 * çıktısı, ilk render, Capacitor import'u başarısız) gizli kalır — App Store
 * incelemesinde ödeme arayüzünün bir kare bile görünmesi rede sebep olur
 * (Guideline 2.1(b): uygulamada premium referansı var ama IAP ürünü yok).
 */
export function useShowPayments(): boolean {
  return useIsNative() === false;
}
