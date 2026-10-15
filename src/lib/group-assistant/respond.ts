import type AnthropicNS from "@anthropic-ai/sdk";
import { z } from "zod";

import { anthropic, DEFAULT_MODEL } from "@/lib/ai/client";
import {
  GROUP_PERSONA,
  GROUP_TURN_FLAGS,
  GROUP_TURN_INTENTS,
} from "@/lib/ai/group-persona";
import { SAFETY_GUARDRAILS } from "@/lib/ai/guardrails";
import type { ImageMediaType } from "@/lib/ai/respond";
import { sendPushToUser } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

import { DAY_NAMES, istanbulNow } from "./schedule";

type AdminClient = ReturnType<typeof createAdminClient>;

const CHAT_BUCKET = "progress-photos";

export type AssistantGroup = {
  id: string;
  name: string;
  dietitian_id: string;
  conversation_id: string;
  weigh_in_dow: number;
  program_started_on: string | null;
};

/** Konuşma, asistanı açık bir danışan grubuna bağlıysa grubu döndürür. */
export async function getAssistantGroup(
  admin: AdminClient,
  conversationId: string,
): Promise<AssistantGroup | null> {
  const { data } = await admin
    .from("client_groups")
    .select(
      "id, name, dietitian_id, conversation_id, weigh_in_dow, program_started_on, assistant_enabled",
    )
    .eq("conversation_id", conversationId)
    .maybeSingle();
  if (!data?.assistant_enabled || !data.conversation_id) return null;
  return { ...data, conversation_id: data.conversation_id };
}

export async function getActiveProgram(
  admin: AdminClient,
  groupId: string,
): Promise<{
  title: string;
  content: string;
  published_at: string | null;
} | null> {
  const { data } = await admin
    .from("group_programs")
    .select("title, content, published_at")
    .eq("group_id", groupId)
    .eq("status", "active")
    .maybeSingle();
  return data ?? null;
}

/** Etiketlemede kullanılan kısa ad: "Ayşe Yılmaz" → "Ayşe". */
export function firstName(fullName: string | null | undefined): string {
  const first = (fullName ?? "").trim().split(/\s+/)[0];
  return first || "Danışan";
}

/** Asistan mesajını gruba yazar (type='ai', sender_id=null). */
export async function postAssistantMessage(
  admin: AdminClient,
  conversationId: string,
  content: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: null,
      type: "ai",
      content,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[group-assistant] mesaj yazılamadı", error.message);
    return null;
  }
  return data.id;
}

/**
 * Asistanın grup mesajını danışanlara push olarak iletir. `postAssistantMessage`
 * yalnızca DB'ye yazar; danışan mesajlarındaki `notifyNewMessage` asistan
 * mesajları için çalışmaz (gönderen yok). Push hatası mesajı bozmamalı.
 */
export async function pushAssistantMessage(
  admin: AdminClient,
  group: Pick<AssistantGroup, "name" | "conversation_id">,
  content: string,
  recipientIds: string[],
): Promise<void> {
  const body = content.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  await Promise.all(
    [...new Set(recipientIds)].map((uid) =>
      sendPushToUser(uid, {
        title: group.name,
        body: `Diyet Asistanı: ${body.length > 110 ? `${body.slice(0, 109)}…` : body}`,
        tag: `chat-${group.conversation_id}`,
        url: `/sohbet/${group.conversation_id}`,
      }).catch((err: unknown) => {
        console.error(
          "[group-assistant] push gönderilemedi",
          err instanceof Error ? err.message : err,
        );
        return 0;
      }),
    ),
  );
}

