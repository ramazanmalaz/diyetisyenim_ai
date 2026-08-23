"use client";

import { savePushSubscription } from "@/app/(app)/push/actions";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Bu cihazda gerçekten geçerli bir push aboneliği var mı?
 * Tercihin açık olması yetmez — abonelik yoksa sunucu gönderecek bir hedef
 * bulamaz. Native WKWebView'da `PushManager` bulunmadığı için burası daima
 * `false` döner.
 */
export async function hasPushSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    return (await reg.pushManager.getSubscription()) !== null;
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

/** SW kaydet → bildirim izni iste → push'a abone ol → sunucuya kaydet. */
export async function enablePush(): Promise<boolean> {
  if (!isPushSupported() || !VAPID) return false;
  const reg = await registerServiceWorker();
  if (!reg) return false;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID),
    });
  }
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  const res = await savePushSubscription({
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  });
  return "ok" in res;
}

/** İzin zaten verilmişse aboneliği sessizce tazele/kaydet. */
export async function ensurePushSubscribed(): Promise<void> {
  if (!isPushSupported() || !VAPID) return;
  if (Notification.permission !== "granted") return;
  await enablePush();
}
