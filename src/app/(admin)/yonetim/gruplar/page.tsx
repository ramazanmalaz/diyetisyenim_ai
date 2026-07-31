import { ChevronRight, Users } from "lucide-react";
import Link from "next/link";

import { CreateClientGroupForm } from "@/components/admin/create-client-group-form";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Gruplar — Yönetim" };

export default async function GruplarPage() {
  const staff = await requireStaff();
  const admin = createAdminClient();

  // Admin tüm grupları, diyetisyen yalnızca kendi gruplarını görür.
  let query = admin
    .from("client_groups")
    .select("id, name, note, created_at")
    .order("created_at", { ascending: false });
  if (staff.role !== "admin") query = query.eq("dietitian_id", staff.id);

  const { data: groups } = await query;

  const groupIds = (groups ?? []).map((g) => g.id);
  const { data: memberRows } = groupIds.length
    ? await admin
        .from("client_group_members")
        .select("group_id")
        .in("group_id", groupIds)
    : { data: [] as { group_id: string }[] };

  const countByGroup = new Map<string, number>();
  for (const m of memberRows ?? []) {
    countByGroup.set(m.group_id, (countByGroup.get(m.group_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Gruplar</h1>
        <p className="text-sm text-gray-500">
          Danışanlarını grupla, gruba toplu mesaj at.
        </p>
      </div>

      <CreateClientGroupForm />

      {(groups ?? []).length > 0 ? (
        <ul className="space-y-2.5">
          {(groups ?? []).map((g) => (
            <li key={g.id}>
              <Link
                href={`/yonetim/gruplar/${g.id}`}
                className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] dark:border-gray-800 dark:bg-gray-900"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <Users className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{g.name}</p>
                  <p className="truncate text-sm text-gray-500">
                    {countByGroup.get(g.id) ?? 0} danışan
                    {g.note ? ` · ${g.note}` : ""}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-gray-300 dark:text-gray-600" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center dark:border-gray-800">
          <Users className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm text-gray-500">
            Henüz grup yok. Yukarıdan oluştur.
          </p>
        </div>
      )}
    </div>
  );
}