/** Grup sahibine ve tüm adminlere push gönderir. */
export async function notifyStaff(
  admin: AdminClient,
  group: Pick<AssistantGroup, "dietitian_id" | "conversation_id">,
  payload: { title: string; body: string },
): Promise<void> {
  const { data: admins } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin");
  const ids = new Set([group.dietitian_id, ...(admins ?? []).map((a) => a.id)]);
  await Promise.all(
    [...ids].map((uid) =>
      sendPushToUser(uid, {
        ...payload,
        tag: `group-staff-${group.conversation_id}`,
        url: `/sohbet/${group.conversation_id}`,
      }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Model çıktısı
// ---------------------------------------------------------------------------

const turnSchema = z.object({
  intent: z.enum(GROUP_TURN_INTENTS),
  should_reply: z.boolean(),
  reply: z.string().max(2000).optional().default(""),
  water_liters: z.coerce.number().min(0).max(8).nullable().optional(),
  weight_kg: z.coerce.number().min(30).max(300).nullable().optional(),
  meal_shared: z.boolean().optional().default(false),
  flags: z.array(z.enum(GROUP_TURN_FLAGS)).optional().default([]),
  alert: z
    .object({
      severity: z.enum(["high", "medium"]),
      reason: z.string().min(1).max(500),
    })
    .nullable()
    .optional(),
});

export type GroupTurn = z.infer<typeof turnSchema>;

const TURN_TOOL: AnthropicNS.Tool = {
  name: "group_turn",
  description:
    "Gruptaki son danışan mesajını değerlendirir: veri çıkarır, gerekirse cevap ve uyarı üretir.",
  input_schema: {
    type: "object",
    properties: {
      intent: { type: "string", enum: [...GROUP_TURN_INTENTS] },
      should_reply: {
        type: "boolean",
        description:
          "Gruba cevap yazılmalı mı? (bkz. 'Ne zaman cevap verirsin')",
      },
      reply: {
        type: "string",
        description:
          "should_reply true ise gruba yazılacak Türkçe cevap, '@Ad' ile başlar. Değilse boş.",
      },
      water_liters: {
        type: ["number", "null"],
        description:
          "Danışan bugün içtiği TOPLAM suyu yazdıysa litre cinsinden (ör. '1,5 lt' → 1.5). Yoksa null.",
      },
      weight_kg: {
        type: ["number", "null"],
        description:
          "Danışan BUGÜNKÜ tartısını yazdıysa kg (başlangıç kilosu değil, güncel). Yoksa null.",
      },
      meal_shared: {
        type: "boolean",
        description:
          "Mesaj bir öğün/tabak paylaşımı mı (fotoğraf ya da 'tavuk ve salata yedim' gibi)?",
      },
      flags: {
        type: "array",
        items: { type: "string", enum: [...GROUP_TURN_FLAGS] },
        description: "Mesajda geçen durumlar.",
      },
      alert: {
        type: ["object", "null"],
        description: "UYARI İŞARETLERİ'nden biri varsa doldur, yoksa null.",
        properties: {
          severity: { type: "string", enum: ["high", "medium"] },
          reason: {
            type: "string",
            description: "Personel için kısa Türkçe özet",
          },
        },
        required: ["severity", "reason"],
      },
    },
    required: ["intent", "should_reply", "reply", "meal_shared", "flags"],
  },
};

function mediaTypeFromPath(path: string): ImageMediaType {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export function buildSystem(
  group: Pick<AssistantGroup, "name" | "weigh_in_dow" | "program_started_on">,
  program: { title: string; content: string } | null,
): string {
  const programBlock = program
    ? `# Grubun bu haftaki listesi: ${program.title}\n\n${program.content}`
    : "# Grubun henüz yayınlanmış bir listesi yok.\nListe sorularında genel kurallarla cevap ver ve listenin yakında paylaşılacağını söyle; öğün uydurma.";
  return `${GROUP_PERSONA}

# Grup bilgisi
- Grup adı: ${group.name}
- Haftalık tartı günü: ${DAY_NAMES[group.weigh_in_dow]}
- Program başlangıcı: ${group.program_started_on ?? "belirtilmedi"}

${programBlock}

${SAFETY_GUARDRAILS}`;
}

/** Tek mesaj için modelden yapılandırılmış karar alır. */
export async function decideTurn(
  system: string,
  content: AnthropicNS.ContentBlockParam[],
): Promise<GroupTurn> {
  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 800,
    // Persona + liste her mesajda aynı → önbellekten okunur.
    system: [
      { type: "text", text: system, cache_control: { type: "ephemeral" } },
    ],
    tools: [TURN_TOOL],
    tool_choice: { type: "tool", name: "group_turn" },
    messages: [{ role: "user", content }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use")
    throw new Error("group_turn çağrılmadı");
  return turnSchema.parse(toolUse.input);
}

// ---------------------------------------------------------------------------
// Ana akış
// ---------------------------------------------------------------------------

/**
 * Gruba danışandan gelen bir mesajı işler: modelden yapılandırılmış karar alır,
 * su/tartı/öğün kaydını günceller, gerekiyorsa cevap yazar ve uyarı açar.
 * `after()` içinde çalışır; hata mesaj gönderimini etkilemez.
 */
export async function handleGroupMessage(
  conversationId: string,
  messageId: string,
): Promise<void> {
  try {
    const admin = createAdminClient();
    const group = await getAssistantGroup(admin, conversationId);
    if (!group) return;

    const { data: message } = await admin
      .from("messages")
      .select("id, sender_id, type, content, image_path, created_at")
      .eq("id", messageId)
      .single();
    if (!message || message.type !== "user" || !message.sender_id) return;

    // Personelin (gerçek diyetisyen) mesajlarına asistan karışmaz.
    const { data: sender } = await admin
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", message.sender_id)
      .single();
    if (!sender || sender.role !== "client") return;

    const now = istanbulNow(new Date(message.created_at));
    const program = await getActiveProgram(admin, group.id);
    const context = await buildTurnContext(
      admin,
      group,
      sender.id,
      now.date,
      messageId,
    );

    const userText = `${context}

# Yeni mesaj
Gönderen: @${firstName(sender.full_name)}
Bugün: ${DAY_NAMES[now.dow]} ${now.date}, saat ${now.hhmm}${now.dow === group.weigh_in_dow ? " (BUGÜN TARTI GÜNÜ)" : ""}
${message.image_path ? "[Bir fotoğraf paylaştı — görsel ekte]\n" : ""}Mesaj: ${message.content}

Yalnızca group_turn aracını çağır.`;

    const content: AnthropicNS.ContentBlockParam[] = [];
    if (message.image_path) {
      const { data: blob } = await admin.storage
        .from(CHAT_BUCKET)
        .download(message.image_path);
      if (blob) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaTypeFromPath(message.image_path),
            data: Buffer.from(await blob.arrayBuffer()).toString("base64"),
          },
        });
      }
    }
    content.push({ type: "text", text: userText });

    const turn = await decideTurn(buildSystem(group, program), content);

    await recordMemberDay(
      admin,
      group.id,
      sender.id,
      now.date,
      turn,
      Boolean(message.image_path),
    );

    if (turn.should_reply && turn.reply.trim()) {
      await postAssistantMessage(admin, conversationId, turn.reply.trim());
      await sendPushToUser(sender.id, {
        title: group.name,
        body: `Diyet Asistanı: ${turn.reply.trim().slice(0, 110)}`,
        tag: `chat-${conversationId}`,
        url: `/sohbet/${conversationId}`,
      });
    }

    if (turn.alert) {
      await admin.from("group_alerts").insert({
        group_id: group.id,
        client_id: sender.id,
        message_id: message.id,
        severity: turn.alert.severity,
        reason: turn.alert.reason,
      });
      await notifyStaff(admin, group, {
        title: `${turn.alert.severity === "high" ? "🚨" : "⚠️"} ${group.name}`,
        body: `${sender.full_name ?? "Danışan"}: ${turn.alert.reason}`,
      });
    }
  } catch (err) {
    console.error(
      "[group-assistant] mesaj işlenemedi",
      err instanceof Error ? err.message : err,
    );
  }
}

/** Modele verilen bağlam: son grup konuşması + gönderenin kayıtları. */
async function buildTurnContext(
  admin: AdminClient,
  group: AssistantGroup,
  senderId: string,
  today: string,
  currentMessageId: string,
): Promise<string> {
  const [
    { data: recent },
    { data: members },
    { data: weights },
    { data: todayRow },
  ] = await Promise.all([
    admin
      .from("messages")
      .select("id, sender_id, type, content, image_path")
      .eq("conversation_id", group.conversation_id)
      .order("created_at", { ascending: false })
      .limit(25),
    admin
      .from("conversation_members")
      .select("user_id, profiles (full_name)")
      .eq("conversation_id", group.conversation_id),
    admin
      .from("progress_entries")
      .select("entry_date, weight_kg")
      .eq("client_id", senderId)
      .not("weight_kg", "is", null)
      .gte("entry_date", group.program_started_on ?? "1900-01-01")
      .order("entry_date", { ascending: true }),
    admin
      .from("group_member_days")
      .select("water_ml, meals_shared, flags")
      .eq("group_id", group.id)
      .eq("client_id", senderId)
      .eq("day", today)
      .maybeSingle(),
  ]);

  const names = new Map(
    (members ?? []).map((m) => [
      m.user_id,
      firstName(
        (m.profiles as unknown as { full_name: string | null } | null)
          ?.full_name,
      ),
    ]),
  );

  const transcript = [...(recent ?? [])]
    .reverse()
    .filter((m) => m.id !== currentMessageId)
    .map((m) => {
      const who =
        m.type === "ai"
          ? "Asistan"
          : m.sender_id
            ? (names.get(m.sender_id) ?? "Üye")
            : "Sistem";
      const body = m.image_path ? `[fotoğraf] ${m.content}` : m.content;
      return `${who}: ${body.slice(0, 400)}`;
    })
    .join("\n");

  const w = weights ?? [];
  const weightLine =
    w.length > 0
      ? `Program başı ${w[0].weight_kg} kg, son tartı ${w[w.length - 1].weight_kg} kg (${w[w.length - 1].entry_date})`
      : "Henüz tartı kaydı yok";
  const todayLine = todayRow
    ? `Bugün: su ${todayRow.water_ml != null ? `${todayRow.water_ml / 1000} L` : "bildirilmedi"}, paylaşılan öğün ${todayRow.meals_shared}${todayRow.flags.length ? `, durum: ${todayRow.flags.join(", ")}` : ""}`
    : "Bugün henüz kayıt yok";

  return `# Son grup konuşması (eskiden yeniye)
${transcript || "(henüz konuşma yok)"}

# Gönderenin kayıtları
${weightLine}
${todayLine}`;
}

/**
 * Günlük uyum kaydını günceller ve kişisel takibe yansıtır:
 * su → water_intake, tartı → progress_entries. Böylece danışanın kendi
 * panelindeki grafikler de grupta yazdıklarıyla dolar.
 */
async function recordMemberDay(
  admin: AdminClient,
  groupId: string,
  clientId: string,
  day: string,
  turn: GroupTurn,
  hasPhoto: boolean,
): Promise<void> {
  const { data: existing } = await admin
    .from("group_member_days")
    .select("water_ml, meals_shared, weight_kg, flags")
    .eq("group_id", groupId)
    .eq("client_id", clientId)
    .eq("day", day)
    .maybeSingle();

  const waterMl =
    turn.water_liters != null ? Math.round(turn.water_liters * 1000) : null;
  const mealShared =
    turn.meal_shared || (hasPhoto && turn.intent === "meal_photo");

  await admin.from("group_member_days").upsert(
    {
      group_id: groupId,
      client_id: clientId,
      day,
      // Danışan gün içinde toplamı yazar ("2 litre oldu"); geriye düşürmeyiz.
      water_ml:
        waterMl != null
          ? Math.max(existing?.water_ml ?? 0, waterMl)
          : (existing?.water_ml ?? null),
      meals_shared: (existing?.meals_shared ?? 0) + (mealShared ? 1 : 0),
      weight_kg: turn.weight_kg ?? existing?.weight_kg ?? null,
      flags: [...new Set([...(existing?.flags ?? []), ...turn.flags])],
      last_activity_at: new Date().toISOString(),
      // Akşam yoklaması hangi öğünün paylaşıldığını bu zamandan anlar.
      ...(mealShared ? { last_meal_at: new Date().toISOString() } : {}),
    },
    { onConflict: "group_id,client_id,day" },
  );

  if (waterMl) {
    const { data: water } = await admin
      .from("water_intake")
      .select("total_ml")
      .eq("client_id", clientId)
      .eq("day", day)
      .maybeSingle();
    if (!water || water.total_ml < waterMl) {
      await admin
        .from("water_intake")
        .upsert(
          { client_id: clientId, day, total_ml: waterMl },
          { onConflict: "client_id,day" },
        );
    }
  }

  if (turn.weight_kg != null) {
    const { data: entry } = await admin
      .from("progress_entries")
      .select("id")
      .eq("client_id", clientId)
      .eq("entry_date", day)
      .limit(1)
      .maybeSingle();
    if (entry) {
      await admin
        .from("progress_entries")
        .update({ weight_kg: turn.weight_kg })
        .eq("id", entry.id);
    } else {
      await admin.from("progress_entries").insert({
        client_id: clientId,
        entry_date: day,
        weight_kg: turn.weight_kg,
        note: "Grup tartısı",
      });
    }
  }
}
