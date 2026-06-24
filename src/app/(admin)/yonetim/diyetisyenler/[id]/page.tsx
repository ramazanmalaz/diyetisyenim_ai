import Link from "next/link";
import { notFound } from "next/navigation";

import { AvailabilityCalendar } from "@/components/admin/availability-calendar";
import { DietitianForm } from "@/components/admin/dietitian-form";
import { requireStaff } from "@/lib/auth";
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
            featured: d.featured,
            sort_order: d.sort_order,
            contact_phone: d.contact_phone,
            contact_email: d.contact_email,
          }}
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
        <h2 className="font-semibold">Müsait randevu saatleri</h2>
        <AvailabilityCalendar
          dietitianId={d.id}
          slots={slots.map((s) => ({
            id: s.id,
            start_at: s.start_at,
            duration_min: s.duration_min,
            status: s.status,
          }))}
        />
      </section>
    </div>
  );
}
