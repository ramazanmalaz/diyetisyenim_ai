"use client";

/**
 * RevenueCat Capacitor SDK sarmalayıcı.
 * Yalnızca iOS native ortamında (Capacitor.isNativePlatform() === true) çağrılır.
 * Web ortamında iyzico akışı kullanılmaya devam eder.
 *
 * Kurulum gereksinimleri:
 *  1. App Store Connect → Subscriptions → ürünleri oluştur
 *  2. RevenueCat dashboard → ürünleri + "premium" entitlement'ı tanımla
 *  3. NEXT_PUBLIC_REVENUECAT_IOS_KEY env'ini .env.local'a ekle
 */

import {
  Purchases,
  LOG_LEVEL,
  type PurchasesPackage,
  type CustomerInfo,
} from "@revenuecat/purchases-capacitor";

export type { PurchasesPackage };

export type RcOffering = {
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
};

const IOS_KEY = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY ?? "";

/** Uygulama başlangıcında (veya abonelik ekranı açılırken) çağrılır. */
export async function initRevenueCat(userId: string): Promise<void> {
  if (!IOS_KEY) {
    console.warn("[RevenueCat] NEXT_PUBLIC_REVENUECAT_IOS_KEY tanımlı değil.");
    return;
  }
  await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
  await Purchases.configure({ apiKey: IOS_KEY, appUserID: userId });
}

/** Mevcut teklifleri (aylık + yıllık paket) döndürür. */
export async function getOffering(): Promise<RcOffering> {
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return { monthly: null, annual: null };
  return {
    monthly: current.monthly ?? null,
    annual: current.annual ?? null,
  };
}

/**
 * Satın alma başlatır; Apple ödeme sayfası açılır.
 * Başarılıysa true, kullanıcı iptal ettiyse false döner.
 * Diğer hatalar exception olarak fırlatılır.
 */
export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<{ success: boolean; customerInfo: CustomerInfo | null }> {
  try {
    const result = await Purchases.purchasePackage({ aPackage: pkg });
    return { success: true, customerInfo: result.customerInfo };
  } catch (err: unknown) {
    // Kullanıcı ödeme sayfasını kapattıysa sessizce false döndür.
    const code = (err as { code?: string })?.code;
    if (code === "1" /* USER_CANCELLED */) {
      return { success: false, customerInfo: null };
    }
    throw err;
  }
}

/** Kullanıcının aktif "premium" entitlement'ı var mı? */
export async function isPremiumActive(): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return !!customerInfo.entitlements.active["premium"];
  } catch {
    return false;
  }
}

/** Satın almaları geri yükle (iOS zorunlu — "Restore Purchases" butonu). */
export async function restorePurchases(): Promise<boolean> {
  const { customerInfo } = await Purchases.restorePurchases();
  return !!customerInfo.entitlements.active["premium"];
}
