"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ImageMediaType } from "@/lib/ai/respond";
import { requireStaff, type Profile } from "@/lib/auth";
import { extractProgram } from "@/lib/group-assistant/program";
import { postAssistantMessage } from "@/lib/group-assistant/respond";
import { DAY_NAMES, istanbulNow } from "@/lib/group-assistant/schedule";
import { sendPushToUser } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALLOWED_PLAN_FILE_TYPES } from "@/lib/validations/plan-upload";

export type AssistantActionResult = { error: string } | { ok: true; message?: string };

type AdminClient = ReturnType<typeof createAdminClient>;

const CHAT_BUCKET = "progress-photos";
// Vercel fonksiyon gövdesi 4,5 MB; diyet listesi PDF'leri tipik olarak <1 MB.
const MAX_PROGRAM_BYTES = 4 * 1024 * 1024;

/** Service-role kullanıldığı için grup sahipliği burada elle doğrulanır. */
async function ownedGroup(admin: AdminClient, groupId: string, staff: Profile) {
  const { data } = await admin
    .from("client_groups")
    .select("id, name, dietitian_id, conversation_id, assistant_enabled, program_started_on, weigh_in_dow")
    .eq("id", groupId)
    .single();
  if (!data) return null;
  if (staff.role !== "admin" && data.dietitian_id !== staff.id) return null;
  return data;
}

function revalidateGroup(groupId: string) {
  revalidatePath(`/yonetim/gruplar/${groupId}`);
}

// ─── Asistan ayarları ────────────────────────────────────────────────────────
const settingsSchema = z.object({
  group_id: z.string().uuid(),
  enabled: z.boolean(),
  weigh_in_dow: z.coerce.number().int().min(0).max(6),
  program_started_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Geçersiz tarih")
    .optional(),
});

function introMessage(weighInDow: number): string {
  return `Herkese merhabalarr 🌸 Ben bu grubun **Diyet Asistanı**yım — yapay zekâyla çalışan bir asistanım, diyetisyenimizle birlikte yanınızdayım 😍

Nasıl ilerleyeceğiz:
• Her sabah öğünlerinizi, öğleden sonra su raporunuzu, akşam tabaklarınızı bekliyorum 💐
• "Bunu yiyebilir miyim?" diye istediğiniz an sorun; tabağınızın fotoğrafını atın, yorumlayayım.
• Tartı günümüz **${DAY_NAMES[weighInDow]}**: aç karnına, tuvaletten sonra, hafif kıyafetle tartılıp yazıyoruz.
• Çiğ sebze, bitki çayı, şekersiz çay ve sade kahve her zaman serbest.
• Pazar ve akşam 20:00'den sonra yazışmıyoruz (acil hariç).

Zorlandığınız, hata yaptığınız günler olacak ama pes etmek yok — kaldığımız yerden devam 💪🏻`;
}

