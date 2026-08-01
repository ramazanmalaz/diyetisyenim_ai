import { Sparkles, User } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deletePlan } from "@/app/(admin)/yonetim/planlar/actions";
import { AssignTemplateForm } from "@/components/admin/assign-template-form";
import { PlanEditor } from "@/components/admin/plan-editor";
import { PlanStatusControl } from "@/components/admin/plan-status-control";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireStaff();
  const { id } = await params;
  const admin = createAdminClient();
  const isAdmin = staff.role === "admin";

  const { data: plan } = await admin
    .from("diet_plans")
    .select(
      "id, title, status, client_id, created_by, is_template, daily_calorie_target, valid_from, valid_to",
    )
    .eq("id", id)
    .single();

  if (!plan) notFound();

  // Sahiplik: şablon → oluşturan; danışan planı → danışanın diyetisyeni.
  let allowed = isAdmin;
  if (!allowed) {
    if (plan.client_id) {
      const { data: owner } = await admin
        .from("profiles")
        .select("dietitian_id")
        .eq("id", plan.client_id)
        .single();
      allowed = owner?.dietitian_id === staff.id;
    } else {
      allowed = plan.created_by === staff.id;
    }
  }
  if (!allowed) notFound();

  // Şablonsa atanabilecek danışanları da çek (diyetisyen: kendi danışanları).
  function assignableClientsQuery() {
    const q = admin.from("profiles").select("id, full_name").order("full_name");
    if (isAdmin) q.eq("role", "client");
    else q.eq("dietitian_id", staff.id);
    return q;
  }

  const [{ data: client }, { data: meals }, { data: myClients }] =
    await Promise.all([
      plan.client_id
        ? admin
            .from("profiles")
            .select("full_name")
            .eq("id", plan.client_id)
            .single()
        : Promise.resolve({ data: null }),
      admin
        .from("meals")
        .select("id, week_index, day_of_week, meal_type, content, calories")
        .eq("plan_id", plan.id),
      plan.is_template
        ? assignableClientsQuery()
        : Promise.resolve({ data: null }),
    ]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div>
        <Link
          href="/yonetim/planlar"
          className="text-sm text-emerald-600 hover:underline"
        >
          ← Programlar
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{plan.title}</h1>
          {plan.is_template ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Sparkles className="h-3 w-3" /> Şablon
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
              <User className="h-3 w-3" /> {client?.full_name ?? "Danışan"}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {plan.daily_calorie_target
            ? `Günlük hedef ${plan.daily_calorie_target} kcal`
            : "Kalori hedefi belirtilmemiş"}
          {plan.is_template
            ? " · Danışana atadığında kopyalanır, şablon bozulmaz."
            : ""}
        </p>
      </div>

      {/* Şablon → danışana ata */}
      {plan.is_template && (
        <AssignTemplateForm planId={plan.id} clients={myClients ?? []} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {!plan.is_template && (
          <PlanStatusControl planId={plan.id} current={plan.status} />
        )}
        <form action={deletePlan}>
          <input type="hidden" name="planId" value={plan.id} />
          <button
            type="submit"
            className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            {plan.is_template ? "Şablonu sil" : "Planı sil"}
          </button>
        </form>
      </div>

      <PlanEditor planId={plan.id} meals={meals ?? []} />
    </div>
  );
}
