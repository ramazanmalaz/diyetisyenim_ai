import Link from "next/link";

import { CreatePlanForm } from "@/components/admin/create-plan-form";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function YeniPlanPage() {
  await requireStaff();

  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "client")
    .order("full_name");

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 px-4 py-8">
      <div>
        <Link
          href="/yonetim/planlar"
          className="text-sm text-emerald-600 hover:underline"
        >
          ← Planlar
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Yeni Diyet Planı</h1>
      </div>

      {clients && clients.length > 0 ? (
        <CreatePlanForm clients={clients} />
      ) : (
        <p className="text-sm text-gray-500">
          Henüz danışan yok. Önce bir danışan kaydı oluşturulmalı.
        </p>
      )}
    </div>
  );
}
