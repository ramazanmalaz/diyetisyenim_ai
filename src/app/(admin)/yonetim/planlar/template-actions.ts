"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import { generatePlanMeals } from "@/lib/ai/plan";
import {
  analyzePlanPhoto,
  type ImageMediaType,
  type PlanAttachment,
} from "@/lib/ai/respond";
import { getActiveDietitianRules } from "@/lib/ai/rules";
import { assignPlanCopy } from "@/lib/diet/assign";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ALLOWED_PLAN_FILE_TYPES,
  MAX_PHOTO_BYTES,
  MAX_PLAN_PDF_BYTES,
  MAX_PLAN_PHOTOS,
  MAX_PLAN_TOTAL_BYTES,
} from "@/lib/validations/plan-upload";

export type TemplateResult = { error: string } | { ok: true };

// ─── Boş şablon oluştur (öğünleri elle girilir) ──────────────────────────────
const createSchema = z.object({
  title: z.string().min(2, "Başlık en az 2 karakter").max(120),
  dailyTarget: z.coerce.number().int().min(800).max(5000).optional(),
});

export async function createTemplate(
  _prev: TemplateResult | null,
  formData: FormData,
): Promise<TemplateResult> {
  const staff = await requireStaff();
  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    dailyTarget: formData.get("daily_target") || undefined,
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz giriş" };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("diet_plans")
    .insert({
      client_id: null,
      created_by: staff.id,
      title: parsed.data.title,
      status: "draft",
      is_template: true,
      source: "manual",
      daily_calorie_target: parsed.data.dailyTarget ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Şablon oluşturulamadı." };

  revalidatePath("/yonetim/planlar");
  redirect(`/yonetim/planlar/${data.id}`);
}

// ─── AI ile şablon üret ──────────────────────────────────────────────────────
const aiSchema = z.object({
  title: z.string().min(2, "Başlık en az 2 karakter").max(120),
  dailyTarget: z.coerce.number().int().min(800).max(5000),
  brief: z.string().max(500).optional(),
});

/**
 * Diyetisyenin verdiği kalori hedefi + serbest tarife göre 7 günlük şablon
 * üretir. Danışan onboarding'indeki generatePlanMeals ile aynı altyapı.
 */
export async function createTemplateWithAi(
  _prev: TemplateResult | null,
  formData: FormData,
): Promise<TemplateResult> {
  const staff = await requireStaff();
  const parsed = aiSchema.safeParse({
    title: formData.get("title"),
    dailyTarget: formData.get("daily_target"),
    brief: formData.get("brief") || undefined,
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz giriş" };

  let meals;
  try {
    const rules = await getActiveDietitianRules();
    meals = await generatePlanMeals({
      dietitianRules: rules,
      dailyTarget: parsed.data.dailyTarget,
      intakeSummary:
        parsed.data.brief?.trim() ||
        `Genel yetişkin, günlük ${parsed.data.dailyTarget} kcal hedefli dengeli program`,
    });
  } catch (e) {
    console.error(
      "[planlar] AI şablon üretilemedi:",
      e instanceof Error ? e.message : e,
    );
    return { error: "Program üretilemedi. Lütfen tekrar dene." };
  }

  const admin = createAdminClient();
  const { data: plan, error } = await admin
    .from("diet_plans")
    .insert({
      client_id: null,
      created_by: staff.id,
      title: parsed.data.title,
      status: "draft",
      is_template: true,
      source: "ai",
      daily_calorie_target: parsed.data.dailyTarget,
    })
    .select("id")
    .single();

  if (error || !plan) return { error: "Şablon kaydedilemedi." };

  const { error: mealError } = await admin.from("meals").insert(
    meals.map((m, i) => ({
      plan_id: plan.id,
      day_of_week: m.day_of_week,
      meal_type: m.meal_type,
      content: m.item,
      calories: m.calories,
      sort_order: i,
      week_index: 0,
    })),
  );

  if (mealError) {
    await admin.from("diet_plans").delete().eq("id", plan.id);
    return { error: "Öğünler kaydedilemedi." };
  }

  revalidatePath("/yonetim/planlar");
  redirect(`/yonetim/planlar/${plan.id}`);
}

// ─── Fotoğraf / PDF'ten şablon oku ───────────────────────────────────────────
const photoSchema = z.object({
  title: z.string().min(2, "Başlık en az 2 karakter").max(120),
});

/**
 * Diyetisyenin elindeki hazır programın görsel(ler)ini/PDF'ini okuyup şablona
 * çevirir. Danışanın "Hazır planım var" akışıyla aynı vision altyapısı
 * (analyzePlanPhoto) — fark: sonuç danışana değil, şablon kütüphanesine yazılır.
 *
 * Görsel tek günlük bir şablonsa (multi_day=false) 7 güne kopyalanır ki
 * kullanılabilir bir haftalık program çıksın.
 */
export async function createTemplateFromPhoto(
  _prev: TemplateResult | null,
  formData: FormData,
): Promise<TemplateResult> {
  const staff = await requireStaff();
  const parsed = photoSchema.safeParse({ title: formData.get("title") });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz giriş" };

  const files = (formData.getAll("files") as File[]).filter(
    (f) => f instanceof File && f.size > 0,
  );
  if (files.length === 0) return { error: "Önce bir görsel veya PDF seç." };

  const selected = files.slice(0, MAX_PLAN_PHOTOS);
  const totalBytes = selected.reduce((s, f) => s + f.size, 0);
  if (totalBytes > MAX_PLAN_TOTAL_BYTES)
    return { error: "Dosyalar toplamda çok büyük. Daha azını dene." };

  const attachments: PlanAttachment[] = [];
  for (const file of selected) {
    const isPdf = file.type === "application/pdf";
    if (!ALLOWED_PLAN_FILE_TYPES.includes(file.type))
      return { error: "Yalnızca JPEG, PNG, WEBP veya PDF yükleyebilirsin." };
    if (file.size > (isPdf ? MAX_PLAN_PDF_BYTES : MAX_PHOTO_BYTES))
      return {
        error: isPdf
          ? "PDF en fazla 10 MB olabilir."
          : "Her görsel en fazla 5 MB olabilir.",
      };
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    attachments.push(
      isPdf
        ? { kind: "pdf", base64 }
        : { kind: "image", base64, mediaType: file.type as ImageMediaType },
    );
  }

  let scan;
  try {
    const rules = await getActiveDietitianRules();
    scan = await analyzePlanPhoto({ attachments, dietitianRules: rules });
  } catch (e) {
    console.error(
      "[planlar] görselden şablon okunamadı:",
      e instanceof Error ? e.message : e,
    );
    return { error: "Dosya okunamadı. Daha net bir görsel dene." };
  }

  if (scan.meals.length === 0)
    return { error: "Görselde öğün bulunamadı. Daha net bir görsel dene." };

  // Tek günlük şablonsa 7 güne yay — haftalık kullanılabilir program olsun.
  const rows = scan.multi_day
    ? scan.meals.map((m, i) => ({ ...m, day_of_week: m.day_of_week, order: i }))
    : Array.from({ length: 7 }).flatMap((_, day) =>
        scan.meals.map((m, i) => ({ ...m, day_of_week: day, order: i })),
      );

  // Günlük hedefi okunan kalorilerden türet (bir günün toplamı).
  const dayZeroTotal = rows
    .filter((r) => r.day_of_week === 0)
    .reduce((sum, r) => sum + (r.calories ?? 0), 0);

  const admin = createAdminClient();
  const { data: plan, error } = await admin
    .from("diet_plans")
    .insert({
      client_id: null,
      created_by: staff.id,
      title: parsed.data.title,
      status: "draft",
      is_template: true,
      source: "photo",
      daily_calorie_target: dayZeroTotal > 0 ? dayZeroTotal : null,
    })
    .select("id")
    .single();

  if (error || !plan) return { error: "Şablon kaydedilemedi." };

  const { error: mealError } = await admin.from("meals").insert(
    rows.map((m) => ({
      plan_id: plan.id,
      day_of_week: m.day_of_week,
      meal_type: m.meal_type,
      content: m.item,
      calories: m.calories,
      sort_order: m.order,
      week_index: 0,
    })),
  );

  if (mealError) {
    await admin.from("diet_plans").delete().eq("id", plan.id);
    return { error: "Öğünler kaydedilemedi." };
  }

  revalidatePath("/yonetim/planlar");
  redirect(`/yonetim/planlar/${plan.id}`);
}

// ─── Şablonu danışana ata (kopyalar) ─────────────────────────────────────────
export async function assignTemplateToClient(
  _prev: TemplateResult | null,
  formData: FormData,
): Promise<TemplateResult> {
  const staff = await requireStaff();
  const planId = z.string().uuid().safeParse(formData.get("plan_id"));
  const clientId = z.string().uuid().safeParse(formData.get("client_id"));
  if (!planId.success || !clientId.success) return { error: "Geçersiz giriş" };

  const admin = createAdminClient();
  const isAdminRole = staff.role === "admin";

  const [{ data: source }, { data: target }] = await Promise.all([
    admin.from("diet_plans").select("created_by").eq("id", planId.data).single(),
    admin
      .from("profiles")
      .select("dietitian_id")
      .eq("id", clientId.data)
      .single(),
  ]);

  if (!source || !target) return { error: "Plan ya da danışan bulunamadı." };
  if (!isAdminRole && source.created_by !== staff.id)
    return { error: "Yetkisiz işlem" };
  if (!isAdminRole && target.dietitian_id !== staff.id)
    return { error: "Bu danışan sana bağlı değil." };

  const result = await assignPlanCopy(admin, {
    sourcePlanId: planId.data,
    clientId: clientId.data,
    createdBy: staff.id,
  });
  if ("error" in result) return result;

  revalidatePath(`/yonetim/danisanlar/${clientId.data}`);
  revalidatePath("/yonetim/planlar");
  redirect(`/yonetim/planlar/${result.planId}`);
}
