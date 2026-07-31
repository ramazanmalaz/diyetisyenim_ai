import Link from "next/link";

import { CreatePlanForm } from "@/components/admin/create-plan-form";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function YeniPlanPage() {
  const staff = await requireStaff();

  const admin = createAdminClient();
  // Diyetisyen yalnızca kendi danışanlarına plan açabilir.
  const clientsQuery = admin
    .from("profiles")
    .select("id, full_name")
    .eq("role", "client")
    .order("full_name");
  if (staff.role !== "admin") clientsQuery.eq("dietitian_id", staff.id);

  const { data: clients } = await clientsQuery;

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
