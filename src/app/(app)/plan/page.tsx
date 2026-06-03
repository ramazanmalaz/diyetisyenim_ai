import { MealList } from "@/components/plan/meal-list";
import { requireProfile } from "@/lib/auth";
import { PLAN_STATUS_LABEL } from "@/lib/diet";
import { createClient } from "@/lib/supabase/server";

export default async function PlanPage() {
  await requireProfile();
  const supabase = await createClient();

  // RLS sayesinde danışan yalnızca kendi planlarını görür.
  const { data: plan } = await supabase
    .from("diet_plans")
    .select("id, title, status, valid_from, valid_to")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: meals } = plan
    ? await supabase
        .from("meals")
        .select("id, day_of_week, meal_type, content")
        .eq("plan_id", plan.id)
    : { data: [] };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Diyet Planım</h1>

      {plan ? (
        <>
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <p className="font-medium">{plan.title}</p>
            <p className="text-sm text-gray-500">
              Durum: {PLAN_STATUS_LABEL[plan.status]}
              {plan.valid_from ? ` · ${plan.valid_from}` : ""}
              {plan.valid_to ? ` → ${plan.valid_to}` : ""}
            </p>
          </div>
          <MealList meals={meals ?? []} />
        </>
      ) : (
        <p className="text-sm text-gray-500">
          Henüz aktif bir diyet planın yok. Diyetisyenin bir plan hazırlayıp
          aktif ettiğinde burada görünecek.
        </p>
      )}
    </div>
  );
}
