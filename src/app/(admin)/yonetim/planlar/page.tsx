import { FileText, Sparkles } from "lucide-react";
import Link from "next/link";

import { TemplateCreator } from "@/components/admin/template-creator";
import { requireStaff } from "@/lib/auth";
import { PLAN_STATUS_LABEL } from "@/lib/diet";
import { createAdminClient } from "@/lib/supabase/admin";

// AI şablon üretimi bu route'tan tetikleniyor (Hobby limiti 60 sn).
export const maxDuration = 60;

export default async function PlanlarPage() {
  const staff = await requireStaff();
  const admin = createAdminClient();
  const isAdmin = staff.role === "admin";

  // Diyetisyen yalnızca kendi danışanlarının + kendi oluşturduğu planları görür.
  let clientIdFilter: string[] | null = null;
  if (!isAdmin) {
    const { data: myClients } = await admin
      .from("profiles")
      .select("id")
      .eq("dietitian_id", staff.id);
    clientIdFilter = (myClients ?? []).map((c) => c.id);
  }

  const plansQuery = admin
    .from("diet_plans")
    .select("id, title, status, client_id, is_template, daily_calorie_target, created_at")
    .order("created_at", { ascending: false });

  if (clientIdFilter) {
    const ids = clientIdFilter.length > 0 ? clientIdFilter.join(",") : null;
    plansQuery.or(
      ids
        ? `client_id.in.(${ids}),created_by.eq.${staff.id}`
        : `created_by.eq.${staff.id}`,
    );
  }

  const { data: plans } = await plansQuery;

  const all = plans ?? [];
  const templates = all.filter((p) => p.is_template);
  const clientPlans = all.filter((p) => !p.is_template);

  // Danışan adlarını çöz
  const clientIds = [
    ...new Set(clientPlans.map((p) => p.client_id).filter((id): id is string => !!id)),
  ];
  const { data: clientRows } = clientIds.length
    ? await admin.from("profiles").select("id, full_name").in("id", clientIds)
    : { data: [] };
  const nameById = new Map((clientRows ?? []).map((c) => [c.id, c.full_name]));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-7 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Programlar</h1>
        <p className="text-sm text-gray-500">
          Şablon oluştur, danışanlarına ata, sonra üzerinde düzenle.
        </p>
      </div>

      <TemplateCreator />

      {/* Şablonlar */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 px-1 text-xs font-semibold tracking-[0.14em] text-gray-400 uppercase">
          <FileText className="h-3.5 w-3.5" /> Şablonlarım ({templates.length})
        </h2>
        {templates.length > 0 ? (
          <ul className="space-y-2">
            {templates.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/yonetim/planlar/${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.title}</p>
                    <p className="text-sm text-gray-500">
                      {p.daily_calorie_target
                        ? `${p.daily_calorie_target} kcal/gün`
                        : "Kalori hedefi yok"}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <Sparkles className="h-3 w-3" /> Şablon
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-800">
            Henüz şablonun yok. Yukarıdan AI ile üret ya da elle oluştur.
          </p>
        )}
      </section>

      {/* Danışanlara atanmış planlar */}
      <section className="space-y-3">
        <h2 className="px-1 text-xs font-semibold tracking-[0.14em] text-gray-400 uppercase">
          Danışan programları ({clientPlans.length})
        </h2>
        {clientPlans.length > 0 ? (
          <ul className="divide-y divide-gray-200 rounded-2xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {clientPlans.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/yonetim/planlar/${p.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.title}</p>
                    <p className="text-sm text-gray-500">
                      {p.client_id
                        ? (nameById.get(p.client_id) ?? "Danışan")
                        : "—"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs dark:bg-gray-800">
                    {PLAN_STATUS_LABEL[p.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">
            Henüz danışana atanmış program yok.
          </p>
        )}
      </section>
    </div>
  );
}
