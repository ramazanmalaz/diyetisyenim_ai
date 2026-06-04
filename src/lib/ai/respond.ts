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
