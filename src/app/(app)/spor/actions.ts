"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { ImageMediaType } from "@/lib/ai/respond";
import {
  analyzeGymEquipment,
  generateWorkoutProgram,
} from "@/lib/ai/workout";
import { getUser } from "@/lib/auth";
import { consumeAiCredit } from "@/lib/entitlements";
import { resolveExerciseFrames } from "@/lib/exercise-db";
import { findExercise, loadExercisesDataset } from "@/lib/exercises-dataset";
import { createAdminClient } from "@/lib/supabase/admin";
import { GOAL_LABEL, LEVEL_LABEL, STYLE_LABEL } from "@/lib/workout";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
} from "@/lib/validations/progress";

export type WorkoutResult = { error: string } | { quota: true } | { ok: true };
export type GymScanResult =
  | { error: string }
  | { quota: true }
  | { equipment: string[]; note: string };

const genSchema = z.object({
  mode: z.enum(["bodyweight", "gym"]),
  level: z.string().max(20),
  goal: z.string().max(20),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  equipment: z.array(z.string().max(160)).max(40).optional().default([]),
  sex: z.enum(["female", "male"]).optional(),
  sessionMin: z.coerce.number().int().min(15).max(180).optional(),
  style: z.string().max(20).optional(),
  injuries: z.string().max(300).optional(),
});

/** Antrenman programı üretir ve kaydeder (sohbet kredisi tüketir). */
export async function generateWorkout(values: unknown): Promise<WorkoutResult> {
  const user = await getUser();
  if (!user) redirect("/giris");

  const parsed = genSchema.safeParse(values);
  if (!parsed.success) return { error: "Geçersiz bilgiler." };
  const v = parsed.data;

  const credit = await consumeAiCredit(user.id, "chat");
  if (!credit.ok) return { quota: true };

  const intakeSummary = [
    `Seviye: ${LEVEL_LABEL[v.level] ?? v.level}`,
    `Hedef: ${GOAL_LABEL[v.goal] ?? v.goal}`,
    v.sex ? `Cinsiyet: ${v.sex === "female" ? "Kadın" : "Erkek"}` : null,
    `Haftada ${v.daysPerWeek} gün`,
    v.sessionMin ? `Seans süresi: ~${v.sessionMin} dk (egzersiz sayısını buna göre ayarla)` : null,
    v.style && v.style !== "any"
      ? `Tercih edilen antrenman tarzı: ${STYLE_LABEL[v.style] ?? v.style} (programı bu tarza göre kur)`
      : null,
    v.injuries ? `Sakatlık/kısıt: ${v.injuries} (bu bölgeyi zorlayan hareketlerden kaçın)` : null,
    v.mode === "gym" ? "Spor salonu" : "Kendi vücut ağırlığı (ev)",
  ]
    .filter(Boolean)
    .join(", ");

  let program;
  try {
    program = await generateWorkoutProgram({
      mode: v.mode,
      level: v.level,
      goal: v.goal,
      daysPerWeek: v.daysPerWeek,
      equipment: v.equipment,
      intakeSummary,
    });
  } catch (e) {
    console.error("[spor] program üretilemedi:", e instanceof Error ? e.message : e);
    return { error: "Program oluşturulamadı. Lütfen tekrar dene." };
  }

  const admin = createAdminClient();
  await admin
    .from("workout_plans")
    .update({ status: "archived" })
    .eq("client_id", user.id)
    .eq("status", "active");

  const { error } = await admin.from("workout_plans").insert({
    client_id: user.id,
    mode: v.mode,
    level: v.level,
    goal: v.goal,
    days_per_week: v.daysPerWeek,
    equipment: v.equipment,
    program,
    status: "active",
  });
  if (error) return { error: "Program kaydedilemedi." };
  // Başarı: sunucudan taze yönlendir (client soft-nav bayat RSC alıp spinner'da
  // takılıyordu). redirect() NEXT_REDIRECT atar; client navigasyonu yapar.
  redirect("/spor");
}

