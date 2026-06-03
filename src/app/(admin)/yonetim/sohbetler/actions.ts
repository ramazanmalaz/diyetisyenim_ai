"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string } | { success: true };

const createGroupSchema = z.object({
  title: z.string().min(2, "Başlık en az 2 karakter olmalı.").max(120),
  aiEnabled: z.boolean().optional(),
});

export async function createGroup(values: unknown): Promise<ActionResult> {
  const profile = await requireStaff();
  const parsed = createGroupSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      type: "group",
      title: parsed.data.title,
      ai_enabled: parsed.data.aiEnabled ?? false,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Grup oluşturulamadı." };

  // Diyetisyeni gruba üye yap.
  await supabase
    .from("conversation_members")
    .insert({ conversation_id: data.id, user_id: profile.id });

  redirect(`/yonetim/sohbetler/${data.id}`);
}

export async function addMember(values: unknown): Promise<ActionResult> {
  await requireStaff();
  const schema = z.object({
    conversationId: z.string().uuid(),
    userId: z.string().uuid("Danışan seçin."),
  });
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("conversation_members").insert({
    conversation_id: parsed.data.conversationId,
    user_id: parsed.data.userId,
  });
  if (error) return { error: "Üye eklenemedi (zaten ekli olabilir)." };

  revalidatePath(`/yonetim/sohbetler/${parsed.data.conversationId}`);
  return { success: true };
}

export async function removeMember(formData: FormData): Promise<void> {
  await requireStaff();
  const conversationId = z
    .string()
    .uuid()
    .safeParse(formData.get("conversationId"));
  const userId = z.string().uuid().safeParse(formData.get("userId"));
  if (!conversationId.success || !userId.success) return;

  const supabase = await createClient();
  await supabase
    .from("conversation_members")
    .delete()
    .eq("conversation_id", conversationId.data)
    .eq("user_id", userId.data);

  revalidatePath(`/yonetim/sohbetler/${conversationId.data}`);
}
