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

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Tüm bildirim tercihlerini kaydeder (merkezi /ayarlar sayfası; cron okur). */
export async function saveNotificationPrefs(
  values: unknown,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };
  const parsed = z
    .object({
      water: z.boolean(),
      waterStart: z.coerce.number().int().min(5).max(22),
      waterEnd: z.coerce.number().int().min(6).max(23),
      waterInterval: z.coerce.number().int().min(1).max(6),
      waterAmount: z.coerce.number().int().min(50).max(2000),
      meals: z.boolean(),
      breakfast: z.string().regex(TIME_RE),
      lunch: z.string().regex(TIME_RE),
      dinner: z.string().regex(TIME_RE),
      pomodoro: z.boolean(),
    })
    .refine((v) => v.waterEnd > v.waterStart, {
      message: "Bitiş saati başlangıçtan sonra olmalı.",
    })
    .safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz ayar." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      water_reminder_enabled: parsed.data.water,
      water_start_hour: parsed.data.waterStart,
      water_end_hour: parsed.data.waterEnd,
      water_interval_hours: parsed.data.waterInterval,
      water_amount_ml: parsed.data.waterAmount,
      meal_reminders_enabled: parsed.data.meals,
      breakfast_time: parsed.data.breakfast,
      lunch_time: parsed.data.lunch,
      dinner_time: parsed.data.dinner,
      pomodoro_reminders_enabled: parsed.data.pomodoro,
    })
    .eq("id", user.id);
  if (error) return { error: "Ayarlar kaydedilemedi." };
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
