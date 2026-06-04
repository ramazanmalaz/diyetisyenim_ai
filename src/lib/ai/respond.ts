import type AnthropicNS from "@anthropic-ai/sdk";
import { z } from "zod";

import { anthropic, DEFAULT_MODEL, MAX_TOKENS } from "./client";
import { buildChatSystemPrompt, buildSystemPrompt } from "./prompt";

export type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * Diyet sorusuna Claude'dan streaming yanıt üretir.
 * Sistem promptu güvenlik guardrail'leri + diyetisyen kurallarından derlenir.
 * Maliyet için sistem promptuna prompt caching uygulanır.
 */
export function streamDietAnswer(
  messages: ChatMessage[],
  dietitianRules: string | null,
) {
  const system = buildSystemPrompt(dietitianRules);

  return anthropic.messages.stream({
    model: DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      { type: "text", text: system, cache_control: { type: "ephemeral" } },
    ],
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
}

/**
 * Sohbete entegrasyon için streaming OLMAYAN yanıt: tam metni döndürür.
 * Mesaj kalıcı olarak kaydedileceği için (WhatsApp tarzı) akış gerekmez.
 */
export async function generateDietAnswer(
  messages: ChatMessage[],
  dietitianRules: string | null,
  planContext: string | null = null,
): Promise<string> {
  const system = buildChatSystemPrompt(dietitianRules, planContext);

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      { type: "text", text: system, cache_control: { type: "ephemeral" } },
    ],
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

/**
 * Tabak/sofra fotoğrafını Claude vision ile okur, kalorilerini tahmin eder ve
 * kullanıcının planıyla karşılaştırıp yorumlar. Yanlış okuma için düzeltme ister.
 */
export async function generateVisionAnswer(params: {
  imageBase64: string;
  mediaType: ImageMediaType;
  transcript: string;
  dietitianRules: string | null;
  planContext: string | null;
}): Promise<string> {
  const system = buildChatSystemPrompt(
    params.dietitianRules,
    params.planContext,
  );

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      { type: "text", text: system, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: params.mediaType,
              data: params.imageBase64,
            },
          },
          {
            type: "text",
            text: `Kullanıcı tabağının/sofrasının fotoğrafını paylaştı.
1) Fotoğraftaki yiyecekleri OKU ve her birini tahmini kalorisiyle madde madde listele, toplam kaloriyi de ver.
2) Kullanıcının güncel planıyla kısaca karşılaştır ve yorumla (hedefe uygun mu?).
3) Okuman hatalı olabileceği için, "yanlış varsa düzeltmen yeterli, ona göre güncellerim" de.

Konuşma geçmişi:
${params.transcript}`,
          },
        ],
      },
    ],
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

// ---------------------------------------------------------------------------
// Yapılandırılmış tabak analizi (Negatives/Positives kartı için)
// ---------------------------------------------------------------------------
const foodScanSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        calories: z.coerce.number().int().min(0).max(5000),
        verdict: z.enum(["positive", "caution"]),
      }),
    )
    .min(1)
    .max(60),
  total_calories: z.coerce.number().int().min(0).max(50000),
  note: z.string().max(2000),
});

export type FoodScan = z.infer<typeof foodScanSchema>;

const FOODSCAN_SCHEMA: AnthropicNS.Tool.InputSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Yiyecek adı (miktarla)" },
          calories: { type: "integer" },
          verdict: {
            type: "string",
            enum: ["positive", "caution"],
            description:
              "Sağlıklı/plana uygunsa positive; yüksek kalorili/işlenmiş/aşırı ise caution",
          },
        },
        required: ["name", "calories", "verdict"],
      },
    },
    total_calories: { type: "integer" },
    note: {
      type: "string",
      description: "Kısa Türkçe yorum + planla karşılaştırma",
    },
  },
  required: ["items", "total_calories", "note"],
};

/**
 * Tabak fotoğrafını Claude vision + tool-use ile YAPILANDIRILMIŞ analiz eder:
 * her öğe için kalori + olumlu/dikkat değerlendirmesi ve genel not.
 */
export async function analyzePlatePhoto(params: {
  imageBase64: string;
  mediaType: ImageMediaType;
  dietitianRules: string | null;
  planContext: string | null;
}): Promise<FoodScan> {
  const system = buildChatSystemPrompt(
    params.dietitianRules,
    params.planContext,
  );

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 2048,
    system: [
      { type: "text", text: system, cache_control: { type: "ephemeral" } },
    ],
    tools: [
      {
        name: "save_food_scan",
        description: "Tabak fotoğrafı analizini kaydeder.",
        input_schema: FOODSCAN_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "save_food_scan" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: params.mediaType,
              data: params.imageBase64,
            },
          },
          {
            type: "text",
            text: "Bu tabak/sofra fotoğrafındaki yiyecekleri oku. Her öğeyi tahmini kalorisiyle ve verdict (positive=sağlıklı/plana uygun, caution=yüksek kalorili/işlenmiş/aşırı) ile listele. note alanına kısa bir genel yorum + kullanıcının planıyla karşılaştırma yaz. Yalnızca save_food_scan aracını çağır.",
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Analiz başarısız.");
  }
  return foodScanSchema.parse(toolUse.input);
}
