"use server";

import { redirect } from "next/navigation";

import {
  analyzePlatePhoto,
  generateDietAnswer,
  type ChatMessage,
  type ImageMediaType,
} from "@/lib/ai/respond";
import { getActiveDietitianRules } from "@/lib/ai/rules";
import { getUser } from "@/lib/auth";
import { DAYS, mealTypeLabel, mealTypeOrder } from "@/lib/diet";
import { consumeAiCredit, upgradeMessage } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { messageSchema } from "@/lib/validations/chat";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
} from "@/lib/validations/progress";

const CHAT_BUCKET = "progress-photos";

function mediaTypeFromPath(path: string): ImageMediaType {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

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
    await respondWithAi(parsed.data.conversationId, user.id);
  }

  return { success: true };
}

/**
 * Tabak fotoğrafı mesajı: Storage'a yükler, mesaj olarak ekler ve AI vision
 * analizini tetikler. RLS yazımı service-role ile (sahiplik sunucuda doğrulanır).
 */
export async function sendPhotoMessage(
  formData: FormData,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const conversationId = formData.get("conversationId");
  const photo = formData.get("photo");
  if (typeof conversationId !== "string") {
    return { error: "Konuşma bulunamadı." };
  }
  if (!(photo instanceof File) || photo.size === 0) {
    return { error: "Fotoğraf seçilmedi." };
  }
  if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) {
    return { error: "Yalnızca JPEG, PNG veya WEBP yükleyebilirsin." };
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return { error: "Fotoğraf en fazla 5 MB olabilir." };
  }

  const admin = createAdminClient();
  const ext = photo.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/chat/${Date.now()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from(CHAT_BUCKET)
    .upload(path, photo, { contentType: photo.type });
  if (uploadError) {
    return { error: "Fotoğraf yüklenemedi." };
  }

  const { error: insertError } = await admin.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    type: "user",
    content: "📷 Tabağımın fotoğrafını paylaştım",
    image_path: path,
  });
  if (insertError) {
    return { error: "Mesaj eklenemedi." };
  }

  await respondWithAi(conversationId, user.id);
  return { success: true };
}

/**
 * Kullanıcının aktif planını AI'a bağlam olarak verecek metni üretir.
 */
async function buildPlanContext(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<string | null> {
  const { data: plan } = await admin
    .from("diet_plans")
    .select("id, daily_calorie_target")
    .eq("client_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan) return null;

  const { data: meals } = await admin
    .from("meals")
    .select("day_of_week, meal_type, content, calories")
    .eq("plan_id", plan.id);
  if (!meals || meals.length === 0) return null;

  const lines = [...meals]
    .sort(
      (a, b) =>
        a.day_of_week - b.day_of_week ||
        mealTypeOrder(a.meal_type) - mealTypeOrder(b.meal_type),
    )
    .map(
      (m) =>
        `${DAYS[m.day_of_week]} - ${mealTypeLabel(m.meal_type)}: ${m.content}${
          m.calories != null ? ` (${m.calories} kcal)` : ""
        }`,
    );

  // Son kilo kayıtları (ilerleme takibinden) — AI ilerlemeyi yorumlayabilsin.
  const { data: progress } = await admin
    .from("progress_entries")
    .select("entry_date, weight_kg")
    .eq("client_id", userId)
    .not("weight_kg", "is", null)
    .order("entry_date", { ascending: false })
    .limit(4);

  let progressBlock = "";
  if (progress && progress.length > 0) {
    const pts = [...progress]
      .reverse()
      .map((p) => `${p.entry_date}: ${p.weight_kg} kg`)
      .join(", ");
    progressBlock = `\n\nSon kilo kayıtları: ${pts}`;
  }

  return `Günlük kalori hedefi: ${plan.daily_calorie_target ?? "?"} kcal\n${lines.join("\n")}${progressBlock}`;
}

/**
 * Konuşmadaki son mesajları transkripte çevirip AI yanıtı üretir ve kaydeder.
 * Kullanıcının aktif planı bağlam olarak verilir. AI mesajı service-role ile eklenir.
 */
async function respondWithAi(
  conversationId: string,
  userId: string,
): Promise<void> {
  const admin = createAdminClient();

  const { data: recent } = await admin
    .from("messages")
    .select("type, content, image_path")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(15);

  if (!recent || recent.length === 0) return;

  const latest = recent[0];

  // Freemium kapısı: fotoğraf = vision, metin = chat kredisi.
  const kind = latest.type === "user" && latest.image_path ? "vision" : "chat";
  const credit = await consumeAiCredit(userId, kind);
  if (!credit.ok) {
    await admin.from("messages").insert({
      conversation_id: conversationId,
      sender_id: null,
      type: "ai",
      content: upgradeMessage(kind),
    });
    return;
  }

  const transcript = [...recent]
    .reverse()
    .map(
      (m) =>
        `${m.type === "ai" ? "Asistan" : "Danışan"}: ${
          m.image_path ? "[tabak fotoğrafı paylaştı]" : m.content
        }`,
    )
    .join("\n");

  const [rules, planContext] = await Promise.all([
    getActiveDietitianRules(),
    buildPlanContext(admin, userId),
  ]);

  let answer: string;
  try {
    if (latest.type === "user" && latest.image_path) {
      // Fotoğraf mesajı → Claude vision + tool-use ile YAPILANDIRILMIŞ analiz.
      const { data: blob } = await admin.storage
        .from(CHAT_BUCKET)
        .download(latest.image_path);
      if (!blob) throw new Error("Fotoğraf indirilemedi.");
      const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");

      const scan = await analyzePlatePhoto({
        imageBase64: base64,
        mediaType: mediaTypeFromPath(latest.image_path),
        dietitianRules: rules,
        planContext,
      });

      const { data: planRow } = await admin
        .from("diet_plans")
        .select("daily_calorie_target")
        .eq("client_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Food-scan kartı olarak işaretle (UI sentinel'i tanıyıp kart render eder).
      answer =
        "[[FOODSCAN]]" +
        JSON.stringify({
          ...scan,
          dailyTarget: planRow?.daily_calorie_target ?? null,
        });
    } else {
      const prompt: ChatMessage[] = [
        {
          role: "user",
          content: `Aşağıdaki konuşmada son mesaja, kullanıcının kişisel diyet asistanı olarak yanıt ver.\n\n${transcript}`,
        },
      ];
      answer = await generateDietAnswer(prompt, rules, planContext);
    }
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
