"use client";

import { useEffect } from "react";

/**
 * Service worker'ı tüm sayfalarda (landing dahil) kaydeder — PWA kurulabilirliği
 * için. Push aboneliği ayrıca PushSetup'ta (uygulama içi) yapılır.
 */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
