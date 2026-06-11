import type AnthropicNS from "@anthropic-ai/sdk";
import { z } from "zod";

import { anthropic, DEFAULT_MODEL } from "./client";
import type { ImageMediaType } from "./respond";

/**
 * Karpuz seçici — Claude vision + tool-use ile fotoğraftaki karpuz(lar)ı
 * değerlendirir: olgunluk/kalite ipuçlarını okur, en iyisini işaret eder ve
 * istenen kişi sayısına göre boy uygunluğunu yorumlar.
 *
 * Not: Görüntüden tat garanti edilemez; AI olasılık/kalite rehberliği verir,
 * kesin söz vermez (dürüst guardrail).
 */

// Üst sınırlar bilinçli olarak cömert — modelin geçerli çıktısı uzunluk
// yüzünden reddedilip akış kırılmasın. Kısalık prompt'ta teşvik edilir.
const signalSchema = z.object({
  label: z.string().min(1).max(120),
  status: z.enum(["good", "bad", "neutral"]),
  detail: z.string().max(600),
});

const watermelonSchema = z.object({
  detected: z.boolean(),
  count: z.coerce.number().int().min(0).max(50),
  best_location: z.string().max(400),
  score: z.coerce.number().int().min(0).max(100),
  verdict: z.enum(["great", "good", "average", "poor", "unknown"]),
  signals: z.array(signalSchema).max(10),
  size_estimate: z.string().max(300),
  size_fit: z.enum(["small", "fits", "large", "unknown"]),
  size_advice: z.string().max(800),
  recommendation: z.string().min(1).max(1500),
  // Önerilen (alınacak) karpuzun normalize 0-1 konumu; karpuz yoksa hepsi 0.
  box: z.object({
    x: z.coerce.number().min(0).max(1),
    y: z.coerce.number().min(0).max(1),
    w: z.coerce.number().min(0).max(1),
    h: z.coerce.number().min(0).max(1),
  }),
});

export type WatermelonResult = z.infer<typeof watermelonSchema>;

const WATERMELON_SCHEMA: AnthropicNS.Tool.InputSchema = {
  type: "object",
  properties: {
    detected: {
      type: "boolean",
      description: "Karede en az bir karpuz görünüyor mu?",
    },
    count: { type: "integer", description: "Görünen karpuz sayısı" },
    best_location: {
      type: "string",
      description:
        "Birden fazla karpuz varsa en iyisinin konum tarifi (ör. 'soldaki', 'öndeki büyük olan', 'sağ üstteki'). Tek karpuz varsa 'tek karpuz'.",
    },
    score: {
      type: "integer",
      description: "0-100 kalite/olgunluk skoru (önerilen karpuz için)",
    },
    verdict: {
      type: "string",
      enum: ["great", "good", "average", "poor", "unknown"],
      description: "Genel değerlendirme",
    },
    signals: {
      type: "array",
      description:
        "Görselden okunabilen olgunluk ipuçları. Yalnızca fotoğrafta GÖRÜLEBİLEN işaretleri ekle.",
      items: {
        type: "object",
        properties: {
          label: {
            type: "string",
            description:
              "İpucu adı: Tarla lekesi / Ağ-kabuk dokusu / Şekil / Renk ve mat kabuk / Sap ve bıyık / Boy-ağırlık",
          },
          status: {
            type: "string",
            enum: ["good", "bad", "neutral"],
          },
          detail: { type: "string", description: "Kısa Türkçe açıklama" },
        },
        required: ["label", "status", "detail"],
      },
    },
    size_estimate: {
      type: "string",
      description: "Tahmini boy/ağırlık (ör. '~5-7 kg, orta-büyük')",
    },
    size_fit: {
      type: "string",
      enum: ["small", "fits", "large", "unknown"],
      description: "İstenen kişi sayısına göre boy uygunluğu",
    },
    size_advice: {
      type: "string",
      description: "Boy hakkında kısa öneri (kişi sayısına göre)",
    },
    recommendation: {
      type: "string",
      description:
        "Kısa, samimi Türkçe tavsiye: alınır mı, neye dikkat edilmeli, hangi karpuz seçilmeli.",
    },
    box: {
      type: "object",
      description:
        "Önerilen (alınacak) karpuzun fotoğraftaki konumu, normalize 0-1 koordinatlarda. x,y sol-üst köşe; w,h genişlik/yükseklik (görsel genişliği/yüksekliğine oranla). Karpuz yoksa tümünü 0 ver.",
      properties: {
        x: { type: "number" },
        y: { type: "number" },
        w: { type: "number" },
        h: { type: "number" },
      },
      required: ["x", "y", "w", "h"],
    },
  },
  required: [
    "detected",
    "count",
    "best_location",
    "score",
    "verdict",
    "signals",
    "size_estimate",
    "size_fit",
    "size_advice",
    "recommendation",
    "box",
  ],
};

