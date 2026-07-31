import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Danışan grubunun toplu sohbetini bulur; yoksa oluşturur ve gruba bağlar.
 * Sohbet lazy açılır — grup oluşturulurken değil, ilk gerekli olduğunda.
 */
export async function ensureGroupConversation(
  admin: AdminClient,
  groupId: string,
): Promise<string | null> {
  const { data: group } = await admin
    .from("client_groups")
    .select("id, name, dietitian_id, conversation_id")
    .eq("id", groupId)
    .single();

  if (!group) return null;
  if (group.conversation_id) return group.conversation_id;

  const { data: conv } = await admin
    .from("conversations")
    .insert({
      type: "group",
      title: group.name,
      ai_enabled: false,
      created_by: group.dietitian_id,
    })
    .select("id")
    .single();

  if (!conv) return null;

  await admin
    .from("client_groups")
    .update({ conversation_id: conv.id })
    .eq("id", groupId);

  await syncGroupConversationMembers(admin, groupId, conv.id);

  return conv.id;
}

/**
 * Grup üyeliğini sohbet üyeliğine yansıtır (diyetisyen + tüm danışanlar).
 * Gruptan çıkarılan danışan sohbetten de çıkarılır.
 */
export async function syncGroupConversationMembers(
  admin: AdminClient,
  groupId: string,
  conversationId?: string,
): Promise<void> {
  const { data: group } = await admin
    .from("client_groups")
    .select("dietitian_id, conversation_id")
    .eq("id", groupId)
    .single();

  const convId = conversationId ?? group?.conversation_id;
  if (!group || !convId) return;

  const { data: members } = await admin
    .from("client_group_members")
    .select("client_id")
    .eq("group_id", groupId);

  const shouldBeMembers = new Set<string>([
    group.dietitian_id,
    ...(members ?? []).map((m) => m.client_id),
  ]);

  const { data: current } = await admin
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", convId);

  const currentIds = new Set((current ?? []).map((m) => m.user_id));

  const toAdd = [...shouldBeMembers].filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !shouldBeMembers.has(id));

  if (toAdd.length > 0) {
    await admin.from("conversation_members").upsert(
      toAdd.map((user_id) => ({ conversation_id: convId, user_id })),
      { onConflict: "conversation_id,user_id" },
    );
  }

  if (toRemove.length > 0) {
    await admin
      .from("conversation_members")
      .delete()
      .eq("conversation_id", convId)
      .in("user_id", toRemove);
  }
}

/** Grup adı değişince sohbet başlığını da güncelle. */
export async function renameGroupConversation(
  admin: AdminClient,
  conversationId: string | null,
  name: string,
): Promise<void> {
  if (!conversationId) return;
  await admin
    .from("conversations")
    .update({ title: name })
    .eq("id", conversationId);
}
