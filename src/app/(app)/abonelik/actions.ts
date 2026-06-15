"use server";

import { getUser, getProfile } from "@/lib/auth";
import { initializeCheckout } from "@/lib/payments/iyzico";
import { getPricing } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export type CheckoutResult =
  | { error: string }
  | { paymentPageUrl: string };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function startCheckout(): Promise<CheckoutResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };
  const profile = await getProfile();

  const fullName = profile?.full_name?.trim() || "Danışan";
  const [name, ...rest] = fullName.split(" ");
  const surname = rest.join(" ") || "-";

  const pricing = await getPricing();
  const conversationId = `${user.id}-${Date.now()}`;

  let checkout: { token: string; paymentPageUrl: string };
  try {
    checkout = await initializeCheckout({
      conversationId,
      callbackUrl: `${APP_URL}/api/webhooks/iyzico`,
      price: pricing.price,
      title: pricing.title,
      buyer: {
        id: user.id,
        email: user.email ?? "noreply@example.com",
        name,
        surname,
      },
    });
  } catch {
    return { error: "Ödeme başlatılamadı. Lütfen tekrar deneyin." };
  }

  // Bekleyen ödeme kaydını oluştur (provider_ref = iyzico token).
  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    client_id: user.id,
    amount: Number(pricing.price),
    currency: "TRY",
    provider: "iyzico",
    provider_ref: checkout.token,
    status: "pending",
    description: pricing.title,
  });

  if (error) {
    return { error: "Ödeme kaydı oluşturulamadı." };
  }

  return { paymentPageUrl: checkout.paymentPageUrl };
}