/** Spor salonu fotoğraflarından aletleri tanır (vision kredisi tüketir). */
export async function analyzeGym(formData: FormData): Promise<GymScanResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const files = (formData.getAll("photos") as File[]).filter(
    (f) => f instanceof File && f.size > 0,
  );
  if (files.length === 0) return { error: "Önce bir fotoğraf seç." };

  const credit = await consumeAiCredit(user.id, "vision");
  if (!credit.ok) return { quota: true };

  const images: { base64: string; mediaType: ImageMediaType }[] = [];
  for (const file of files.slice(0, 4)) {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      return { error: "Yalnızca JPEG, PNG veya WEBP." };
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return { error: "Her görsel en fazla 5 MB olabilir." };
    }
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    images.push({ base64, mediaType: file.type as ImageMediaType });
  }

  try {
    const res = await analyzeGymEquipment({ images });
    return { equipment: res.equipment, note: res.note };
  } catch (e) {
    console.error("[spor] alet tanıma hatası:", e instanceof Error ? e.message : e);
    return { error: "Aletler tanınamadı, tekrar dene." };
  }
}

export type ExerciseDemoResult = {
  frames: string[] | null;
  gifUrl: string | null;
  trSteps: string[] | null;
  trInstructions: string | null;
  muscleGroup: string | null;
};

/**
 * Egzersiz için demo görsel + Türkçe talimatlar.
 * Önce hasaneyldrm/exercises-dataset'ten GIF + TR talimat; paralelde yuhonas'tan
 * 2-kare animasyon (GIF yoksa fallback olarak kullanılır).
 */
export async function exerciseDemo(
  query: unknown,
): Promise<ExerciseDemoResult> {
  const q = typeof query === "string" ? query : "";
  try {
    const [frames, dataset] = await Promise.all([
      resolveExerciseFrames(q),
      findExercise(q),
    ]);
    return {
      frames,
      gifUrl: dataset?.gifUrl ?? null,
      trSteps: dataset?.trSteps ?? null,
      trInstructions: dataset?.trInstructions ?? null,
      muscleGroup: dataset?.muscleGroup ?? null,
    };
  } catch {
    return { frames: null, gifUrl: null, trSteps: null, trInstructions: null, muscleGroup: null };
  }
}

export type WorkoutLogResult = { error: string } | { ok: true };

/** Bir egzersizi belirli tarihte tamamlandı/işareti-kaldır olarak kaydeder. */
export async function setExerciseDone(values: unknown): Promise<WorkoutLogResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };
  const parsed = z
    .object({
      dayIndex: z.coerce.number().int().min(0).max(13),
      exerciseIndex: z.coerce.number().int().min(0).max(49),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      done: z.boolean(),
    })
    .safeParse(values);
  if (!parsed.success) return { error: "Geçersiz veri." };

  const admin = createAdminClient();
  if (parsed.data.done) {
    const { error } = await admin.from("workout_logs").upsert(
      {
        client_id: user.id,
        day_index: parsed.data.dayIndex,
        exercise_index: parsed.data.exerciseIndex,
        log_date: parsed.data.date,
      },
      { onConflict: "client_id,day_index,exercise_index,log_date" },
    );
    if (error) return { error: "Kaydedilemedi." };
  } else {
    const { error } = await admin
      .from("workout_logs")
      .delete()
      .eq("client_id", user.id)
      .eq("day_index", parsed.data.dayIndex)
      .eq("exercise_index", parsed.data.exerciseIndex)
      .eq("log_date", parsed.data.date);
    if (error) return { error: "Güncellenemedi." };
  }
  return { ok: true };
}

export type ExerciseCard = {
  id: string;
  name: string;
  gifUrl: string | null;
  muscleGroup: string | null;
  trSteps: string[] | null;
  trInstructions: string | null;
};

/** exercises-dataset'ten body_part'a göre egzersiz listesi döndürür. */
export async function getExercisesByBodyPart(
  bodyPart: string,
): Promise<ExerciseCard[]> {
  const dataset = await loadExercisesDataset();
  return dataset
    .filter((x) => x.bodyPart.toLowerCase() === bodyPart.toLowerCase())
    .slice(0, 50)
    .map((x) => ({
      id: x.id,
      name: x.name,
      gifUrl: x.gifUrl,
      muscleGroup: x.muscleGroup,
      trSteps: x.trSteps,
      trInstructions: x.trInstructions,
    }));
}

/** Aktif programı arşivler (baştan başla). */
export async function resetWorkout(): Promise<void> {
  const user = await getUser();
  if (!user) redirect("/giris");
  const admin = createAdminClient();
  await admin
    .from("workout_plans")
    .update({ status: "archived" })
    .eq("client_id", user.id)
    .eq("status", "active");
  redirect("/spor/baslangic");
}