const SYSTEM = `Sen deneyimli bir manav ustasısın; uzmanlığın olgun, tatlı ve içi kırmızı karpuzu görselden ayırt etmek. Türkçe, samimi ve net konuşursun.

Karpuz olgunluk/kalite ipuçları (görselden değerlendir):
- Tarla lekesi (yere değen yüzeydeki leke): krem-sarı / turuncuya çalan = olgun ve tatlı; beyaz veya yeşil = erken toplanmış, az tatlı.
- Ağ benzeri kahverengi kabuk izleri (webbing/arıcık izi): ne kadar çok ve yoğunsa o kadar bal gibi tatlı (iyi tozlaşma).
- Mat ve donuk kabuk = olgun; parlak/cilalı kabuk = ham olabilir.
- Kuru, kahverengi sap/bıyık = dalında olgunlaşmış; yeşil sap = erken kesilmiş.
- Şekil simetrik ve düzgün = içi tutarlı; girintili/yamuk = düzensiz olgunluk.
- Boyuna göre ağır (yoğun) karpuz daha sulu olur; bunu görselden tahmin et ve kullanıcıya elinde tartmasını öner.
- Sesle test (kabuğa vurunca tok-derin "bom" sesi) görselden duyulamaz; ipucu olarak kullanıcıya hatırlat ama signal listesine koyma.

Kurallar:
- Yalnızca fotoğrafta gerçekten GÖRÜLEBİLEN işaretleri 'signals' içine koy. Görünmüyorsa uydurma.
- Görselden tadı %100 garanti edemezsin; tavsiyeni "yüksek ihtimalle" diliyle ver, kesin söz verme.
- Birden fazla karpuz varsa en iyisini 'best_location' ile tarif et.
- ALINACAK (önerilen) karpuzun konumunu 'box' ile normalize 0-1 koordinatlarda işaretle: x,y sol-üst köşe, w,h genişlik/yükseklik. Kutu yalnızca o tek karpuzu sarmalı, sıkı olsun. Tek karpuz olsa bile onu işaretle.
- Karede karpuz yoksa detected=false yap, score=0, verdict="unknown", box tümü 0 ve recommendation alanında kibarca karpuzu çerçeveye almasını iste.
- KISA yaz: recommendation en çok 2-3 cümle; her signal detail tek kısa cümle. Gereksiz uzatma.
- Her zaman yalnızca save_watermelon aracını çağır.`;

export async function analyzeWatermelon(params: {
  imageBase64: string;
  mediaType: ImageMediaType;
  servings: string;
}): Promise<WatermelonResult> {
  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1024,
    system: [
      { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    tools: [
      {
        name: "save_watermelon",
        description: "Karpuz değerlendirmesini kaydeder.",
        input_schema: WATERMELON_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "save_watermelon" },
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
            text: `Bu fotoğraftaki karpuz(lar)ı değerlendir. Kullanıcı ${params.servings} bir karpuz arıyor; boyu buna göre yorumla. Olgunluk ipuçlarını oku, en iyi karpuzu işaret et ve kısa bir tavsiye ver. Yalnızca save_watermelon aracını çağır.`,
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Karpuz analizi başarısız.");
  }
  return watermelonSchema.parse(toolUse.input);
}
