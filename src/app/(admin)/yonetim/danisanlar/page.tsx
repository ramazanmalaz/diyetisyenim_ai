import { Crown, Users } from "lucide-react";
import Link from "next/link";

import { CreateClientForm } from "@/components/admin/create-client-form";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Danışanlarım — Yönetim" };

function isPremiumActive(until: string | null): boolean {
  return !!until && new Date(until) > new Date();
}

export default async function DanisanlarPage() {
  const dietitian = await requireStaff();
  const admin = createAdminClient();

  const { data: clients } = await admin
    .from("profiles")
    .select("id, full_name, premium_until, created_at")
    .eq("dietitian_id", dietitian.id)
    .order("full_name");

  const clientIds = (clients ?? []).map((c) => c.id);

  const [{ data: plans }, { data: weights }] =
    clientIds.length > 0
      ? await Promise.all([
          admin
            .from("diet_plans")
            .select("client_id, title")
            .in("client_id", clientIds)
            .eq("status", "active"),
          admin
            .from("progress_entries")
            .select("client_id, weight_kg, entry_date")
            .in("client_id", clientIds)
            .order("entry_date", { ascending: false }),
        ])
      : [{ data: [] as { client_id: string; title: string }[] }, { data: [] as { client_id: string; weight_kg: number | null; entry_date: string }[] }];

  const planByClient = new Map(
    (plans ?? []).map((p) => [p.client_id, p.title]),
  );

  const weightByClient = new Map<string, number>();
  for (const w of weights ?? []) {
    if (!weightByClient.has(w.client_id) && w.weight_kg != null) {
      weightByClient.set(w.client_id, Number(w.weight_kg));
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Danışanlarım</h1>
        <p className="text-sm text-gray-500">
          {clients?.length ?? 0} danışan
        </p>
      </div>

      <CreateClientForm />

      {(clients ?? []).length > 0 ? (
        <ul className="space-y-2.5">
          {(clients ?? []).map((c) => {
            const plan = planByClient.get(c.id);
            const weight = weightByClient.get(c.id);
            const premium = isPremiumActive(c.premium_until);
            return (
              <li key={c.id}>
                <Link
                  href={`/yonetim/danisanlar/${c.id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] dark:border-gray-800 dark:bg-gray-900"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    {(c.full_name ?? "?").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{c.full_name ?? "İsimsiz"}</p>
                    <p className="truncate text-sm text-gray-500">
                      {plan ?? "Plan atanmamış"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                    {premium && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        <Crown className="h-3 w-3" /> Premium
                      </span>
                    )}
                    {weight != null && (
                      <span className="text-gray-400">{weight} kg</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center dark:border-gray-800">
          <Users className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm text-gray-500">
            Henüz danışan yok. Yukarıdan ekle.
          </p>
        </div>
      )}
    </div>
  );
}
