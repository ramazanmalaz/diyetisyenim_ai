import { Check, Crown, Sparkles } from "lucide-react";
import Link from "next/link";

import { CheckoutButton } from "@/components/payments/checkout-button";
import { getEntitlement } from "@/lib/entitlements";
import { requireProfile } from "@/lib/auth";
import { LEGAL_LINKS } from "@/lib/legal";
import {
  SUBSCRIPTION_PRICE,
  SUBSCRIPTION_TITLE,
} from "@/lib/payments/constants";
import { createClient } from "@/lib/supabase/server";
import type { PaymentStatus } from "@/types/database";

const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Bekliyor",
  paid: "Ödendi",
  failed: "Başarısız",
  refunded: "İade edildi",
};

const BENEFITS = [
  "Sınırsız AI sohbet (ücretsiz: günde 5 mesaj)",
  "Sınırsız fotoğraf/tabak analizi (ücretsiz: günde 1)",
  "Hazır planını fotoğraftan sınırsız okutma",
  "Tüm özelliklere öncelikli erişim",
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function AbonelikPage({
  searchParams,
}: {
  searchParams: Promise<{ odeme?: string }>;
}) {
  const profile = await requireProfile();
  const { odeme } = await searchParams;
  const supabase = await createClient();
  const ent = await getEntitlement(profile.id);

  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, currency, status, description, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Premium</h1>
        {ent.isPremium && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <Crown className="h-3.5 w-3.5" /> Aktif
          </span>
        )}
      </div>

      {odeme === "basarili" && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          Ödemen başarıyla alındı. Premium aktif, teşekkürler! 🎉
        </p>
      )}
      {odeme === "hata" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          Ödeme tamamlanamadı. Lütfen tekrar dene.
        </p>
      )}

      {ent.isPremium ? (
        // Premium aktif kartı
        <div className="space-y-3 rounded-3xl border border-amber-200 bg-amber-50/60 p-6 dark:border-amber-900/50 dark:bg-amber-950/20">
          <p className="flex items-center gap-2 text-lg font-semibold text-amber-800 dark:text-amber-200">
            <Crown className="h-5 w-5" /> Premium üyeliğin aktif
          </p>
          {ent.premiumUntil && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <b>{formatDate(ent.premiumUntil)}</b> tarihine kadar sınırsız AI
              sohbet ve fotoğraf analizi.
            </p>
          )}
          <div className="pt-1">
            <CheckoutButton price={SUBSCRIPTION_PRICE} />
            <p className="mt-1 text-xs text-gray-500">
              Yeniden ödeme yaparsan süreye 30 gün eklenir.
            </p>
          </div>
        </div>
      ) : (
        // Ücretsiz kullanıcı: avantajlar + bugünkü kullanım + ödeme
        <div className="space-y-4 rounded-3xl border border-gray-200 bg-white/70 p-6 shadow-[var(--shadow-soft)] dark:border-gray-800 dark:bg-gray-900/50">
          <div className="flex items-baseline justify-between">
            <p className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-emerald-600" /> {SUBSCRIPTION_TITLE}
            </p>
            <p className="text-2xl font-bold">
              {SUBSCRIPTION_PRICE} ₺
              <span className="text-sm font-normal text-gray-500"> / ay</span>
            </p>
          </div>

          <ul className="space-y-2">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span className="text-gray-700 dark:text-gray-200">{b}</span>
              </li>
            ))}
          </ul>

          <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm dark:bg-gray-800/50">
            <p className="text-gray-600 dark:text-gray-300">Bugünkü ücretsiz kullanımın</p>
            <p className="mt-1 font-medium">
              Sohbet: {ent.chatUsed}/{ent.chatLimit} · Fotoğraf:{" "}
              {ent.visionUsed}/{ent.visionLimit}
            </p>
          </div>

          <CheckoutButton price={SUBSCRIPTION_PRICE} />
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-semibold">Ödeme geçmişi</h2>
        {payments && payments.length > 0 ? (
          <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span>
                  {p.description ?? "Ödeme"} · {p.amount} {p.currency}
                </span>
                <span className="text-gray-500">{STATUS_LABEL[p.status]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Henüz ödeme kaydın yok.</p>
        )}
      </div>

      <nav className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-gray-100 pt-4 text-xs text-gray-400 dark:border-gray-800">
        {LEGAL_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            target="_blank"
            className="hover:text-emerald-600 hover:underline"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
