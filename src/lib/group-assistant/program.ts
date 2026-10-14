import type AnthropicNS from "@anthropic-ai/sdk";
import { z } from "zod";

import { anthropic, DEFAULT_MODEL } from "@/lib/ai/client";
import type { PlanAttachment } from "@/lib/ai/respond";

const programSchema = z.object({
  title: z.string().min(1).max(120),
  content: z.string().min(1).max(20_000),
});

export type ExtractedProgram = z.infer<typeof programSchema>;

const PROGRAM_TOOL: AnthropicNS.Tool = {
  name: "save_program",
  description: "Diyet listesinin okunmuş metnini kaydeder.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Kısa başlık, ör. '2. hafta — Aralıklı oruç'" },
      content: {
        type: "string",
        description:
          "Listenin TAMAMI, düz metin/markdown: öğünler ve seçenekleri, miktarlar, tarifler, kurallar, değişim tabloları, saatler.",
      },
    },
    required: ["title", "content"],
  },
};

/**
 * Admin'in yüklediği haftalık liste PDF'ini/fotoğrafını asistanın kullanacağı
 * metne çevirir. Özetlemez, kelimesi kelimesine aktarır — asistan miktar
 * sorularını bu metinden cevaplayacak. Admin yayınlamadan önce düzeltebilir.
 */
export async function extractProgram(attachment: PlanAttachment): Promise<ExtractedProgram> {
  const source: AnthropicNS.ContentBlockParam =
    attachment.kind === "pdf"
      ? {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: attachment.base64 },
        }
      : {
          type: "image",
          source: { type: "base64", media_type: attachment.mediaType, data: attachment.base64 },
        };

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 8192,
    tools: [PROGRAM_TOOL],
    tool_choice: { type: "tool", name: "save_program" },
    messages: [
      {
        role: "user",
        content: [
          source,
          {
            type: "text",
            text: `Bu, bir diyet grubunun haftalık listesi. İçeriği EKSİKSİZ ve AYNEN metne aktar:
- Öğün başlıkları (Uyanınca, Kahvaltı, Ara, Öğle, Akşam...) ve her seçenek, miktarlarıyla.
- Tarifler, genel kurallar, değişim tabloları, saatler, "tartıya son 3 gün kala" gibi zamanlamalar.
- İletişim bilgisi, telefon, e-posta, adres, logo yazıları ve süs metinlerini ALMA.
- Yorum ekleme, özetleme, düzeltme yapma. Okuyamadığın yere [okunamadı] yaz.
Yalnızca save_program aracını çağır.`,
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("Liste okunamadı.");
  return programSchema.parse(toolUse.input);
}
