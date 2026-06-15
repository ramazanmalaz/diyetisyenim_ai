"use server";

import { z } from "zod";

import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string } | { ok: true };

const subSchema = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
});

/** Cihazın push aboneliğini kaydeder (varsa günceller). */
export async function savePushSubscription(
  values: unknown,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };
  const parsed = subSchema.safeParse(values);
  if (!parsed.success) return { error: "Geçersiz abonelik." };

  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      endpoint: parsed.data.endpoint,
      client_id: user.id,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) return { error: "Abonelik kaydedilemedi." };
  return { ok: true };
}

/** Su hatırlatıcısı tercihini sunucuda kaydeder (cron bunu okur). */
export async function setWaterReminder(enabled: unknown): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };
  const on = enabled === true || enabled === "true" || enabled === 1;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ water_reminder_enabled: on })
    .eq("id", user.id);
  if (error) return { error: "Tercih kaydedilemedi." };
  return { ok: true };
}
