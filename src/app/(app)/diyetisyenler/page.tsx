import { MapPin } from "lucide-react";
import Link from "next/link";

import { DietitianAvatar } from "@/components/dietitians/dietitian-avatar";
import { requireProfile } from "@/lib/auth";
import { PUBLIC_DIETITIAN_COLUMNS, type PublicDietitian } from "@/lib/dietitians";
import { createClient } from "@/lib/supabase/server";

export default async function DietitiansPage() {
  await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("dietitians")
    .select(PUBLIC_DIETITIAN_COLUMNS)
    .eq("is_active", true)
    .order("sort_order");

  const dietitians = (data ?? []) as PublicDietitian[];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div>
        <Link href="/baslangic" className="text-sm text-gray-400 hover:underline">
          ← Geri
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Diyetisyenler</h1>
        <p className="text-sm text-gray-500">
          Sana uygun diyetisyeni seç, profilini incele ve randevu al.
        </p>
      </div>

      {dietitians.length === 0 ? (
        <p className="text-sm text-gray-500">
          Şu an müsait diyetisyen bulunmuyor. Lütfen daha sonra tekrar bak.
        </p>
      ) : (
        <ul className="space-y-3">
          {dietitians.map((d) => (
            <li key={d.id}>
              <Link
                href={`/diyetisyenler/${d.id}`}
                className="glass flex items-start gap-4 rounded-3xl p-4 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-float)]"
              >
                <DietitianAvatar
                  name={d.full_name}
                  photoUrl={d.photo_url}
                  className="h-16 w-16"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{d.full_name}</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    {d.title}
                    {d.years_experience
                      ? ` · ${d.years_experience} yıl deneyim`
                      : ""}
                  </p>
                  {d.city && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" /> {d.city}
                    </p>
                  )}
                  {d.specialties.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {d.specialties.slice(0, 3).map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
