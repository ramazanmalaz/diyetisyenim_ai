"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { appointmentStatusSchema } from "@/lib/validations/appointment";

export type ActionResult = { error: string } | { success: true };

export async function setAppointmentStatus(
  values: unknown,
): Promise<ActionResult> {
  const profile = await requireStaff();
  const parsed = appointmentStatusSchema.safeParse(values);
  if (!parsed.success) return { error: "Geçersiz durum." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .update({
      status: parsed.data.status,
      // Onaylanınca randevuyu üstlenen diyetisyeni ata.
      dietitian_id: parsed.data.status === "confirmed" ? profile.id : undefined,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: "Durum güncellenemedi." };

  revalidatePath("/yonetim/randevular");
  return { success: true };
}
