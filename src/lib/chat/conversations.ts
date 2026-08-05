import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Diyetisyen-danışan birebir konuşmasını bulur; yoksa oluşturur. */
export async function resolveDirectConvId(
  admin: AdminClient,
  dietitianId: string,
  clientId: string,
  dietitianName: string | null,
): Promise<string | null> {
  const { data: dietConvs } = await admin
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", dietitianId);

  const convIds = (dietConvs ?? []).map((r) => r.conversation_id);

  if (convIds.length > 0) {
    // Danışan diyetisyenle birden çok konuşmayı paylaşabilir (grup + birebir).
    // Hepsini al, birebir olanı seç — tek satır varsayarsak grup üyeliği
    // sorguyu bozar ve her açılışta yeni bir birebir sohbet açılırdı.
    const { data: shared } = await admin
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", clientId)
      .in("conversation_id", convIds);

    const sharedIds = (shared ?? []).map((r) => r.conversation_id);

    if (sharedIds.length > 0) {
      const { data: conv } = await admin
        .from("conversations")
        .select("id")
        .in("id", sharedIds)
        .eq("type", "direct")
        .eq("ai_enabled", false)
        // Mükerrer oluştuysa geçmişi olan en eskisinde kal.
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (conv) return conv.id;
    }
  }

  const { data: client } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", clientId)
    .single();

  const { data: conv } = await admin
    .from("conversations")
    .insert({
      type: "direct",
      title: `${client?.full_name ?? "Danışan"} ↔ ${dietitianName ?? "Diyetisyen"}`,
      ai_enabled: false,
      created_by: dietitianId,
    })
    .select("id")
    .single();

  if (!conv) return null;

  await admin.from("conversation_members").insert([
    { conversation_id: conv.id, user_id: dietitianId },
    { conversation_id: conv.id, user_id: clientId },
  ]);

  return conv.id;
}
