import { headers } from "next/headers";

/**
 * Capacitor WebView'in User-Agent'ına eklediğimiz imza
 * (bkz. capacitor.config.ts → ios.appendUserAgent).
 */
export const NATIVE_UA_MARKER = "UzmanDiyetiOS";

/**
 * İstek iOS uygulamasının WebView'inden mi geliyor?
 *
 * App Store Guideline 3.1.1: uygulama içinde ne ücretli içerik sunulabilir ne de
 * kullanıcı IAP dışı bir ödeme yöntemine yönlendirilebilir. Uygulama siteyi
 * WebView'de açtığı için ayrım sunucuda yapılmalı — client tarafı gate'ler
 * (WebOnly) yalnızca ikinci savunma hattıdır, sunucudan üretilen metin ve
 * entitlement'lara etki etmez.
 */
export async function isNativeRequest(): Promise<boolean> {
  const ua = (await headers()).get("user-agent") ?? "";
  return ua.includes(NATIVE_UA_MARKER);
}
