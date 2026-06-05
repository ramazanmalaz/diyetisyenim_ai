import Link from "next/link";

import { openAssistant } from "@/app/(app)/sohbet/actions";
import { CalorieHero } from "@/components/plan/calorie-hero";
import { EditableMeals } from "@/components/plan/editable-meals";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function PlanPage() {
  await requireProfile();
  const supabase = await createClient();

  // RLS sayesinde danışan yalnızca kendi planlarını görür.
  const { data: plan } = await supabase
    .from("diet_plans")
    .select(
      "id, title, status, daily_calorie_target, estimated_weeks, goal_loss_kg",
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: meals } = plan
    ? await supabase
        .from("meals")
        .select(
          "id, day_of_week, meal_type, content, calories, food_id, quantity",
        )
        .eq("plan_id", plan.id)
    : { data: [] };

  const { data: foods } = await supabase
    .from("foods")
    .select("id, name, unit_label, kcal_per_unit")
    .order("name");

  // Planlanan ortalama günlük kalori (ring için).
  const rows = meals ?? [];
  const days = new Set(rows.map((m) => m.day_of_week)).size || 1;
  const plannedTotal = Math.round(
    rows.reduce((s, m) => s + (m.calories ?? 0), 0) / days,
  );

  if (!plan) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Henüz planın yok</h1>
        <p className="text-sm text-gray-500">
          Yapay zekâ diyetisyeninle birkaç soruyu yanıtla, sana özel programını
          hazırlasın.
        </p>
        <Button asChild>
          <Link href="/baslangic">Diyete Başla →</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Diyet Planım</h1>

      <CalorieHero
        dailyTarget={plan.daily_calorie_target}
        goalLossKg={plan.goal_loss_kg}
        estimatedWeeks={plan.estimated_weeks}
        plannedTotal={plannedTotal}
      />

      {/* Hızlı erişim */}
      <div className="grid gap-2 sm:grid-cols-2">
        <form action={openAssistant}>
          <Button type="submit" variant="outline" className="w-full">
            💬 Asistana soru sor
          </Button>
        </form>
        <Button asChild variant="outline" className="w-full">
          <Link href="/ilerleme">📊 Kilo & ilerleme takibi</Link>
        </Button>
      </div>

      <p className="text-xs text-gray-400">
        Öğünü açmak için başlığa dokun. Bir besine dokununca miktarını/içeriğini
        değiştirebilir, her öğünün tabağını fotoğrafla paylaşabilirsin. Kalori
        otomatik güncellenir.
      </p>
      <EditableMeals
        initial={meals ?? []}
        planId={plan.id}
        foods={foods ?? []}
      />
    </div>
  );
}
