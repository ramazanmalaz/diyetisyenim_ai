"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { reviewProgress } from "@/lib/ai/progress-review";
import { getUser } from "@/lib/auth";
import {
  getAssistantConversationId,
  logAssistantMessage,
} from "@/lib/chat/assistant";
import { consumeAiCredit } from "@/lib/entitlements";
import { consumedByDay, loadProgressData } from "@/lib/health/load";
import { lastDays, summarizePeriod } from "@/lib/health/summary";
import { istanbulNow } from "@/lib/group-assistant/schedule";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  HEALTH_WEIGHT_NOTE,
  healthSyncSchema,
  type HealthWriteback,
} from "@/lib/validations/health";

const WRITEBACK_DAYS = 7;

type SyncResult = { error: string } | { ok: true; writeback: HealthWriteback };

/** Uygulamada girilen son günlerin kalori ve kilosu — Sağlık'a yazılır. */
async function buildWriteback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<HealthWriteback> {
  const days = lastDays(istanbulNow().date, WRITEBACK_DAYS);
  const [consumed, { data: weights }] = await Promise.all([
    consumedByDay(supabase, userId, days[0], days[days.length - 1]),
    supabase
      .from("progress_entries")
      .select("entry_date, weight_kg, note")
      .eq("client_id", userId)
      .not("weight_kg", "is", null)
      .gte("entry_date", days[0])
      .order("created_at", { ascending: true }),
  ]);
  const weightByDay = new Map<string, number>();
  for (const w of weights ?? []) {
    if (w.note === HEALTH_WEIGHT_NOTE) continue;
    weightByDay.set(w.entry_date, Number(w.weight_kg));
  }
  return {
    // 0 da gönderilir: öğün geri alınınca Sağlık'taki kayıt silinsin.
    kcal: days.map((day) => ({ day, value: consumed.get(day) ?? 0 })),
    weights: [...weightByDay].map(([day, value]) => ({ day, value })),
  };
}

/**
 * Telefondaki Apple Sağlık verisini kaydeder ve Sağlık'a geri yazılacak
 * değerleri döndürür. Sağlık verisi yalnızca kullanıcının kendi satırlarına
 * (RLS) yazılır.
 */
export async function saveHealthSync(values: unknown): Promise<SyncResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };
  const parsed = healthSyncSchema.safeParse(values);
  if (!parsed.success) return { error: "Sağlık verisi okunamadı." };
  const { days, workouts, weights } = parsed.data;

  const supabase = await createClient();
  const now = new Date().toISOString();

  if (days.length > 0) {
    const { error } = await supabase.from("health_daily").upsert(
      days.map((d) => ({
        client_id: user.id,
        day: d.day,
        steps: d.steps ?? null,
        active_kcal: d.activeKcal ?? null,
        sleep_minutes: d.sleepMinutes ?? null,
        resting_hr: d.restingHr ?? null,
        updated_at: now,
      })),
      { onConflict: "client_id,day" },
    );
    if (error) {
      console.error("[saglik] günlük özet yazılamadı", error.message);
      return { error: "Sağlık verisi kaydedilemedi." };
    }
  }

  if (workouts.length > 0) {
    const { error } = await supabase.from("health_workouts").upsert(
      workouts.map((w) => ({
        client_id: user.id,
        platform_id: w.platformId,
        workout_type: w.type,
        started_at: w.startedAt,
        duration_min: Math.round(w.durationMin * 10) / 10,
        kcal: w.kcal ?? null,
        distance_m: w.distanceM ?? null,
        source: w.source ?? null,
      })),
      { onConflict: "client_id,platform_id" },
    );
    if (error) console.error("[saglik] antrenmanlar yazılamadı", error.message);
  }

  if (weights.length > 0) {
    // Kullanıcının uygulamada girdiği tartıyı ezme; yalnızca boş günleri
    // ya da daha önce Sağlık'tan gelen kaydı güncelle.
    const { data: existing } = await supabase
      .from("progress_entries")
      .select("id, entry_date, note")
      .eq("client_id", user.id)
      .in(
        "entry_date",
        weights.map((w) => w.day),
      );
    const byDay = new Map<string, { id: string; note: string | null }[]>();
    for (const e of existing ?? []) {
      byDay.set(e.entry_date, [...(byDay.get(e.entry_date) ?? []), e]);
    }
    for (const w of weights) {
      const rows = byDay.get(w.day) ?? [];
      const fromHealth = rows.find((r) => r.note === HEALTH_WEIGHT_NOTE);
      if (fromHealth) {
        await supabase
          .from("progress_entries")
          .update({ weight_kg: w.kg })
          .eq("id", fromHealth.id);
      } else if (rows.length === 0) {
        await supabase.from("progress_entries").insert({
          client_id: user.id,
          entry_date: w.day,
          weight_kg: w.kg,
          note: HEALTH_WEIGHT_NOTE,
        });
      }
    }
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("health_connected_at")
    .eq("id", user.id)
    .maybeSingle();
  await admin
    .from("profiles")
    .update({
      health_synced_at: now,
      health_connected_at: profile?.health_connected_at ?? now,
    })
    .eq("id", user.id);

  revalidatePath("/gelisim");
  return { ok: true, writeback: await buildWriteback(supabase, user.id) };
}

