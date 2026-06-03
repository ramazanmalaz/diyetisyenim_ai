import { NextResponse, type NextRequest } from "next/server";

import { retrieveCheckout } from "@/lib/payments/iyzico";
import { createAdminClient } from "@/lib/supabase/admin";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * iyzico Checkout Form geri dönüş (callback) noktası.
 * iyzico ödeme sonrası buraya `token` ile POST yapar; sonucu token üzerinden
 * sorgulayıp (doğrulama) payments kaydını güncelleriz.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const token = form?.get("token");

  if (typeof token !== "string" || !token) {
    return NextResponse.redirect(new URL("/abonelik?odeme=hata", APP_URL), 303);
  }

  let paid = false;
  try {
    const result = await retrieveCheckout(token);
    paid = result.success;
  } catch {
    paid = false;
  }

  // Sonucu kaydet (service-role; kullanıcı oturumu yok).
  const admin = createAdminClient();
  await admin
    .from("payments")
    .update({ status: paid ? "paid" : "failed" })
    .eq("provider_ref", token);

  return NextResponse.redirect(
    new URL(`/abonelik?odeme=${paid ? "basarili" : "hata"}`, APP_URL),
    303,
  );
}
