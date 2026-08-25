"use client";

import { useEffect } from "react";

import { nativePushDinleyicileriKur } from "@/lib/native-push";

/**
 * Service worker'ı tüm sayfalarda (landing dahil) kaydeder — PWA kurulabilirliği
 * için. Push aboneliği ayrıca PushSetup'ta (uygulama içi) yapılır.
 */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    // Native'de bildirime dokunulduğunda ilgili ekrana gitsin.
    void nativePushDinleyicileriKur();
  }, []);
  return null;
}
