import { deleteProgress } from "@/app/(app)/ilerleme/actions";
import { ProgressForm } from "@/components/progress/progress-form";
import { WeightChart } from "@/components/progress/weight-chart";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">İlerleme Takibi</h1>

      <WeightChart points={chartPoints} />

      <ProgressForm defaultDate={today} />

      <div className="space-y-3">
        <h2 className="font-semibold">Kayıtlar</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">Henüz kayıt yok.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((e) => {
              const url = e.photo_path
                ? urlByPath.get(e.photo_path)
                : undefined;
              return (
                <li
                  key={e.id}
                  className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                >
                  <div className="flex items-start justify-between">
                    <p className="font-medium">{e.entry_date}</p>
                    <form action={deleteProgress}>
                      <input type="hidden" name="id" value={e.id} />
                      <button
                        type="submit"
                        className="text-xs text-red-600 hover:underline"
                      >
                        Sil
                      </button>
                    </form>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                    {e.weight_kg != null && <span>{e.weight_kg} kg</span>}
                    {e.water_ml != null && <span>{e.water_ml} ml su</span>}
                    {e.waist_cm != null && <span>Bel {e.waist_cm} cm</span>}
                    {e.hip_cm != null && <span>Kalça {e.hip_cm} cm</span>}
                  </div>
                  {e.note && <p className="mt-2 text-sm">{e.note}</p>}
                  {url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt="İlerleme fotoğrafı"
                      className="mt-3 max-h-64 rounded-lg object-cover"
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
