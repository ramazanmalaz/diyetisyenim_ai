"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { appointmentSchema } from "@/lib/validations/appointment";

export type ActionResult = { error: string } | { success: true };

export async function requestAppointment(
  values: unknown,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const parsed = appointmentSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("appointments").insert({
    client_id: user.id,
    scheduled_at: new Date(parsed.data.scheduledAt).toISOString(),
    notes: parsed.data.notes,
    status: "requested",
  });

  if (error) return { error: "Randevu talebi oluşturulamadı." };

  revalidatePath("/randevu");
  return { success: true };
}

export async function cancelAppointment(formData: FormData): Promise<void> {
  const user = await getUser();
  if (!user) return;

  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const admin = createAdminClient();
  // Sahiplik denetimi + ilişkili slotu serbest bırak.
  const { data: appt } = await admin
    .from("appointments")
    .select("id, client_id, slot_id")
    .eq("id", id.data)
    .single();
  if (!appt || appt.client_id !== user.id) return;

  if (appt.slot_id) {
    await admin
      .from("dietitian_slots")
      .update({ status: "open" })
      .eq("id", appt.slot_id);
  }
  await admin.from("appointments").delete().eq("id", id.data);
  revalidatePath("/randevu");
}
