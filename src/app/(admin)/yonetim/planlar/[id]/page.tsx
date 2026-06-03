import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteMeal, deletePlan } from "@/app/(admin)/yonetim/planlar/actions";
import { MealForm } from "@/components/admin/meal-form";
import { PlanStatusControl } from "@/components/admin/plan-status-control";
import { MealList } from "@/components/plan/meal-list";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("diet_plans")
    .select("id, title, status, client_id, valid_from, valid_to")
    .eq("id", id)
    .single();

  if (!plan) notFound();

  const [{ data: client }, { data: meals }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", plan.client_id)
      .single(),
    supabase
      .from("meals")
      .select("id, day_of_week, meal_type, content")
      .eq("plan_id", plan.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div>
        <Link
          href="/yonetim/planlar"
          className="text-sm text-emerald-600 hover:underline"
        >
          ← Planlar
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{plan.title}</h1>
        <p className="text-gray-500">{client?.full_name ?? "Danışan"}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PlanStatusControl planId={plan.id} current={plan.status} />
        <form action={deletePlan}>
          <input type="hidden" name="planId" value={plan.id} />
          <button
            type="submit"
            className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            Planı sil
          </button>
        </form>
      </div>

      <MealForm planId={plan.id} />

      <MealList
        meals={meals ?? []}
        action={(m) => (
          <form action={deleteMeal}>
            <input type="hidden" name="mealId" value={m.id} />
            <input type="hidden" name="planId" value={plan.id} />
            <button
              type="submit"
              className="text-xs text-red-600 hover:underline"
            >
              Sil
            </button>
          </form>
        )}
      />
    </div>
  );
}
