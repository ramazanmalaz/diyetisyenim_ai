import { headers } from "next/headers";

/**
 * Capacitor WebView'in User-Agent'ına eklediğimiz imzalar
 * (bkz. capacitor.config.ts → ios/android.appendUserAgent).
 */
export const NATIVE_UA_MARKER = "UzmanDiyetiOS";
export const ANDROID_UA_MARKER = "UzmanDiyetAndroid";

/**
 * İstek mobil uygulamanın (iOS ya da Android) WebView'inden mi geliyor?
 *
 * App Store Guideline 3.1.1 ve Google Play ödeme politikası: uygulama içinde
 * mağazanın kendi ödeme sistemi dışında ücretli içerik sunulamaz ve kullanıcı
 * harici ödemeye yönlendirilemez. Uygulama siteyi WebView'de açtığı için ayrım
 * sunucuda yapılmalı — client tarafı gate'ler (WebOnly) yalnızca ikinci
 * savunma hattıdır, sunucudan üretilen metin ve entitlement'lara etki etmez.
 */
export async function isNativeRequest(): Promise<boolean> {
  const ua = (await headers()).get("user-agent") ?? "";
  return ua.includes(NATIVE_UA_MARKER) || ua.includes(ANDROID_UA_MARKER);
}
