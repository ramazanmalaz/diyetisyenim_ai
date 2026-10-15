"use client";

import { saveApnsToken, saveFcmToken } from "@/app/(app)/push/actions";

/**
 * iOS uygulaması (Capacitor) için push kaydı.
 *
 * iOS (WKWebView) ve Android WebView'da Web Push yok; native kabukta bildirimler
 * iOS'ta APNs, Android'de FCM üzerinden gelir. Bu modül yalnızca native'de
 * çalışır, web tarafı `push-client.ts`'te kalır.
 */

type CapacitorKopru = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function kopru(): CapacitorKopru | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorKopru }).Capacitor;
}

/** "ios" | "android" | "web" */
export function nativePlatform(): string {
  return kopru()?.getPlatform?.() ?? "web";
}

// Sunucu aynı kimliği kullanır (bkz. lib/fcm.ts ANDROID_KANAL).
const ANDROID_KANAL = "genel";

/**
 * Native kabukta mıyız? Capacitor köprüyü sayfa çalışmadan önce
 * `window.Capacitor` olarak enjekte ettiği için senkron kontrol edilebilir —
 * `isPushSupported()` senkron kalabilsin diye bu şekilde.
 */
export function isNative(): boolean {
  return Boolean(kopru()?.isNativePlatform?.());
}

/** İzin iste → APNs/FCM'e kaydol → token'ı sunucuya yaz. */
export async function enableNativePush(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    let izin = await PushNotifications.checkPermissions();
    if (izin.receive === "prompt" || izin.receive === "prompt-with-rationale") {
      izin = await PushNotifications.requestPermissions();
    }
    if (izin.receive !== "granted") return false;

    const android = nativePlatform() === "android";
    if (android) {
      // Android 8+ bildirimleri bir kanala düşer; yoksa FCM varsayılan kanalı
      // "Diğer" adıyla açar. Var olan kanalı yeniden oluşturmak zararsız.
      await PushNotifications.createChannel({
        id: ANDROID_KANAL,
        name: "Bildirimler",
        description: "Öğün, su ve grup hatırlatmaları",
        importance: 4,
        visibility: 1,
      }).catch(() => {});
    }

    // Token asenkron geliyor: register() çağrısından sonra "registration"
    // olayını beklemek gerekiyor.
    let bitir: (t: string | null) => void = () => {};
    const kayit = await PushNotifications.addListener("registration", (t) =>
      bitir(t.value),
    );
    const hata = await PushNotifications.addListener("registrationError", () =>
      bitir(null),
    );
    const token = await new Promise<string | null>((resolve) => {
      const zamanAsimi = setTimeout(() => resolve(null), 15000);
      bitir = (t) => {
        clearTimeout(zamanAsimi);
        resolve(t);
      };
      void PushNotifications.register();
    });
    // Her açılışta çağrıldığı için dinleyiciler birikmesin.
    void kayit.remove();
    void hata.remove();
    if (!token) return false;

    if (android) {
      const sonuc = await saveFcmToken({ token });
      return "ok" in sonuc;
    }

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
