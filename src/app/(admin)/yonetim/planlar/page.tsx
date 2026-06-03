import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { PLAN_STATUS_LABEL } from "@/lib/diet";
import { createClient } from "@/lib/supabase/server";

export default async function PlanlarPage() {
  await requireStaff();
  const supabase = await createClient();

  const { data: plans } = await supabase
    .from("diet_plans")
    .select("id, title, status, client_id, created_at")
    .order("created_at", { ascending: false });

  // Danışan adlarını ayrı sorguyla çöz (FK embedding'e gerek yok).
  const clientIds = [...new Set((plans ?? []).map((p) => p.client_id))];
  const { data: clientRows } = clientIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", clientIds)
    : { data: [] };
  const nameById = new Map(
    (clientRows ?? []).map((c) => [c.id, c.full_name]),
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Diyet Planları</h1>
        <Button asChild>
          <Link href="/yonetim/planlar/yeni">+ Yeni plan</Link>
        </Button>
      </div>

      {plans && plans.length > 0 ? (
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {plans.map((p) => (
            <li key={p.id}>
              <Link
                href={`/yonetim/planlar/${p.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-sm text-gray-500">
                    {nameById.get(p.client_id) ?? "Danışan"}
                  </p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs dark:bg-gray-800">
                  {PLAN_STATUS_LABEL[p.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">
          Henüz plan yok. “Yeni plan” ile başla.
        </p>
      )}
    </div>
  );
}
