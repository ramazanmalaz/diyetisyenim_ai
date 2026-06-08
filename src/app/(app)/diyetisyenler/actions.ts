"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type BookResult = { error: string } | { success: true };

/**
 * Slot bazlı randevu alma. Yarış durumunu önlemek için önce slot atomik olarak
 * 'booked'a çekilir (status='open' koşuluyla), sonra randevu oluşturulur.
 * Yazımlar RLS'de personele kısıtlı olduğundan service-role (admin) kullanılır;
 * sahiplik/uygunluk burada elle denetlenir.
 */
export async function bookSlot(values: unknown): Promise<BookResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const parsed = z
    .object({ dietitianId: z.string().uuid(), slotId: z.string().uuid() })
    .safeParse(values);
  if (!parsed.success) return { error: "Geçersiz seçim." };

  const admin = createAdminClient();

  // Slotu atomik kap (yalnızca açık + gelecekteki + bu diyetisyene ait).
  const { data: claimed } = await admin
    .from("dietitian_slots")
    .update({ status: "booked" })
    .eq("id", parsed.data.slotId)
    .eq("dietitian_id", parsed.data.dietitianId)
    .eq("status", "open")
    .gt("start_at", new Date().toISOString())
    .select("start_at");

  if (!claimed || claimed.length === 0) {
    return { error: "Bu saat artık müsait değil, başka bir saat seç." };
  }

  const { error } = await admin.from("appointments").insert({
    client_id: user.id,
    dietitian_ref: parsed.data.dietitianId,
    slot_id: parsed.data.slotId,
    scheduled_at: claimed[0].start_at,
    status: "confirmed",
  });

  if (error) {
    // Randevu oluşmadıysa slotu geri aç.
    await admin
      .from("dietitian_slots")
      .update({ status: "open" })
      .eq("id", parsed.data.slotId);
    return { error: "Randevu oluşturulamadı, tekrar dene." };
  }

  revalidatePath("/randevu");
  revalidatePath(`/diyetisyenler/${parsed.data.dietitianId}`);
  return { success: true };
}
