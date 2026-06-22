"use server";

import {
  generateVisionAnswer,
  type ImageMediaType,
} from "@/lib/ai/respond";
import { getActiveDietitianRules } from "@/lib/ai/rules";
import { getUser } from "@/lib/auth";
import {
  getAssistantConversationId,
  logAssistantMessage,
} from "@/lib/chat/assistant";
import { consumeAiCredit } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
} from "@/lib/validations/progress";

export type PhotoAnswer =
  | { error: string }
  | { answer: string }
  | { quota: true };

/**
 * Asistan sohbetinde paylaşılan fotoğrafı BELLEKTE (Storage'a yazmadan) analiz
 * eder ve metin yanıt döndürür. Freemium: vision kredisi tüketir.
 */
export async function analyzeAssistantPhoto(
  formData: FormData,
): Promise<PhotoAnswer> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return { error: "Fotoğraf seçilmedi." };
  }
  if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) {
    return { error: "Yalnızca JPEG, PNG veya WEBP yükleyebilirsin." };
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return { error: "Fotoğraf en fazla 5 MB olabilir." };
  }

  // Freemium: günde 1 ücretsiz foto analizi; üstü premium.
  const credit = await consumeAiCredit(user.id, "vision");
  if (!credit.ok) {
    // Kota doldu → istemci premium popup'ını açar.
    return { quota: true };
  }

  const base64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
  const rules = await getActiveDietitianRules();
  const transcript =
    typeof formData.get("transcript") === "string"
      ? (formData.get("transcript") as string)
      : "";

  try {
    const answer = await generateVisionAnswer({
      imageBase64: base64,
      mediaType: photo.type as ImageMediaType,
      transcript,
      dietitianRules: rules,
      planContext: null,
    });

    // Denetlenebilirlik (§5): foto etkileşimini asistan konuşmasına kaydet.
    // Fotoğraf bellekte analiz edilir (Storage'a yazılmaz) → image_path yok.
    const admin = createAdminClient();
    const conversationId = await getAssistantConversationId(
      admin,
      user.id,
    ).catch(() => null);
    if (conversationId) {
      await logAssistantMessage(admin, conversationId, {
        type: "user",
        content: "📷 Asistana fotoğraf paylaştım",
        senderId: user.id,
      });
      await logAssistantMessage(admin, conversationId, {
        type: "ai",
        content: answer,
        senderId: null,
      });
    }

    return { answer };
  } catch {
    return { error: "Fotoğraf analiz edilemedi, lütfen tekrar dene." };
  }
}
