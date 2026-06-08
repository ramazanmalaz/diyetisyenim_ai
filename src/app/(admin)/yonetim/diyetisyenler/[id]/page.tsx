import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addSlot,
  deleteSlot,
} from "@/app/(admin)/yonetim/diyetisyenler/actions";
import { DietitianForm } from "@/components/admin/dietitian-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireStaff } from "@/lib/auth";
import { formatDateTime } from "@/lib/appointments";
import { SLOT_STATUS_LABEL } from "@/lib/dietitians";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type DietitianRow = Database["public"]["Tables"]["dietitians"]["Row"];
type SlotRow = Database["public"]["Tables"]["dietitian_slots"]["Row"];

export default async function AdminDietitianEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireStaff();
  const supabase = await createClient();

  const { data } = await supabase
    .from("dietitians")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const d = data as DietitianRow;

  const { data: slotData } = await supabase
    .from("dietitian_slots")
    .select("*")
    .eq("dietitian_id", id)
    .order("start_at");
  const slots = (slotData ?? []) as SlotRow[];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-8">
      <div>
        <Link
          href="/yonetim/diyetisyenler"
          className="text-sm text-gray-400 hover:underline"
        >
          ← Diyetisyenler
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{d.full_name}</h1>
      </div>

      <section className="space-y-3 rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
        <h2 className="font-semibold">Profil bilgileri</h2>
        <DietitianForm
          mode="edit"
          initial={{
            id: d.id,
            full_name: d.full_name,
            title: d.title,
            bio: d.bio,
            specialties: d.specialties,
            city: d.city,
            photo_url: d.photo_url,
            years_experience: d.years_experience,
            is_active: d.is_active,
            sort_order: d.sort_order,
            contact_phone: d.contact_phone,
            contact_email: d.contact_email,
          }}
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
        <h2 className="font-semibold">Müsait randevu saatleri</h2>

        <form action={addSlot} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="dietitianId" value={d.id} />
          <div>
            <label className="text-xs text-gray-500">Tarih & saat</label>
            <Input name="startAt" type="datetime-local" required className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Süre (dk)</label>
            <Input
              name="durationMin"
              type="number"
              defaultValue={40}
              min="10"
              step="5"
              className="mt-1 w-24"
            />
          </div>
          <Button type="submit">Saat ekle</Button>
        </form>

        {slots.length === 0 ? (
          <p className="text-sm text-gray-500">Henüz saat eklenmemiş.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {slots.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="flex-1">{formatDateTime(s.start_at)}</span>
                <span className="text-xs text-gray-500">{s.duration_min} dk</span>
                <span
                  className={
                    s.status === "booked"
                      ? "rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : s.status === "closed"
                        ? "rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500 dark:bg-gray-800"
                        : "rounded-full bg-sky-100 px-2 py-0.5 text-[11px] text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                  }
                >
                  {SLOT_STATUS_LABEL[s.status]}
                </span>
                <form action={deleteSlot}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="dietitianId" value={d.id} />
                  <button
                    type="submit"
                    className="text-xs text-red-600 hover:underline"
                  >
                    Sil
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
