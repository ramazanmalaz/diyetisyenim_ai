"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string } | { success: true; id?: string };

const list = (v: FormDataEntryValue | null): string[] =>
  String(v ?? "")
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

const num = (v: FormDataEntryValue | null): number | null => {
  const n = Number(v);
  return v == null || v === "" || Number.isNaN(n) ? null : n;
};

const baseSchema = z.object({
  full_name: z.string().min(2, "Ad soyad gerekli.").max(120),
  title: z.string().max(80).optional(),
  bio: z.string().max(2000).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  photo_url: z.string().url("Geçerli bir foto URL'si girin.").or(z.literal("")),
  years_experience: z.number().int().min(0).max(70).nullable(),
  contact_phone: z.string().max(40).optional().nullable(),
  contact_email: z.string().max(120).optional().nullable(),
});

function parseForm(formData: FormData) {
  return baseSchema.safeParse({
    full_name: String(formData.get("full_name") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim() || undefined,
    bio: String(formData.get("bio") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    photo_url: String(formData.get("photo_url") ?? "").trim(),
    years_experience: num(formData.get("years_experience")),
    contact_phone: String(formData.get("contact_phone") ?? "").trim() || null,
    contact_email: String(formData.get("contact_email") ?? "").trim() || null,
  });
}

export async function createDietitian(formData: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dietitians")
    .insert({
      full_name: parsed.data.full_name,
      title: parsed.data.title ?? "Diyetisyen",
      bio: parsed.data.bio,
      specialties: list(formData.get("specialties")),
      city: parsed.data.city,
      photo_url: parsed.data.photo_url || null,
      years_experience: parsed.data.years_experience,
      contact_phone: parsed.data.contact_phone,
      contact_email: parsed.data.contact_email,
      is_active: formData.get("is_active") === "on",
      featured: formData.get("featured") === "on",
      sort_order: num(formData.get("sort_order")) ?? 0,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Diyetisyen eklenemedi." };
  revalidatePath("/yonetim/diyetisyenler");
  return { success: true, id: data.id };
}

export async function updateDietitian(formData: FormData): Promise<ActionResult> {
  await requireStaff();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Geçersiz kayıt." };
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("dietitians")
    .update({
      full_name: parsed.data.full_name,
      title: parsed.data.title ?? "Diyetisyen",
      bio: parsed.data.bio,
      specialties: list(formData.get("specialties")),
      city: parsed.data.city,
      photo_url: parsed.data.photo_url || null,
      years_experience: parsed.data.years_experience,
      contact_phone: parsed.data.contact_phone,
      contact_email: parsed.data.contact_email,
      is_active: formData.get("is_active") === "on",
      featured: formData.get("featured") === "on",
      sort_order: num(formData.get("sort_order")) ?? 0,
    })
    .eq("id", id.data);
  if (error) return { error: "Güncellenemedi." };
  revalidatePath("/yonetim/diyetisyenler");
  revalidatePath(`/yonetim/diyetisyenler/${id.data}`);
  return { success: true };
}

export async function deleteDietitian(formData: FormData): Promise<void> {
  await requireStaff();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("dietitians").delete().eq("id", id.data);
  revalidatePath("/yonetim/diyetisyenler");
}

const SLOT_HOURS = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Geçersiz tarih/saat.");

export async function addSlot(formData: FormData): Promise<void> {
  await requireStaff();
  const dietitianId = z.string().uuid().safeParse(formData.get("dietitianId"));
  const startAt = SLOT_HOURS.safeParse(formData.get("startAt"));
  if (!dietitianId.success || !startAt.success) return;
  const duration = num(formData.get("durationMin")) ?? 40;

  const supabase = await createClient();
  await supabase.from("dietitian_slots").insert({
    dietitian_id: dietitianId.data,
    start_at: new Date(startAt.data).toISOString(),
    duration_min: duration,
  });
  revalidatePath(`/yonetim/diyetisyenler/${dietitianId.data}`);
}

export async function deleteSlot(formData: FormData): Promise<void> {
  await requireStaff();
  const id = z.string().uuid().safeParse(formData.get("id"));
  const dietitianId = z.string().uuid().safeParse(formData.get("dietitianId"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("dietitian_slots").delete().eq("id", id.data);
  if (dietitianId.success) {
    revalidatePath(`/yonetim/diyetisyenler/${dietitianId.data}`);
  }
}
