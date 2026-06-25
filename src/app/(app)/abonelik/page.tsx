import { Check, Crown, Minus, ShieldCheck, Sparkles, X } from "lucide-react";
import Link from "next/link";

import { CheckoutButton } from "@/components/payments/checkout-button";
import { getEntitlement } from "@/lib/entitlements";
import { requireProfile } from "@/lib/auth";
import { LEGAL_LINKS } from "@/lib/legal";
import { getPricing, type Plan } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type { PaymentStatus } from "@/types/database";

const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Bekliyor",
  paid: "Ödendi",
  failed: "Başarısız",
  refunded: "İade edildi",
};

// Ücretsiz vs Premium karşılaştırması. free=null → ücretsizde yok (X).
const COMPARE: { label: string; free: string | null; premium: string }[] = [
  { label: "AI diyetisyen sohbeti", free: "Günde 5 mesaj", premium: "Sınırsız" },
  { label: "Fotoğraf & tabak analizi", free: "Günde 1", premium: "Sınırsız" },
  { label: "Hazır planı fotoğraftan okuma", free: "Günde 1", premium: "Sınırsız" },
  { label: "Kişiye özel plan & kalori takibi", free: "Var", premium: "Var" },
  { label: "Su, öğün, pomodoro hatırlatıcıları", free: "Var", premium: "Var" },
  { label: "Makro & tarif detayı", free: "Var", premium: "Var" },
  { label: "Yeni özelliklere öncelikli erişim", free: null, premium: "Var" },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "İstediğim zaman iptal edebilir miyim?",
    a: "Evet. Premium tek seferlik bir ödemedir, otomatik yenilenmez; süre dolunca kendiliğinden ücretsiz plana dönersin. İstediğinde tekrar alabilirsin.",
  },
  {
    q: "Ödeme güvenli mi?",
    a: "Tüm ödemeler iyzico altyapısıyla alınır. Kart bilgilerin bizde saklanmaz.",
  },
  {
    q: "Süre bitince ne olur?",
    a: "Ücretsiz plana dönersin (günde 5 sohbet + 1 fotoğraf). Planın, kayıtların ve geçmişin korunur.",
  },
  {
    q: "Aylık mı yıllık mı?",
    a: "İkisi de var. Yıllık paket aydan çok daha avantajlı; uzun süre kullanacaksan yıllık daha ekonomik.",
  },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Bir tarife kartı — fiyat, süre, (yıllıkta) tasarruf/ayda-eşdeğer ve ödeme butonu. */
