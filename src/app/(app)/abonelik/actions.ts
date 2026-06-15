"use server";

import { getUser, getProfile } from "@/lib/auth";
import { initializeCheckout } from "@/lib/payments/iyzico";
import { getPricing, selectPlan, type PlanKey } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export type CheckoutResult =
  | { error: string }
  | { paymentPageUrl: string };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function startCheckout(planKey: unknown): Promise<CheckoutResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };
  const profile = await getProfile();

  const fullName = profile?.full_name?.trim() || "Danışan";
  const [name, ...rest] = fullName.split(" ");
  const surname = rest.join(" ") || "-";

  const key: PlanKey = planKey === "annual" ? "annual" : "monthly";
  const plan = selectPlan(await getPricing(), key);
  const conversationId = `${user.id}-${Date.now()}`;

  let checkout: { token: string; paymentPageUrl: string };
  try {
    checkout = await initializeCheckout({
      conversationId,
      callbackUrl: `${APP_URL}/api/webhooks/iyzico`,
      price: plan.price,
      title: plan.title,
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
  // premium_days: bu ödeme onaylanınca kaç gün premium tanımlanacağı.
  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    client_id: user.id,
    amount: Number(plan.price),
    currency: "TRY",
    provider: "iyzico",
    provider_ref: checkout.token,
    status: "pending",
    description: plan.title,
    premium_days: plan.days,
  });

  if (error) {
    return { error: "Ödeme kaydı oluşturulamadı." };
  }

  return { paymentPageUrl: checkout.paymentPageUrl };
}
