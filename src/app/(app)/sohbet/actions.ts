"use server";

import { redirect } from "next/navigation";

import { generateDietAnswer, type ChatMessage } from "@/lib/ai/respond";
import { getActiveDietitianRules } from "@/lib/ai/rules";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { messageSchema } from "@/lib/validations/chat";

export type ActionResult = { error: string } | { success: true };

/**
 * Kullanıcının kişisel AI asistan konuşmasını bulur; yoksa oluşturur.
 * Konuşma/üyelik eklemek RLS'de personele kısıtlı olduğundan service-role kullanır.
 */
export async function openAssistant(): Promise<void> {
  const user = await getUser();
  if (!user) redirect("/giris");

  const admin = createAdminClient();

  // Kullanıcının üye olduğu konuşmalar arasından AI asistan konuşmasını bul.
  const { data: memberships } = await admin
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", user.id);

  const memberIds = (memberships ?? []).map((m) => m.conversation_id);
  if (memberIds.length > 0) {
    const { data: existing } = await admin
      .from("conversations")
      .select("id")
      .in("id", memberIds)
      .eq("ai_enabled", true)
      .eq("type", "direct")
      .limit(1)
      .maybeSingle();
    if (existing?.id) {
      redirect(`/sohbet/${existing.id}`);
    }
  }

  const { data: created, error } = await admin
    .from("conversations")
    .insert({
      type: "direct",
      title: "Beslenme Asistanı",
      ai_enabled: true,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    redirect("/sohbet");
  }

  await admin.from("conversation_members").insert({
    conversation_id: created.id,
    user_id: user.id,
  });

  redirect(`/sohbet/${created.id}`);
}

export async function sendMessage(values: unknown): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const parsed = messageSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz mesaj." };
  }

  const supabase = await createClient();

  // Kullanıcı mesajını ekle (RLS: üyelik + sender_id = self + type user).
  const { error: insertError } = await supabase.from("messages").insert({
    conversation_id: parsed.data.conversationId,
    sender_id: user.id,
    type: "user",
    content: parsed.data.content,
  });
  if (insertError) {
    return { error: "Mesaj gönderilemedi." };
  }

  // Konuşmada AI etkinse otomatik yanıt üret.
  const { data: conversation } = await supabase
    .from("conversations")
    .select("ai_enabled")
    .eq("id", parsed.data.conversationId)
    .single();

  if (conversation?.ai_enabled) {
    await respondWithAi(parsed.data.conversationId);
  }

  return { success: true };
}

/**
 * Konuşmadaki son mesajları transkripte çevirip AI yanıtı üretir ve kaydeder.
 * AI mesajı (type='ai', sender_id=null) service-role ile eklenir.
 */
async function respondWithAi(conversationId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: recent } = await admin
    .from("messages")
    .select("type, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(15);

  if (!recent || recent.length === 0) return;

  const transcript = [...recent]
    .reverse()
    .map((m) => `${m.type === "ai" ? "Asistan" : "Danışan"}: ${m.content}`)
    .join("\n");

  const prompt: ChatMessage[] = [
    {
      role: "user",
      content: `Aşağıdaki konuşmada son mesaja, bir beslenme asistanı olarak yanıt ver.\n\n${transcript}`,
    },
  ];

  const rules = await getActiveDietitianRules();

  let answer: string;
  try {
    answer = await generateDietAnswer(prompt, rules);
  } catch {
    answer = "Şu anda yanıt veremiyorum, lütfen biraz sonra tekrar dene.";
  }
  if (!answer) return;

  await admin.from("messages").insert({
    conversation_id: conversationId,
    sender_id: null,
    type: "ai",
    content: answer,
  });
}
