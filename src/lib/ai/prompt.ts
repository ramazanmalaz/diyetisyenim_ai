import { SAFETY_GUARDRAILS } from "./guardrails";

/**
 * Diyetisyenin DB'deki ek kurallarıyla sabit güvenlik guardrail'lerini birleştirip
 * Claude'a gönderilecek sistem promptunu oluşturur.
 *
 * Sıra önemlidir: önce diyetisyen bağlamı, sonra DEĞİŞTİRİLEMEZ güvenlik kuralları —
 * böylece güvenlik kuralları her zaman son sözü söyler.
 */
export function buildSystemPrompt(dietitianRules: string | null): string {
  const rulesBlock = dietitianRules?.trim()
    ? `# Diyetisyen Tarafından Tanımlanan Kurallar\n\n${dietitianRules.trim()}\n\n`
    : "";

  return `${rulesBlock}${SAFETY_GUARDRAILS}`;
}
