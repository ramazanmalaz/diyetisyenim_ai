import type AnthropicNS from "@anthropic-ai/sdk";
import { z } from "zod";

import { enrichMealsWithUsda } from "@/lib/foods/usda";

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

// ---------------------------------------------------------------------------
// Mevcut plan fotoğrafından öğün şablonu çıkarma (kullanıcının hazır planı)
// ---------------------------------------------------------------------------
const PLAN_MEAL_TYPES = [
  "breakfast",
  "snack_morning",
  "lunch",
  "snack_afternoon",
  "dinner",
] as const;

const planPhotoSchema = z.object({
  meals: z
    .array(
      z.object({
        day_of_week: z.coerce.number().int().min(0).max(6),
        meal_type: z.enum(PLAN_MEAL_TYPES),
        item: z.string().min(1).max(200),
        calories: z.coerce.number().int().min(0).max(3000),
      }),
    )
    .min(1)
    .max(140),
  multi_day: z.boolean().optional().default(false),
  note: z.string().max(1000).optional().default(""),
});

export type PlanPhotoScan = z.infer<typeof planPhotoSchema>;

/** Plan okuma için tek bir ek — ya fotoğraf (image) ya da PDF (document). */
export type PlanAttachment =
  | { kind: "image"; base64: string; mediaType: ImageMediaType }
  | { kind: "pdf"; base64: string };

const PLANPHOTO_SCHEMA: AnthropicNS.Tool.InputSchema = {
  type: "object",
  properties: {
    meals: {
      type: "array",
      description: "Plandaki öğünler (günlere göre).",
      items: {
        type: "object",
        properties: {
          day_of_week: {
            type: "integer",
            description:
              "0=Pazartesi ... 6=Pazar. Plan tek günlük şablonsa hepsi 0.",
          },
          meal_type: { type: "string", enum: [...PLAN_MEAL_TYPES] },
          item: {
            type: "string",
            description: "Tek bir yiyecek, miktarıyla. Örn: '2 haşlanmış yumurta'",
          },
          calories: { type: "integer", description: "Bu öğenin tahmini kalorisi" },
        },
        required: ["day_of_week", "meal_type", "item", "calories"],
      },
    },
    multi_day: {
      type: "boolean",
      description: "Görselde birden çok güne ait farklı menüler varsa true.",
    },
    note: { type: "string", description: "Kısa Türkçe not (okuma güveni vb.)" },
  },
  required: ["meals"],
};

/**
 * Kullanıcının HAZIR diyet planının fotoğraf(lar)ını/PDF'ini okur ve TEK GÜNLÜK
 * bir öğün şablonu (meal_type + öğe + kalori) olarak yapılandırır. Plan birden
 * çok gün içeriyorsa temsili bir günü baz alır. Sadece kalori/okuma yapar; reçete vermez.
 */
export async function analyzePlanPhoto(params: {
  attachments: PlanAttachment[];
  dietitianRules: string | null;
}): Promise<PlanPhotoScan> {
  const system = buildSystemPrompt(params.dietitianRules);

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    // Haftalık (7 günlük) tablolar 70+ öğe → ~3.5k token üretebilir; 4096 sınıra
    // çok yakın olup kesiliyordu (truncation → bozuk tool JSON → okuma başarısız).
    max_tokens: 8192,
    system: [
      { type: "text", text: system, cache_control: { type: "ephemeral" } },
    ],
    tools: [
      {
        name: "save_plan_template",
        description: "Görsel/PDF'ten okunan günlük öğün şablonunu kaydeder.",
        input_schema: PLANPHOTO_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "save_plan_template" },
    messages: [
      {
        role: "user",
        content: [
          ...params.attachments.map((a) =>
            a.kind === "pdf"
              ? ({
                  type: "document",
                  source: {
                    type: "base64",
                    media_type: "application/pdf",
                    data: a.base64,
                  },
                } as const)
              : ({
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: a.mediaType,
                    data: a.base64,
                  },
                } as const),
          ),
          {
            type: "text",
            text: `Bu görsel(ler)/PDF kullanıcının elindeki HAZIR bir diyet/beslenme planı. İçindeki öğünleri çıkar:
- Görselde HAFTANIN GÜNLERİ (Pzt, Sal, ... veya 1.gün, 2.gün) ayrı ayrı yazıyorsa, her öğeyi doğru day_of_week'e (0=Pazartesi ... 6=Pazar) ata ve multi_day=true yap.
- Aynı gün adı BİRDEN FAZLA sütunda görünüyorsa (örn. tablo Perşembe'den başlayıp Perşembe'de bitiyorsa), o günü YALNIZCA İLK görüldüğü sütundan al; tekrar eden sütunu yok say. Her gün (0–6) en fazla bir kez doldurulmalı.
- Görselde tek bir günlük şablon varsa tüm öğeleri day_of_week=0 yap ve multi_day=false.
- Her öğeyi meal_type ile eşle: breakfast (kahvaltı/sabah), snack_morning (kuşluk/ilk ara), lunch (öğle), snack_afternoon (ikindi/ikinci ara), dinner (akşam). Saat etiketi varsa: en erken öğün=breakfast, akşam/son öğün=dinner; aradakiler sırasıyla snack_morning ve snack_afternoon.
- Her öğeyi MİKTARIYLA yaz ve tahmini kalorisini ver.
- Okuman hatalı olabilir; note alanına kısa bir uyarı yaz. Yalnızca save_plan_template aracını çağır.`,
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Plan okunamadı.");
  }
  const scan = planPhotoSchema.parse(toolUse.input);
  // Okunan standart gıdaların kalorisini USDA ile doğrula/güncelle (best-effort).
  const meals = await enrichMealsWithUsda(scan.meals);
  return { ...scan, meals };
}
