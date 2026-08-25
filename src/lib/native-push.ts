"use client";

import { saveApnsToken } from "@/app/(app)/push/actions";

/**
 * iOS uygulaması (Capacitor) için push kaydı.
 *
 * WKWebView'da Web Push yok; native kabukta bildirimler APNs üzerinden gelir.
 * Bu modül yalnızca native'de çalışır, web tarafı `push-client.ts`'te kalır.
 */

type CapacitorKopru = { isNativePlatform?: () => boolean };

/**
 * Native kabukta mıyız? Capacitor köprüyü sayfa çalışmadan önce
 * `window.Capacitor` olarak enjekte ettiği için senkron kontrol edilebilir —
 * `isPushSupported()` senkron kalabilsin diye bu şekilde.
 */
export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  const c = (window as unknown as { Capacitor?: CapacitorKopru }).Capacitor;
  return Boolean(c?.isNativePlatform?.());
}

/** İzin iste → APNs'e kaydol → token'ı sunucuya yaz. */
export async function enableNativePush(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    let izin = await PushNotifications.checkPermissions();
    if (izin.receive === "prompt" || izin.receive === "prompt-with-rationale") {
      izin = await PushNotifications.requestPermissions();
    }
    if (izin.receive !== "granted") return false;

    // Token asenkron geliyor: register() çağrısından sonra "registration"
    // olayını beklemek gerekiyor.
    const token = await new Promise<string | null>((resolve) => {
      const zamanAsimi = setTimeout(() => resolve(null), 15000);
      void PushNotifications.addListener("registration", (t) => {
        clearTimeout(zamanAsimi);
        resolve(t.value);
      });
      void PushNotifications.addListener("registrationError", () => {
        clearTimeout(zamanAsimi);
        resolve(null);
      });
      void PushNotifications.register();
    });
    if (!token) return false;

    // Derlemenin hangi APNs ortamına kaydolduğunu WebView bilemez (Xcode
    // derlemesi sandbox, TestFlight/App Store production). Varsayılan
    // production gönderiliyor; sunucu ilk BadDeviceToken'da diğer ortamı
    // deneyip kaydı düzeltiyor (bkz. lib/push.ts).
    const sonuc = await saveApnsToken({ token, environment: "production" });
    return "ok" in sonuc;
  } catch {
    return false;
  }
}

/** Cihazda bildirim izni verilmiş mi? */
export async function nativePushIzinliMi(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const izin = await PushNotifications.checkPermissions();
    return izin.receive === "granted";
  } catch {
    return false;
  }
}

let dinleyiciKuruldu = false;

/**
 * Bildirime dokunulduğunda ilgili ekrana götürür.
 * Uygulama kabuğunda bir kez çağrılmalı (bkz. components/app/pwa-register.tsx).
 */
export async function nativePushDinleyicileriKur(): Promise<void> {
  if (!isNative() || dinleyiciKuruldu) return;
  dinleyiciKuruldu = true;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (olay) => {
        const url = (olay.notification.data as { url?: string })?.url;
        window.location.href = url ?? "/panel";
      },
    );
  } catch {
    dinleyiciKuruldu = false;
  }
}
