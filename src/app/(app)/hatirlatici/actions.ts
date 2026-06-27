"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string } | { ok: true };

const COLORS = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "indigo",
  "purple",
  "brown",
  "gray",
  "cyan",
  "pink",
] as const;

const ICONS = [
  "list",
  "calendar",
  "clock",
  "flag",
  "mail",
  "location",
  "briefcase",
  "book",
  "gift",
  "cart",
  "music",
  "camera",
] as const;

// --- Listeler ---

const listSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Liste adı gir.").max(60),
  color: z.enum(COLORS).optional().default("blue"),
  icon: z.enum(ICONS).optional().default("list"),
});

export async function createList(values: unknown): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };
  const parsed = listSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz liste." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("reminder_lists").insert({
    ...(parsed.data.id ? { id: parsed.data.id } : {}),
    client_id: user.id,
    name: parsed.data.name,
    color: parsed.data.color,
    icon: parsed.data.icon,
    sort_order: Date.now() % 100000,
  });
  if (error) return { error: "Liste oluşturulamadı." };
  revalidatePath("/hatirlatici");
  return { ok: true };
}

export async function deleteList(id: unknown): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { error: "Geçersiz liste." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("reminder_lists")
    .delete()
    .eq("id", parsed.data)
    .eq("client_id", user.id);
  if (error) return { error: "Liste silinemedi." };
  revalidatePath("/hatirlatici");
  return { ok: true };
}

// --- Hatırlatıcılar ---

const reminderSchema = z.object({
  id: z.string().uuid().optional(),
  listId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1, "Başlık gir.").max(200),
  notes: z.string().trim().max(2000).optional().default(""),
  url: z.string().trim().max(500).optional().default(""),
  dueAt: z.string().datetime().nullable().optional(),
  hasTime: z.boolean().optional().default(false),
  flagged: z.boolean().optional().default(false),
  priority: z.coerce.number().int().min(0).max(3).optional().default(0),
});

export async function createReminder(values: unknown): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };
  const parsed = reminderSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz hatırlatıcı." };
  }
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("reminders").insert({
    ...(v.id ? { id: v.id } : {}),
    client_id: user.id,
    list_id: v.listId ?? null,
    title: v.title,
    notes: v.notes || null,
    url: v.url || null,
    due_at: v.dueAt ?? null,
    has_time: v.hasTime,
    flagged: v.flagged,
    priority: v.priority,
    sort_order: Date.now() % 100000,
  });
  if (error) return { error: "Hatırlatıcı eklenemedi." };
  revalidatePath("/hatirlatici");
  return { ok: true };
}

export async function toggleReminder(values: unknown): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };
  const parsed = z
    .object({ id: z.string().uuid(), completed: z.boolean() })
    .safeParse(values);
  if (!parsed.success) return { error: "Geçersiz veri." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("reminders")
    .update({
      completed: parsed.data.completed,
      completed_at: parsed.data.completed ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.id)
    .eq("client_id", user.id);
  if (error) return { error: "Güncellenemedi." };
  revalidatePath("/hatirlatici");
  return { ok: true };
}

export async function toggleFlag(values: unknown): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };
  const parsed = z
    .object({ id: z.string().uuid(), flagged: z.boolean() })
    .safeParse(values);
  if (!parsed.success) return { error: "Geçersiz veri." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("reminders")
    .update({ flagged: parsed.data.flagged })
    .eq("id", parsed.data.id)
    .eq("client_id", user.id);
  if (error) return { error: "Güncellenemedi." };
  revalidatePath("/hatirlatici");
  return { ok: true };
}

export async function deleteReminder(id: unknown): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { error: "Geçersiz veri." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("reminders")
    .delete()
    .eq("id", parsed.data)
    .eq("client_id", user.id);
  if (error) return { error: "Silinemedi." };
  revalidatePath("/hatirlatici");
  return { ok: true };
}