function PlanCard({ plan, savingTl }: { plan: Plan; savingTl?: number }) {
  const annual = plan.key === "annual";
  const perMonth = annual ? Math.round(Number(plan.price) / 12) : null;
  return (
    <div
      className={
        "relative flex flex-col rounded-3xl border p-5 shadow-[var(--shadow-soft)] " +
        (annual
          ? "border-emerald-400 bg-emerald-50/70 ring-1 ring-emerald-300 dark:border-emerald-700 dark:bg-emerald-950/30"
          : "border-gray-200 bg-white/70 dark:border-gray-800 dark:bg-gray-900/50")
      }
    >
      {annual && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase shadow">
          ⭐ Önerilen
        </span>
      )}
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 font-semibold">
          <Sparkles className="h-4 w-4 text-emerald-600" /> {plan.title}
        </p>
        {annual && savingTl && savingTl > 0 && (
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
            ~{savingTl}₺ tasarruf
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-extrabold tracking-tight">
        {plan.price} ₺
        <span className="text-sm font-normal text-gray-500">
          {" "}
          / {annual ? "yıl" : "ay"}
        </span>
      </p>
      <p className="mt-0.5 text-xs text-gray-500">
        {annual
          ? `Ayda yaklaşık ${perMonth} ₺ · ${plan.days} gün erişim`
          : `${plan.days} gün premium erişim`}
      </p>
      <div className="mt-4">
        <CheckoutButton
          price={plan.price}
          plan={plan.key}
          label={`${plan.price} ₺ — ${annual ? "Yıllık al" : "Aylık al"}`}
        />
      </div>
    </div>
  );
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
  const pricing = await getPricing();

  const saving =
    Math.round(Number(pricing.monthly.price) * 12 - Number(pricing.annual.price));

  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, currency, status, description, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
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

      {ent.isPremium && ent.premiumUntil ? (
        /* --- Premium aktif --- */
        <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 p-6 text-center shadow-[var(--shadow-soft)] dark:border-amber-900/50 dark:from-amber-950/20 dark:to-orange-950/10">
          <Crown className="mx-auto h-9 w-9 text-amber-500" />
          <h1 className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-100">
            Premium üyeliğin aktif
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            <b>{formatDate(ent.premiumUntil)}</b> tarihine kadar sınırsız erişim.
            Aşağıdan ödeme yaparsan süre uzar.
          </p>
        </div>
      ) : (
        /* --- Dönüşüm hero --- */
        <div className="overflow-hidden rounded-3xl border border-emerald-300 bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-[var(--shadow-float)]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
            <Crown className="h-3.5 w-3.5" /> UzmanDiyet Premium
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">
            AI diyetisyenin tüm gücü, sınırsız
          </h1>
          <p className="mt-1.5 text-sm text-emerald-50/90">
            Tüm takip araçları zaten ücretsiz. Premium ile AI sohbet ve fotoğraf
            analizindeki günlük limitleri kaldırırsın — istediğin kadar sor,
            istediğin kadar tabak analiz et.
          </p>
        </div>
      )}

      {/* Karşılaştırma tablosu */}
      {!ent.isPremium && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-[1.5fr_1fr_1fr] bg-gray-50 text-xs font-semibold dark:bg-gray-800/50">
            <span className="px-4 py-2.5">Özellik</span>
            <span className="px-3 py-2.5 text-center text-gray-500">Ücretsiz</span>
            <span className="px-3 py-2.5 text-center text-emerald-700 dark:text-emerald-300">
              Premium
            </span>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {COMPARE.map((row) => (
              <li
                key={row.label}
                className="grid grid-cols-[1.5fr_1fr_1fr] items-center text-sm"
              >
                <span className="px-4 py-2.5 text-gray-700 dark:text-gray-200">
                  {row.label}
                </span>
                <span className="px-3 py-2.5 text-center text-xs text-gray-500">
                  {row.free === null ? (
                    <X className="mx-auto h-4 w-4 text-gray-300" />
                  ) : (
                    row.free
                  )}
                </span>
                <span className="bg-emerald-50/40 px-3 py-2.5 text-center text-xs font-medium text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300">
                  {row.premium === "Var" ? (
                    <Check className="mx-auto h-4 w-4" />
                  ) : (
                    row.premium
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tarife kartları — aylık + yıllık */}
      <div className="grid gap-4 sm:grid-cols-2">
        <PlanCard plan={pricing.monthly} />
        <PlanCard plan={pricing.annual} savingTl={saving} />
      </div>

      {/* Güven sinyalleri */}
      {!ent.isPremium && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> iyzico ile güvenli
            ödeme
          </span>
          <span className="flex items-center gap-1.5">
            <Minus className="h-3 w-3 rotate-90" /> Otomatik yenileme yok
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-4 w-4 text-emerald-600" /> İstediğin an vazgeç
          </span>
        </div>
      )}

      {/* Bugünkü ücretsiz kullanım */}
      {!ent.isPremium && (
        <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm dark:bg-gray-800/50">
          <p className="text-gray-600 dark:text-gray-300">
            Bugünkü ücretsiz kullanımın
          </p>
          <p className="mt-1 font-medium">
            Sohbet: {ent.chatUsed}/{ent.chatLimit} · Fotoğraf: {ent.visionUsed}/
            {ent.visionLimit}
          </p>
        </div>
      )}

      {/* SSS */}
      {!ent.isPremium && (
        <div className="space-y-2">
          <h2 className="font-semibold">Sıkça sorulanlar</h2>
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
                {item.q}
                <span className="text-gray-400 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      )}

      {/* Ödeme geçmişi */}
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

      {/* iyzico ile Öde — Visa / Mastercard logo bandı (ödeme onayı kriteri) */}
      <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/iyzico/logo_band_colored.svg"
          alt="iyzico ile Öde — Visa, Mastercard ile güvenli ödeme"
          className="h-7 w-auto dark:hidden"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/iyzico/logo_band_white.svg"
          alt="iyzico ile Öde — Visa, Mastercard ile güvenli ödeme"
          className="hidden h-7 w-auto dark:block"
        />
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
