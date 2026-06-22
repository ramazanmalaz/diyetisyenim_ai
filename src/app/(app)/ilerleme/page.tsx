import { Droplets, Ruler, Scale, Trash2 } from "lucide-react";

import { deleteProgress } from "@/app/(app)/ilerleme/actions";
import { GoalProgress } from "@/components/progress/goal-progress";
import { ProgressForm } from "@/components/progress/progress-form";
import { WeightChart } from "@/components/progress/weight-chart";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function formatDay(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const BUCKET = "progress-photos";

export default async function IlerlemePage() {
  await requireProfile();
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);

  const { data: entries } = await supabase
    .from("progress_entries")
    .select(
      "id, entry_date, weight_kg, water_ml, waist_cm, hip_cm, note, photo_path",
    )
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  const rows = entries ?? [];

  // Fotoğraflar için imzalı URL üret.
  const paths = rows
    .map((e) => e.photo_path)
    .filter((p): p is string => Boolean(p));
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, 3600);
    signed?.forEach((s) => {
      if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
    });
  }

  const chartPoints = [...rows]
    .filter((e) => e.weight_kg != null)
    .reverse()
    .map((e) => ({ date: e.entry_date, weight: Number(e.weight_kg) }));

  // Hedefe ilerleme: başlangıç (intake) + hedef (plan/intake) + güncel kilo.
  const { data: intake } = await supabase
    .from("intakes")
    .select("current_weight_kg, goal_loss_kg")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: plan } = await supabase
    .from("diet_plans")
    .select("goal_loss_kg, valid_to")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const goalLossKg = plan?.goal_loss_kg ?? intake?.goal_loss_kg ?? null;
  const startKg = intake?.current_weight_kg ?? null;
  const latestWeight = chartPoints.length
    ? chartPoints[chartPoints.length - 1].weight
    : startKg;
  const showGoal =
    startKg != null && goalLossKg != null && goalLossKg !== 0;
  const finishDate = plan?.valid_to
    ? new Date(plan.valid_to).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">İlerleme Takibi</h1>
        <p className="text-sm text-gray-500">
          Kilonu, ölçülerini ve fotoğraflarını kaydet; değişimi gör.
        </p>
      </div>

      {showGoal && (
        <GoalProgress
          startKg={startKg}
          currentKg={latestWeight ?? startKg}
          goalKg={startKg - goalLossKg}
          goalLossKg={goalLossKg}
          finishDate={finishDate}
        />
      )}

      <WeightChart points={chartPoints} />

      <ProgressForm defaultDate={today} />

      <div className="space-y-3">
        <h2 className="px-1 text-xs font-semibold tracking-[0.14em] text-gray-400 uppercase">
          Kayıtlar{rows.length > 0 ? ` (${rows.length})` : ""}
        </h2>
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-gray-200 bg-white/60 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900/50">
            Henüz kayıt yok. Yukarıdaki formdan ilk ölçümünü ekle.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((e) => {
              const url = e.photo_path
                ? urlByPath.get(e.photo_path)
                : undefined;
              return (
                <li
                  key={e.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[var(--shadow-soft)] dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-semibold">
                      {formatDay(e.entry_date)}
                    </p>
                    <form action={deleteProgress}>
                      <input type="hidden" name="id" value={e.id} />
                      <button
                        type="submit"
                        aria-label="Kaydı sil"
                        className="-mt-1 -mr-1 grid h-8 w-8 place-items-center rounded-lg text-gray-300 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {e.weight_kg != null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <Scale className="h-3.5 w-3.5" /> {e.weight_kg} kg
                      </span>
                    )}
                    {e.water_ml != null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                        <Droplets className="h-3.5 w-3.5" /> {e.water_ml} ml
                      </span>
                    )}
                    {e.waist_cm != null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        <Ruler className="h-3.5 w-3.5" /> Bel {e.waist_cm} cm
                      </span>
                    )}
                    {e.hip_cm != null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                        <Ruler className="h-3.5 w-3.5" /> Kalça {e.hip_cm} cm
                      </span>
                    )}
                  </div>

                  {e.note && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {e.note}
                    </p>
                  )}
                  {url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt="İlerleme fotoğrafı"
                      className="mt-3 max-h-56 rounded-xl object-cover"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
