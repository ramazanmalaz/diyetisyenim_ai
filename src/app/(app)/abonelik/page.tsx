import { CheckoutButton } from "@/components/payments/checkout-button";
import { requireProfile } from "@/lib/auth";
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

export default async function AbonelikPage({
  searchParams,
}: {
  searchParams: Promise<{ odeme?: string }>;
}) {
  await requireProfile();
  const { odeme } = await searchParams;
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, currency, status, description, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Abonelik</h1>

      {odeme === "basarili" && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          Ödemen başarıyla alındı. Teşekkürler! 🎉
        </p>
      )}
      {odeme === "hata" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          Ödeme tamamlanamadı. Lütfen tekrar dene.
        </p>
      )}

      <div className="space-y-4 rounded-xl border border-gray-200 p-6 dark:border-gray-800">
        <div>
          <p className="text-lg font-semibold">{SUBSCRIPTION_TITLE}</p>
          <p className="text-sm text-gray-500">
            Aylık diyetisyen danışmanlığı ve sınırsız AI asistan erişimi.
          </p>
        </div>
        <p className="text-3xl font-bold">
          {SUBSCRIPTION_PRICE} ₺
          <span className="text-base font-normal text-gray-500"> / ay</span>
        </p>
        <CheckoutButton price={SUBSCRIPTION_PRICE} />
      </div>

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
    </div>
  );
}
