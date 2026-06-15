"use client";

import { useEffect } from "react";

import { ensurePushSubscribed, registerServiceWorker } from "@/lib/push-client";

/**
 * Service worker'ı kaydeder ve izin zaten verilmişse push aboneliğini tazeler.
 * Görünür bir UI yoktur; layout'ta bir kez mount edilir.
 */
export function PushSetup() {
  useEffect(() => {
    void registerServiceWorker();
    void ensurePushSubscribed();
  }, []);
  return null;
}
