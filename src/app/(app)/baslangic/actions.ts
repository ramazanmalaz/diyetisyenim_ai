"use server";

import { redirect } from "next/navigation";

import { generateWeeklyPrograms } from "@/lib/ai/plan";
import {
  analyzePlanPhoto,
  type ImageMediaType,
  type PlanPhotoScan,
} from "@/lib/ai/respond";
import { getActiveDietitianRules } from "@/lib/ai/rules";
import { getUser } from "@/lib/auth";
import { computeCaloriePlan, ACTIVITY_LABEL } from "@/lib/diet/calories";
import { consumeAiCredit } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DIET_TYPE_LABEL, intakeSchema } from "@/lib/validations/intake";
import { manualPlanSchema } from "@/lib/validations/manual-plan";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
} from "@/lib/validations/progress";

export type GenerateResult = { error: string };

const PLAN_BUCKET = "progress-photos";
const MAX_PLAN_PHOTOS = 4;

const SEX_LABEL = { female: "Kadın", male: "Erkek" } as const;

export async function generatePlan(values: unknown): Promise<GenerateResult> {
  const user = await getUser();
  if (!user) redirect("/giris");

  const parsed = intakeSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz bilgiler." };
  }
  const v = parsed.data;

  const cal = computeCaloriePlan({
    sex: v.sex,
    age: v.age,
    heightCm: v.heightCm,
    weightKg: v.currentWeightKg,
    activity: v.activity,
    goalLossKg: v.goalLossKg,
    goalWeeks: v.goalWeeks,
  });

  // diet_plans/meals yazımı RLS'de personele kısıtlı → service-role kullan.
  const admin = createAdminClient();

  await admin.from("intakes").insert({
    client_id: user.id,
    sex: v.sex,
    age: v.age,
    height_cm: v.heightCm,
    current_weight_kg: v.currentWeightKg,
    activity_level: v.activity,
    goal_loss_kg: v.goalLossKg,
    goal_weeks: v.goalWeeks,
    health_notes: v.healthNotes,
    dislikes: v.dislikes,
  });

  const intakeSummary = [
    `Cinsiyet: ${SEX_LABEL[v.sex]}`,
    `Yaş: ${v.age}`,
    `Boy: ${v.heightCm} cm`,
    `Kilo: ${v.currentWeightKg} kg`,
    `Aktivite: ${ACTIVITY_LABEL[v.activity]}`,
    `Tercih edilen diyet tipi: ${DIET_TYPE_LABEL[v.dietType]} (plan bu tarza uygun olmalı)`,
    `Hedef: ${v.goalLossKg} kg / ${v.goalWeeks} hafta`,
    v.healthNotes ? `Sağlık: ${v.healthNotes}` : null,
    v.dislikes ? `Sevmedikleri: ${v.dislikes}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const rules = await getActiveDietitianRules();

  // Hedef süreye göre birbirinden farklı haftalık programlar (paralel üretim).
  let weeks;
  try {
    weeks = await generateWeeklyPrograms({
      dietitianRules: rules,
      dailyTarget: cal.dailyTarget,
      intakeSummary,
      numWeeks: v.goalWeeks,
    });
  } catch (err) {
    console.error("[generatePlan] AI hatası:", err);
    return { error: "Plan oluşturulamadı. Lütfen tekrar dene." };
  }

  // Önceki aktif planları arşivle.
  await admin
    .from("diet_plans")
    .update({ status: "archived" })
    .eq("client_id", user.id)
    .eq("status", "active");

  // Hedef süre aralığı: bugünden başlayıp goalWeeks hafta sonra biter.
  const today = new Date();
  const validFrom = today.toISOString().slice(0, 10);
  const validTo = new Date(today.getTime() + v.goalWeeks * 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const { data: plan, error: planError } = await admin
    .from("diet_plans")
    .insert({
      client_id: user.id,
      created_by: user.id,
      title: "AI Asistan Diyet Planı",
      status: "active",
      source: "ai",
      daily_calorie_target: cal.dailyTarget,
      estimated_weeks: cal.estimatedWeeks,
      goal_loss_kg: v.goalLossKg,
      valid_from: validFrom,
      valid_to: validTo,
    })
    .select("id")
    .single();

  if (planError || !plan) {
    return { error: "Plan kaydedilemedi." };
  }

  const rows = weeks.flatMap((weekMeals, w) =>
    weekMeals.map((m, i) => ({
      plan_id: plan.id,
      week_index: w,
      day_of_week: m.day_of_week,
      meal_type: m.meal_type,
      content: m.item,
      calories: m.calories,
      sort_order: i,
    })),
  );
  await admin.from("meals").insert(rows);

  redirect("/plan");
}

// ---------------------------------------------------------------------------
// "Hazır planım var" akışı — foto yükleme, AI ile okuma, manuel kaydetme
// ---------------------------------------------------------------------------

/** FormData'daki "photos" dosyalarını doğrular, Storage'a yükler, yolları döndürür. */
async function uploadPlanFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  files: File[],
): Promise<{ error: string } | { paths: string[] }> {
  const valid = files.filter((f) => f instanceof File && f.size > 0);
  if (valid.length === 0) return { error: "Dosya seçilmedi." };
  if (valid.length > MAX_PLAN_PHOTOS) {
    return { error: `En fazla ${MAX_PLAN_PHOTOS} görsel yükleyebilirsin.` };
  }

  const paths: string[] = [];
  for (const [i, file] of valid.entries()) {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      return { error: "Yalnızca JPEG, PNG veya WEBP yükleyebilirsin." };
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return { error: "Her görsel en fazla 5 MB olabilir." };
    }
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/plans/${Date.now()}-${i}.${ext}`;
    const { error } = await supabase.storage
      .from(PLAN_BUCKET)
      .upload(path, file, { contentType: file.type });
    if (error) return { error: "Görsel yüklenemedi." };
    paths.push(path);
  }
  return { paths };
}

