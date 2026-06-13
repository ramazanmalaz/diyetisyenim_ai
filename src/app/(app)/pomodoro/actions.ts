"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getUser } from "@/lib/auth";
import { hhmmToMin } from "@/lib/pomodoro";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { pomodoroPlanSchema } from "@/lib/validations/pomodoro";

export type PomodoroPlan = {
  start_min: number;
  end_min: number;
  work_min: number;
  break_min: number;
  muted: boolean;
  completed_sessions: number;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export type SaveResult = { error: string } | { plan: PomodoroPlan };

/** O günün odak planını oluşturur/günceller (ilerleme ve sustur sıfırlanır). */
export async function savePomodoroPlan(values: unknown): Promise<SaveResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const parsed = pomodoroPlanSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  }

  const plan: PomodoroPlan = {
    start_min: hhmmToMin(parsed.data.start),
    end_min: hhmmToMin(parsed.data.end),
    work_min: parsed.data.workMin,
    break_min: parsed.data.breakMin,
    muted: false,
    completed_sessions: 0,
  };

  const supabase = await createClient();
  const { error } = await supabase.from("pomodoro_plans").upsert(
    {
      client_id: user.id,
      plan_date: today(),
      ...plan,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id,plan_date" },
  );
  if (error) return { error: "Plan kaydedilemedi." };

  revalidatePath("/pomodoro");
  return { plan };
}

export type StateResult = { error: string } | { ok: true };

/**
 * Çalışan zamanlayıcının kalıcı durumunu günceller (sustur / ilerleme).
 * Sık çağrıldığı için iyimser kullanılır; revalidate yapmaz.
 */
export async function updatePomodoroState(values: unknown): Promise<StateResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const parsed = z
    .object({
      muted: z.boolean().optional(),
      completedSessions: z.coerce.number().int().min(0).max(100).optional(),
    })
    .safeParse(values);
  if (!parsed.success) return { error: "Geçersiz veri." };

  const patch: Database["public"]["Tables"]["pomodoro_plans"]["Update"] = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.muted !== undefined) patch.muted = parsed.data.muted;
  if (parsed.data.completedSessions !== undefined) {
    patch.completed_sessions = parsed.data.completedSessions;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("pomodoro_plans")
    .update(patch)
    .eq("client_id", user.id)
    .eq("plan_date", today());
  if (error) return { error: "Güncellenemedi." };

  return { ok: true };
}

/** O günün planını siler (yeni plan kurmak için). */
export async function clearPomodoroPlan(): Promise<StateResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("pomodoro_plans")
    .delete()
    .eq("client_id", user.id)
    .eq("plan_date", today());
  if (error) return { error: "Silinemedi." };

  revalidatePath("/pomodoro");
  return { ok: true };
}
