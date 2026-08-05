import { sendPushToUser } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

/** Bildirim gövdesinde uzun mesajları kısalt. */
function preview(text: string, max = 120): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/**
 * Yeni mesajı, gönderen dışındaki tüm konuşma üyelerine push bildirimi olarak
 * iletir. AI konuşmalarında bildirim gönderilmez (kullanıcı zaten ekranda).
 *
 * Push hatası mesaj gönderimini bozmamalı — tüm hatalar burada yutulur, loglanır.
 */
export async function notifyNewMessage(
  conversationId: string,
  senderId: string,
  content: string,
): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: conversation } = await admin
      .from("conversations")
      .select("type, title, ai_enabled")
      .eq("id", conversationId)
      .single();

    if (!conversation || conversation.ai_enabled) return;

    const [{ data: members }, { data: sender }] = await Promise.all([
      admin
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conversationId),
      admin.from("profiles").select("full_name").eq("id", senderId).single(),
    ]);

    const recipients = (members ?? [])
      .map((m) => m.user_id)
      .filter((uid) => uid !== senderId);
    if (recipients.length === 0) return;

    const senderName = sender?.full_name ?? "Yeni mesaj";
    const isGroup = conversation.type === "group";
    const body = preview(content);

    await Promise.all(
      recipients.map((uid) =>
        sendPushToUser(uid, {
          title: isGroup ? (conversation.title ?? "Grup sohbeti") : senderName,
          body: isGroup ? `${senderName}: ${body}` : body,
          tag: `chat-${conversationId}`,
          url: `/sohbet/${conversationId}`,
        }),
      ),
    );
  } catch (err) {
    console.error(
      "[notifyNewMessage]",
      err instanceof Error ? err.message : err,
    );
  }
}
