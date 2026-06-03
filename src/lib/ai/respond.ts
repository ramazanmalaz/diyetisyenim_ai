import { anthropic, DEFAULT_MODEL, MAX_TOKENS } from "./client";
import { buildSystemPrompt } from "./prompt";

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
): Promise<string> {
  const system = buildSystemPrompt(dietitianRules);

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
