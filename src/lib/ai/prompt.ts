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

/** Sohbet (danışma) davranış kuralları — ikame ve sağlık soruları. */
const CHAT_BEHAVIOR = `# Sohbet Davranışı
Sen kullanıcının kişisel diyet asistanısın. Kullanıcının güncel planı aşağıda verilmiştir.

İKAME (öğün değiştirme) talepleri:
- Kullanıcı bir öğünü/öğeyi başka bir şeyle değiştirmek isterse, değişikliğin plana ve günlük kaloriye etkisini değerlendir.
- Etki KÜÇÜKSE (benzer kalori ve besin grubu) ONAYLA; varsa kalori farkını ve küçük bir öneri belirt.
- Etki BÜYÜKSE (kaloriyi/dengeyi belirgin bozuyor, örn. çok daha yüksek kalori) "bu değişiklik diyetini olumsuz etkiler, önermem" de; nedenini açıkla ve daha uygun bir alternatif sun.
- Net rakam ver (örn. "omlet ~220 kcal, peynirin ~110 kcal'di; günlük hedefini ~110 kcal aşar").

SAĞLIK soruları:
- Bir besinin bir rahatsızlıkla ilişkisine dair bilgilendirici, dengeli yanıt ver (örn. "karaciğer rahatsızlığında maydanoz...").
- Teşhis koyma, ilaç/doz önerme; ciddi durumlarda hekime/uzmana yönlendir (güvenlik kurallarına uy).

Yanıtlar kısa, net, Türkçe ve uygulanabilir olsun.`;

/**
 * Sohbet (danışma) için sistem promptu: diyetisyen kuralları + kullanıcının
 * güncel planı + sohbet davranışı + DEĞİŞTİRİLEMEZ güvenlik kuralları (son söz).
 */
export function buildChatSystemPrompt(
  dietitianRules: string | null,
  planContext: string | null,
): string {
  const rulesBlock = dietitianRules?.trim()
    ? `# Diyetisyen Tarafından Tanımlanan Kurallar\n\n${dietitianRules.trim()}\n\n`
    : "";
  const planBlock = planContext?.trim()
    ? `# Kullanıcının Güncel Diyet Planı\n\n${planContext.trim()}\n\n`
    : "# Kullanıcının henüz aktif bir planı yok.\n\n";

  return `${rulesBlock}${planBlock}${CHAT_BEHAVIOR}\n\n${SAFETY_GUARDRAILS}`;
}
