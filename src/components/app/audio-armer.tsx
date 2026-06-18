"use client";

import { useEffect } from "react";

import { armAlertSound } from "@/lib/alert-sound";

/**
 * İlk kullanıcı etkileşiminde (dokunuş/tık/tuş) uyarı ses motorunu açar; böylece
 * sonradan zamanlayıcıyla tetiklenen hatırlatıcı sesleri tarayıcı tarafından
 * engellenmeden duyulur. Tek seferlik; görünür UI yok.
 */
export function AudioArmer() {
  useEffect(() => {
    const arm = () => {
      armAlertSound();
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
    window.addEventListener("pointerdown", arm, { once: true });
    window.addEventListener("keydown", arm, { once: true });
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, []);
  return null;
}
