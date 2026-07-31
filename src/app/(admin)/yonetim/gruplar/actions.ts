"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import {
  ensureGroupConversation,
  renameGroupConversation,
  syncGroupConversationMembers,
} from "@/lib/chat/client-groups";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { error: string } | { ok: true };

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Grubun bu personele ait olduğunu doğrular. Admin her gruba erişebilir.
 * Sunucu tarafı service-role kullandığı için RLS devrede değil → sahiplik
 * kontrolü burada elle yapılmak zorunda.
 */
async function assertGroupOwner(
  admin: AdminClient,
  groupId: string,
  staffId: string,
  isAdmin: boolean,
): Promise<{ conversation_id: string | null } | null> {
  const { data: group } = await admin
    .from("client_groups")
    .select("dietitian_id, conversation_id")
    .eq("id", groupId)
    .single();

  if (!group) return null;
  if (!isAdmin && group.dietitian_id !== staffId) return null;
  return { conversation_id: group.conversation_id };
}

/** Danışanın bu diyetisyene bağlı olduğunu doğrular. */
async function isMyClient(
  admin: AdminClient,
  clientId: string,
  staffId: string,
  isAdmin: boolean,
): Promise<boolean> {
  const { data } = await admin
    .from("profiles")
    .select("dietitian_id")
    .eq("id", clientId)
    .single();
  if (!data) return false;
  return isAdmin || data.dietitian_id === staffId;
}

// ─── Grup oluştur ─────────────────────────────────────────────────────────────
const createSchema = z.object({
  name: z.string().min(2, "En az 2 karakter").max(60),
  note: z.string().max(200).optional(),
});

export async function createGroup(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const staff = await requireStaff();
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz giriş" };

  const admin = createAdminClient();
  const { data: group, error } = await admin
    .from("client_groups")
    .insert({
      dietitian_id: staff.id,
      name: parsed.data.name,
      note: parsed.data.note ?? null,
    })
    .select("id")
    .single();
  if (error || !group) return { error: "Grup oluşturulamadı." };

  // Sohbeti hemen aç — danışan tarafında "henüz sohbet yok" durumu oluşmasın.
  await ensureGroupConversation(admin, group.id);

  revalidatePath("/yonetim/gruplar");
  return { ok: true };
}

// ─── Grup adını değiştir ─────────────────────────────────────────────────────
export async function renameGroup(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const staff = await requireStaff();
  const groupId = z.string().uuid().safeParse(formData.get("group_id"));
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    note: formData.get("note") || undefined,
  });
  if (!groupId.success || !parsed.success)
    return { error: parsed.success ? "Geçersiz grup" : "Geçersiz ad" };

  const admin = createAdminClient();
  const group = await assertGroupOwner(
    admin,
    groupId.data,
    staff.id,
    staff.role === "admin",
  );
  if (!group) return { error: "Yetkisiz işlem" };

  await admin
    .from("client_groups")
    .update({ name: parsed.data.name, note: parsed.data.note ?? null })
    .eq("id", groupId.data);

  await renameGroupConversation(admin, group.conversation_id, parsed.data.name);

  revalidatePath(`/yonetim/gruplar/${groupId.data}`);
  revalidatePath("/yonetim/gruplar");
  return { ok: true };
}

// ─── Grubu sil ───────────────────────────────────────────────────────────────
export async function deleteGroup(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const groupId = z.string().uuid().parse(formData.get("group_id") as string);

  const admin = createAdminClient();
  const group = await assertGroupOwner(
    admin,
    groupId,
    staff.id,
    staff.role === "admin",
  );
  if (!group) throw new Error("Yetkisiz işlem");

  // Sohbeti de sil — grup olmadan erişilemez hâle gelirdi.
  if (group.conversation_id) {
    await admin.from("conversations").delete().eq("id", group.conversation_id);
  }
  await admin.from("client_groups").delete().eq("id", groupId);

  revalidatePath("/yonetim/gruplar");
  redirect("/yonetim/gruplar");
}

// ─── Üye ekle / çıkar ────────────────────────────────────────────────────────
export async function addGroupMember(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const staff = await requireStaff();
  const groupId = z.string().uuid().safeParse(formData.get("group_id"));
  const clientId = z.string().uuid().safeParse(formData.get("client_id"));
  if (!groupId.success || !clientId.success)
    return { error: "Geçersiz giriş" };

  const admin = createAdminClient();
  const isAdminRole = staff.role === "admin";
  const group = await assertGroupOwner(
    admin,
    groupId.data,
    staff.id,
    isAdminRole,
  );
  if (!group) return { error: "Yetkisiz işlem" };

  if (!(await isMyClient(admin, clientId.data, staff.id, isAdminRole)))
    return { error: "Bu danışan sana bağlı değil." };

  const { error } = await admin
    .from("client_group_members")
    .upsert(
      { group_id: groupId.data, client_id: clientId.data },
      { onConflict: "group_id,client_id" },
    );
  if (error) return { error: "Üye eklenemedi." };

  await syncGroupConversationMembers(admin, groupId.data);

  revalidatePath(`/yonetim/gruplar/${groupId.data}`);
  return { ok: true };
}

export async function removeGroupMember(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const groupId = z.string().uuid().parse(formData.get("group_id") as string);
  const clientId = z.string().uuid().parse(formData.get("client_id") as string);

  const admin = createAdminClient();
  const group = await assertGroupOwner(
    admin,
    groupId,
    staff.id,
    staff.role === "admin",
  );
  if (!group) throw new Error("Yetkisiz işlem");

  await admin
    .from("client_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("client_id", clientId);

  await syncGroupConversationMembers(admin, groupId);

  revalidatePath(`/yonetim/gruplar/${groupId}`);
}

// ─── Grup sohbetini aç ───────────────────────────────────────────────────────
export async function openGroupChat(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const groupId = z.string().uuid().parse(formData.get("group_id") as string);

  const admin = createAdminClient();
  const group = await assertGroupOwner(
    admin,
    groupId,
    staff.id,
    staff.role === "admin",
  );
  if (!group) throw new Error("Yetkisiz işlem");

  const convId = await ensureGroupConversation(admin, groupId);
  redirect(convId ? `/sohbet/${convId}` : "/yonetim/gruplar");
}
