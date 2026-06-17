"use client";

const DISMISS_KEY = "pwa_install_dismissed";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün sessizlik

/** Uygulama zaten PWA olarak kurulu (tam ekran) mu? */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  // iOS Safari standalone bayrağı standart matchMedia'da yoktur.
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true;
  return mql || iosStandalone;
}

/** iOS / iPadOS cihaz mı? (iPadOS 13+ Safari masaüstü gibi davranır.) */
export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iPhone = /iphone|ipad|ipod/i.test(ua);
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iPhone || iPadOS;
}

/**
 * iOS'ta gerçek Safari mi? Yalnızca Safari'de "Ana Ekrana Ekle" vardır; iOS
 * üzerindeki Chrome/Firefox/Edge (CriOS/FxiOS/EdgiOS) bunu desteklemez.
 */
export function isIosSafari(): boolean {
  if (!isIos()) return false;
  return !/crios|fxios|edgios|opios/i.test(navigator.userAgent);
}

/** Kullanıcı yakın zamanda "Şimdi değil" dedi mi? */
export function isInstallDismissed(): boolean {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - ts < DISMISS_MS;
  } catch {
    return false;
  }
}

export function dismissInstall(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* no-op */
  }
}