export async function updateAssistantSettings(
  _prev: AssistantActionResult | null,
  formData: FormData,
): Promise<AssistantActionResult> {
  const staff = await requireStaff();
  const parsed = settingsSchema.safeParse({
    group_id: formData.get("group_id"),
    enabled: formData.get("enabled") === "on",
    weigh_in_dow: formData.get("weigh_in_dow"),
    program_started_on: formData.get("program_started_on") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz giriş" };

  const admin = createAdminClient();
  const group = await ownedGroup(admin, parsed.data.group_id, staff);
  if (!group) return { error: "Yetkisiz işlem" };

  const turningOn = parsed.data.enabled && !group.assistant_enabled;
  const startedOn =
    parsed.data.program_started_on ??
    group.program_started_on ??
    (parsed.data.enabled ? istanbulNow().date : null);

  const { error } = await admin
    .from("client_groups")
    .update({
      assistant_enabled: parsed.data.enabled,
      weigh_in_dow: parsed.data.weigh_in_dow,
      program_started_on: startedOn,
    })
    .eq("id", group.id);
  if (error) return { error: "Ayarlar kaydedilemedi." };

  // İlk açılışta asistan kendini gruba tanıtır.
  if (turningOn && group.conversation_id) {
    await postAssistantMessage(admin, group.conversation_id, introMessage(parsed.data.weigh_in_dow));
  }

  revalidateGroup(group.id);
  return { ok: true, message: turningOn ? "Asistan gruba katıldı ve kendini tanıttı." : "Kaydedildi." };
}

// ─── Liste yükle → AI okur → taslak ─────────────────────────────────────────
export async function uploadProgram(
  _prev: AssistantActionResult | null,
  formData: FormData,
): Promise<AssistantActionResult> {
  const staff = await requireStaff();
  const groupId = z.string().uuid().safeParse(formData.get("group_id"));
  const file = formData.get("file");
  if (!groupId.success) return { error: "Geçersiz grup" };
  if (!(file instanceof File) || file.size === 0) return { error: "Dosya seçilmedi." };
  if (!ALLOWED_PLAN_FILE_TYPES.includes(file.type))
    return { error: "Yalnızca PDF, JPEG, PNG veya WEBP yükleyebilirsin." };
  if (file.size > MAX_PROGRAM_BYTES) return { error: "Dosya en fazla 4 MB olabilir." };

  const admin = createAdminClient();
  const group = await ownedGroup(admin, groupId.data, staff);
  if (!group) return { error: "Yetkisiz işlem" };

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "application/pdf" ? "pdf" : (file.name.split(".").pop() ?? "jpg");
  const path = `${staff.id}/groups/${group.id}/${Date.now()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from(CHAT_BUCKET)
    .upload(path, bytes, { contentType: file.type });
  if (uploadError) return { error: "Dosya yüklenemedi." };

  let extracted;
  try {
    extracted = await extractProgram(
      file.type === "application/pdf"
        ? { kind: "pdf", base64: bytes.toString("base64") }
        : { kind: "image", base64: bytes.toString("base64"), mediaType: file.type as ImageMediaType },
    );
  } catch (err) {
    console.error("[uploadProgram]", err instanceof Error ? err.message : err);
    return { error: "Liste okunamadı. Daha net bir dosya dener misin?" };
  }

  const { error } = await admin.from("group_programs").insert({
    group_id: group.id,
    title: extracted.title,
    content: extracted.content,
    file_path: path,
    status: "draft",
    created_by: staff.id,
  });
  if (error) return { error: "Taslak kaydedilemedi." };

  revalidateGroup(group.id);
  return { ok: true, message: "Liste okundu. Metni kontrol edip yayınla." };
}

// ─── Taslağı düzenle / yayınla / sil ─────────────────────────────────────────
const programSchema = z.object({
  group_id: z.string().uuid(),
  program_id: z.string().uuid(),
  title: z.string().trim().min(2, "Başlık en az 2 karakter").max(120),
  content: z.string().trim().min(10, "Liste metni çok kısa").max(20_000),
  intent: z.enum(["save", "publish"]),
});

export async function saveProgram(
  _prev: AssistantActionResult | null,
  formData: FormData,
): Promise<AssistantActionResult> {
  const staff = await requireStaff();
  const parsed = programSchema.safeParse({
    group_id: formData.get("group_id"),
    program_id: formData.get("program_id"),
    title: formData.get("title"),
    content: formData.get("content"),
    intent: formData.get("intent"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz giriş" };

  const admin = createAdminClient();
  const group = await ownedGroup(admin, parsed.data.group_id, staff);
  if (!group) return { error: "Yetkisiz işlem" };

  const { data: program } = await admin
    .from("group_programs")
    .select("id, status")
    .eq("id", parsed.data.program_id)
    .eq("group_id", group.id)
    .single();
  if (!program) return { error: "Liste bulunamadı." };

  const { title, content } = parsed.data;

  if (parsed.data.intent === "save") {
    await admin.from("group_programs").update({ title, content }).eq("id", program.id);
    revalidateGroup(group.id);
    return { ok: true, message: "Kaydedildi." };
  }

  // Yayınla: önceki aktif listeyi arşivle (grupta tek aktif liste).
  await admin
    .from("group_programs")
    .update({ status: "archived" })
    .eq("group_id", group.id)
    .eq("status", "active");
  const { error } = await admin
    .from("group_programs")
    .update({ title, content, status: "active", published_at: new Date().toISOString() })
    .eq("id", program.id);
  if (error) return { error: "Liste yayınlanamadı." };

  if (!group.program_started_on) {
    await admin.from("client_groups").update({ program_started_on: istanbulNow().date }).eq("id", group.id);
  }

  if (group.conversation_id) {
    await postAssistantMessage(
      admin,
      group.conversation_id,
      `Yeni listemiz geldi 😍💐 **${title}**\n\nListe sohbetin en üstünde sabitli. Takıldığınız her yeri bana sorun 🌸\n\n${content}`,
    );
    const { data: members } = await admin
      .from("client_group_members")
      .select("client_id")
      .eq("group_id", group.id);
    await Promise.all(
      (members ?? []).map((m) =>
        sendPushToUser(m.client_id, {
          title: group.name,
          body: `Yeni listemiz geldi: ${title} 😍`,
          tag: `chat-${group.conversation_id}`,
          url: `/sohbet/${group.conversation_id}`,
        }),
      ),
    );
  }

  revalidateGroup(group.id);
  return { ok: true, message: "Liste yayınlandı ve gruba duyuruldu." };
}

export async function deleteProgram(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const groupId = z.string().uuid().parse(formData.get("group_id"));
  const programId = z.string().uuid().parse(formData.get("program_id"));

  const admin = createAdminClient();
  const group = await ownedGroup(admin, groupId, staff);
  if (!group) throw new Error("Yetkisiz işlem");

  // Yayındaki liste silinmez — asistan cevaplarını ona dayandırıyor.
  await admin
    .from("group_programs")
    .delete()
    .eq("id", programId)
    .eq("group_id", group.id)
    .neq("status", "active");

  revalidateGroup(group.id);
}

// ─── Uyarıyı kapat ───────────────────────────────────────────────────────────
export async function resolveAlert(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const groupId = z.string().uuid().parse(formData.get("group_id"));
  const alertId = z.string().uuid().parse(formData.get("alert_id"));

  const admin = createAdminClient();
  const group = await ownedGroup(admin, groupId, staff);
  if (!group) throw new Error("Yetkisiz işlem");

  await admin
    .from("group_alerts")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", alertId)
    .eq("group_id", group.id);

  revalidateGroup(group.id);
}
