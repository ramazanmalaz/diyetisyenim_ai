import { MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DietitianAvatar } from "@/components/dietitians/dietitian-avatar";
import { SlotPicker } from "@/components/dietitians/slot-picker";
import { requireProfile } from "@/lib/auth";
import {
  PUBLIC_DIETITIAN_COLUMNS,
  type PublicDietitian,
  type Slot,
} from "@/lib/dietitians";
import { createClient } from "@/lib/supabase/server";

export default async function DietitianProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("dietitians")
    .select(PUBLIC_DIETITIAN_COLUMNS)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) notFound();
  const d = data as PublicDietitian;

  // Açık + gelecekteki slotlar.
  const { data: slotData } = await supabase
    .from("dietitian_slots")
    .select("id, dietitian_id, start_at, duration_min, status")
    .eq("dietitian_id", id)
    .eq("status", "open")
    .gt("start_at", new Date().toISOString())
    .order("start_at");

  const slots = (slotData ?? []) as Slot[];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <Link
        href="/diyetisyenler"
        className="text-sm text-gray-400 hover:underline"
      >
        ← Diyetisyenler
      </Link>

      <div className="glass flex items-start gap-4 rounded-3xl p-5 shadow-[var(--shadow-soft)]">
        <DietitianAvatar
          name={d.full_name}
          photoUrl={d.photo_url}
          className="h-20 w-20"
        />
        <div className="min-w-0">
          <h1 className="text-xl font-bold">{d.full_name}</h1>
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            {d.title}
            {d.years_experience ? ` · ${d.years_experience} yıl deneyim` : ""}
          </p>
          {d.city && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="h-3 w-3" /> {d.city}
            </p>
          )}
        </div>
      </div>

      {d.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {d.specialties.map((s) => (
            <span
              key={s}
              className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {d.bio && (
        <div className="space-y-1">
          <h2 className="font-semibold">Hakkında</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">{d.bio}</p>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="font-semibold">Randevu al</h2>
        <SlotPicker dietitianId={d.id} slots={slots} />
      </div>
    </div>
  );
}
