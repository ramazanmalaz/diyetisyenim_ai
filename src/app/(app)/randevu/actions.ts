"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getUser } from "@/lib/auth";
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

  const supabase = await createClient();
  // RLS: yalnızca kendi randevusunu silebilir.
  await supabase.from("appointments").delete().eq("id", id.data);
  revalidatePath("/randevu");
}
