import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Kullanıcının kişisel AI asistan konuşmasını (type='direct', ai_enabled) bulur;
 * yoksa oluşturur ve id'sini döndürür. Konuşma/üyelik yazımı RLS'de personele
 * kısıtlı olduğundan service-role kullanılır.
 *
 * Ephemeral asistan (`/asistan`, `/api/ai`) ile kalıcı sohbet (`/sohbet`) aynı
 * konuşmaya yazar; böylece tüm AI etkileşimleri tek yerde denetlenebilir (§5).
 * Hata durumunda null döner — kalıcılık best-effort'tur, akışı bozmaz.
 */
export async function getAssistantConversationId(
  admin: AdminClient,
  userId: string,
): Promise<string | null> {
  const { data: memberships } = await admin
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);

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
    if (existing?.id) return existing.id;
  }

  const { data: created } = await admin
    .from("conversations")
    .insert({
      type: "direct",
      title: "Beslenme Asistanı",
      ai_enabled: true,
      created_by: userId,
    })
    .select("id")
    .single();
  if (!created) return null;

  await admin.from("conversation_members").insert({
    conversation_id: created.id,
    user_id: userId,
  });
  return created.id;
}

/**
 * AI asistan etkileşimini `messages` tablosuna kaydeder (denetlenebilirlik, §5).
 * Best-effort: hata sessizce yutulur, çağıranın akışını bozmaz.
 */
export async function logAssistantMessage(
  admin: AdminClient,
  conversationId: string,
  message: {
    type: "user" | "ai";
    content: string;
    senderId: string | null;
    imagePath?: string | null;
  },
): Promise<void> {
  try {
    await admin.from("messages").insert({
      conversation_id: conversationId,
      sender_id: message.senderId,
      type: message.type,
      content: message.content,
      image_path: message.imagePath ?? null,
    });
  } catch {
    // Kalıcılık başarısız olsa bile kullanıcı yanıtı etkilenmemeli.
  }
}
