import Link from "next/link";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PaymentStatus } from "@/types/database";

const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Bekliyor",
  paid: "Ödendi",
  failed: "Başarısız",
  refunded: "İade edildi",
};

export default async function OdemelerPage() {
  await requireStaff();
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select("id, client_id, amount, currency, status, description, created_at")
    .order("created_at", { ascending: false });

  const rows = payments ?? [];
  const clientIds = [...new Set(rows.map((p) => p.client_id))];
  const { data: clients } = clientIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", clientIds)
    : { data: [] };
  const nameById = new Map((clients ?? []).map((c) => [c.id, c.full_name]));

  const totalPaid = rows
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link href="/yonetim" className="text-sm text-emerald-600">
          ← Yönetim
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Ödemeler</h1>
        <p className="text-gray-500">
          Toplam tahsilat: {totalPaid.toFixed(2)} ₺
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">Henüz ödeme yok.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {rows.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  {nameById.get(p.client_id) ?? "Danışan"}
                </p>
                <p className="text-gray-500">
                  {p.description ?? "Ödeme"} · {p.amount} {p.currency}
                </p>
              </div>
              <span className="text-gray-500">{STATUS_LABEL[p.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