/** Öğün işaretlenince/kilo girilince yalnızca geri yazılacak değerler. */
export async function getHealthWriteback(): Promise<SyncResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };
  const supabase = await createClient();
  return { ok: true, writeback: await buildWriteback(supabase, user.id) };
}

/** Bağlantıyı keser; istenirse sunucudaki Sağlık verilerini de siler. */
export async function disconnectHealth(
  values: unknown,
): Promise<{ error: string } | { ok: true }> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };
  const parsed = z.object({ deleteData: z.boolean() }).safeParse(values);
  if (!parsed.success) return { error: "Geçersiz istek." };

  const supabase = await createClient();
  if (parsed.data.deleteData) {
    await Promise.all([
      supabase.from("health_daily").delete().eq("client_id", user.id),
      supabase.from("health_workouts").delete().eq("client_id", user.id),
      supabase
        .from("progress_entries")
        .delete()
        .eq("client_id", user.id)
        .eq("note", HEALTH_WEIGHT_NOTE),
    ]);
  }
  await createAdminClient()
    .from("profiles")
    .update({ health_connected_at: null, health_synced_at: null })
    .eq("id", user.id);
  revalidatePath("/gelisim");
  return { ok: true };
}

const reviewSchema = z.object({
  period: z.union([z.literal(7), z.literal(30)]),
});

export type ReviewResult =
  | { error: string }
  | { quota: true }
  | { ok: true; text: string };

/** Dönem verilerini AI ile yorumlar (chat kredisi). */
export async function reviewMyProgress(values: unknown): Promise<ReviewResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };
  const parsed = reviewSchema.safeParse(values);
  if (!parsed.success) return { error: "Geçersiz dönem." };

  const supabase = await createClient();
  const dayKeys = lastDays(istanbulNow().date, parsed.data.period);
  const [data, { data: intake }] = await Promise.all([
    loadProgressData(supabase, user.id, dayKeys),
    supabase
      .from("intakes")
      .select("goal_loss_kg, goal_weeks")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const summary = summarizePeriod(
    data.days,
    data.workouts,
    data.weights,
    data.target,
  );
  if (
    summary.loggedDays === 0 &&
    !summary.hasHealthData &&
    summary.workoutCount === 0
  ) {
    return {
      error:
        "Bu dönemde değerlendirecek veri yok. Öğünlerini işaretle ya da Apple Sağlık'ı bağla.",
    };
  }

  const credit = await consumeAiCredit(user.id, "chat");
  if (!credit.ok) return { quota: true };

  try {
    const goal = intake
      ? `${intake.goal_weeks} haftada ${intake.goal_loss_kg} kg vermek`
      : null;
    const text = await reviewProgress(summary, goal);

    // Denetlenebilirlik (§5): AI çıktısı asistan konuşmasına da kaydedilir.
    const admin = createAdminClient();
    const conversationId = await getAssistantConversationId(
      admin,
      user.id,
    ).catch(() => null);
    if (conversationId) {
      await logAssistantMessage(admin, conversationId, {
        type: "user",
        content: `📊 Son ${parsed.data.period} günümü değerlendirir misin?`,
        senderId: user.id,
      });
      await logAssistantMessage(admin, conversationId, {
        type: "ai",
        content: text,
        senderId: null,
      });
    }
    return { ok: true, text };
  } catch (err) {
    console.error("[gelisim] değerlendirme hatası:", err);
    return { error: "Şu an değerlendirme yapılamıyor, tekrar dene." };
  }
}