export type UploadResult = { error: string } | { photoPaths: string[] };

/** Plan görsellerini yalnızca referans olarak yükler (AI okuması yok). */
export async function uploadPlanPhotos(
  formData: FormData,
): Promise<UploadResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const supabase = await createClient();
  const files = formData.getAll("photos") as File[];
  const res = await uploadPlanFiles(supabase, user.id, files);
  if ("error" in res) return { error: res.error };
  return { photoPaths: res.paths };
}

export type ExtractResult =
  | { error: string }
  | { quota: true }
  | { photoPaths: string[]; meals: PlanPhotoScan["meals"]; note: string };

/** Plan görsellerini yükler VE AI (vision) ile öğün şablonuna dönüştürür. */
export async function extractPlanFromPhoto(
  formData: FormData,
): Promise<ExtractResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const supabase = await createClient();
  const files = (formData.getAll("photos") as File[]).filter(
    (f) => f instanceof File && f.size > 0,
  );
  if (files.length === 0) return { error: "Önce bir görsel seç." };

  // Freemium: günde 1 ücretsiz foto analizi; üstü premium → popup. (Elle giriş hep ücretsiz.)
  const credit = await consumeAiCredit(user.id, "vision");
  if (!credit.ok) {
    return { quota: true };
  }

  // Vision için base64 hazırla (yüklemeden önce; aynı File buffer'ları).
  const images: { base64: string; mediaType: ImageMediaType }[] = [];
  for (const file of files.slice(0, MAX_PLAN_PHOTOS)) {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      return { error: "Yalnızca JPEG, PNG veya WEBP." };
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return { error: "Her görsel en fazla 5 MB olabilir." };
    }
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    images.push({ base64, mediaType: file.type as ImageMediaType });
  }

  const res = await uploadPlanFiles(supabase, user.id, files);
  if ("error" in res) return { error: res.error };

  const rules = await getActiveDietitianRules();
  try {
    const scan = await analyzePlanPhoto({ images, dietitianRules: rules });
    return { photoPaths: res.paths, meals: scan.meals, note: scan.note };
  } catch {
    // Yükleme yine de başarılı; kullanıcı elle doldurabilir.
    return {
      photoPaths: res.paths,
      meals: [],
      note: "Görsel okunamadı; öğünleri elle girebilirsin.",
    };
  }
}

/** Kullanıcının kendi (mevcut) planını kaydeder; tek günlük şablonu 7 güne uygular. */
export async function saveManualPlan(values: unknown): Promise<GenerateResult> {
  const user = await getUser();
  if (!user) redirect("/giris");

  const parsed = manualPlanSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz plan." };
  }
  const v = parsed.data;
  const applyAll = v.applyToAllDays ?? false;

  // Günlük hedef: verilmişse o; değilse ortalama bir günün toplamı.
  const totalCal = v.items.reduce((s, it) => s + it.calories, 0);
  const distinctDays = applyAll
    ? 1
    : new Set(v.items.map((it) => it.dayOfWeek)).size || 1;
  const dailyTarget =
    v.dailyTarget && v.dailyTarget > 0
      ? v.dailyTarget
      : Math.round(totalCal / distinctDays);

  const admin = createAdminClient();

  // Önceki aktif planları arşivle.
  await admin
    .from("diet_plans")
    .update({ status: "archived" })
    .eq("client_id", user.id)
    .eq("status", "active");

  const { data: plan, error: planError } = await admin
    .from("diet_plans")
    .insert({
      client_id: user.id,
      created_by: user.id,
      title: v.title?.trim() || "Kendi Planım",
      status: "active",
      source: "manual",
      daily_calorie_target: dailyTarget,
      photo_paths: v.photoPaths && v.photoPaths.length ? v.photoPaths : null,
    })
    .select("id")
    .single();

  if (planError || !plan) return { error: "Plan kaydedilemedi." };

  // applyToAllDays: tek günlük şablonu 7 güne kopyala. Aksi halde her öğe kendi gününde.
  const rows = applyAll
    ? Array.from({ length: 7 }, (_, day) =>
        v.items.map((it, i) => ({
          plan_id: plan.id,
          week_index: 0,
          day_of_week: day,
          meal_type: it.mealType,
          content: it.content,
          calories: it.calories,
          sort_order: i,
        })),
      ).flat()
    : v.items.map((it, i) => ({
        plan_id: plan.id,
        week_index: 0,
        day_of_week: it.dayOfWeek,
        meal_type: it.mealType,
        content: it.content,
        calories: it.calories,
        sort_order: i,
      }));
  await admin.from("meals").insert(rows);

  redirect("/plan");
}
