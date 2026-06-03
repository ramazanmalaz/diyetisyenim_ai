"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  progressSchema,
} from "@/lib/validations/progress";

export type ActionResult = { error: string } | { success: true };

const BUCKET = "progress-photos";

export async function addProgress(formData: FormData): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const parsed = progressSchema.safeParse({
    entryDate: formData.get("entryDate"),
    weightKg: formData.get("weightKg") ?? "",
    waterMl: formData.get("waterMl") ?? "",
    waistCm: formData.get("waistCm") ?? "",
    hipCm: formData.get("hipCm") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  }

  const supabase = await createClient();

  // Opsiyonel fotoğraf yükleme.
  let photoPath: string | null = null;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) {
      return { error: "Yalnızca JPEG, PNG veya WEBP yükleyebilirsin." };
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return { error: "Fotoğraf en fazla 5 MB olabilir." };
    }
    const ext = photo.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, photo, { contentType: photo.type });
    if (uploadError) {
      return { error: "Fotoğraf yüklenemedi." };
    }
    photoPath = path;
  }

  const { error } = await supabase.from("progress_entries").insert({
    client_id: user.id,
    entry_date: parsed.data.entryDate,
    weight_kg: parsed.data.weightKg,
    water_ml: parsed.data.waterMl,
    waist_cm: parsed.data.waistCm,
    hip_cm: parsed.data.hipCm,
    note: parsed.data.note,
    photo_path: photoPath,
  });

  if (error) return { error: "Kayıt eklenemedi." };

  revalidatePath("/ilerleme");
  return { success: true };
}

export async function deleteProgress(formData: FormData): Promise<void> {
  const user = await getUser();
  if (!user) return;

  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const supabase = await createClient();

  // Fotoğraf varsa Storage'dan da sil.
  const { data: entry } = await supabase
    .from("progress_entries")
    .select("photo_path")
    .eq("id", id.data)
    .single();
  if (entry?.photo_path) {
    await supabase.storage.from(BUCKET).remove([entry.photo_path]);
  }

  await supabase.from("progress_entries").delete().eq("id", id.data);
  revalidatePath("/ilerleme");
}
