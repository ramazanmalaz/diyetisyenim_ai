import type AnthropicNS from "@anthropic-ai/sdk";
import { z } from "zod";

import { FRIDGE_MEAL_OPTIONS, type FridgeMeal } from "@/lib/fridge-options";

import { anthropic, DEFAULT_MODEL } from "./client";
import type { ImageMediaType } from "./respond";

/**
 * "Dolabımda ne var?" — kullanıcının elindeki malzemelerden (yazarak ya da
 * dolap/tezgâh fotoğrafıyla) diyetine uygun yemek önerileri ve tarifleri üretir.
 * Çıktı yapılandırılmıştır (tool-use) ki kalori/porsiyon arayüzde gösterilebilsin.
 */

// Üst sınırlar cömert: geçerli bir yanıt uzunluk yüzünden reddedilmesin.
const recipeSchema = z.object({
  title: z.string().min(1).max(120),
  kcal_per_serving: z.coerce.number().int().min(0).max(3000),
  protein_g: z.coerce.number().min(0).max(300),
  carb_g: z.coerce.number().min(0).max(500),
  fat_g: z.coerce.number().min(0).max(300),
  servings: z.coerce.number().int().min(1).max(12),
  time_min: z.coerce.number().int().min(1).max(600),
  uses: z.array(z.string().max(80)).max(20),
  missing: z.array(z.string().max(80)).max(10),
  ingredients: z.array(z.string().max(160)).min(1).max(25),
  steps: z.array(z.string().max(500)).min(1).max(15),
  why_fits: z.string().max(600),
});

const fridgeSchema = z.object({
  ingredients: z.array(z.string().min(1).max(80)).max(40),
  recipes: z.array(recipeSchema).max(4),
  note: z.string().max(800),
});

export type FridgeRecipe = z.infer<typeof recipeSchema>;
export type FridgeResult = z.infer<typeof fridgeSchema>;

const FRIDGE_SCHEMA: AnthropicNS.Tool.InputSchema = {
  type: "object",
  properties: {
    ingredients: {
      type: "array",
      description:
        "Kullanılabilir malzemelerin son listesi (yazılanlar + fotoğrafta GÖRÜLENLER). Kısa Türkçe adlar: 'yumurta', 'domates', 'lor peyniri'. Emin olmadığını listeye koyma.",
      items: { type: "string" },
    },
    recipes: {
      type: "array",
      description:
        "3 tarif önerisi; en uygunu ilk sırada. Malzeme hiç yoksa ya da yemek yapılamıyorsa boş dizi.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Yemeğin adı" },
          kcal_per_serving: {
            type: "integer",
            description: "1 porsiyonun yaklaşık kalorisi",
          },
          protein_g: { type: "number", description: "1 porsiyon protein (g)" },
          carb_g: { type: "number", description: "1 porsiyon karbonhidrat (g)" },
          fat_g: { type: "number", description: "1 porsiyon yağ (g)" },
          servings: { type: "integer", description: "Tarif kaç porsiyon" },
          time_min: {
            type: "integer",
            description: "Hazırlık + pişirme toplam dakika",
          },
          uses: {
            type: "array",
            description: "Listeden kullanılan malzemeler",
            items: { type: "string" },
          },
          missing: {
            type: "array",
            description:
              "Kullanıcının listesinde OLMAYAN ama tarifte gereken malzemelerin kısa adları ('balzamik sirke'). Listede olanı asla yazma; açıklama ekleme. Mümkünse boş; en fazla 2.",
            items: { type: "string" },
          },
          ingredients: {
            type: "array",
            description:
              "Tarifin TAMAMI ('servings' porsiyon) için ölçülü malzeme listesi: '2 adet yumurta', '1 tatlı kaşığı zeytinyağı'. Yağı mutlaka ölçüyle yaz.",
            items: { type: "string" },
          },
          steps: {
            type: "array",
            description: "Kısa, numarasız yapılış adımları (her biri tek cümle)",
            items: { type: "string" },
          },
          why_fits: {
            type: "string",
            description:
              "Bu tarif diyetine neden uygun — tek kısa cümle; yalnızca kalori bütçesi, protein, lif, tokluk, pişirme şekli üzerinden. Sağlık/hastalık iddiası yok.",
          },
        },
        required: [
          "title",
          "kcal_per_serving",
          "protein_g",
          "carb_g",
          "fat_g",
          "servings",
          "time_min",
          "uses",
          "missing",
          "ingredients",
          "steps",
          "why_fits",
        ],
      },
    },
    note: {
      type: "string",
      description:
        "Kısa genel not (1-2 cümle). Fotoğraf okunamadıysa, malzeme yetersizse ya da sağlık notu nedeniyle diyetisyene danışmak gerekiyorsa burada söyle. Gerek yoksa boş string.",
    },
  },
  required: ["ingredients", "recipes", "note"],
};

const SYSTEM = `Sen pratik Türk mutfağını iyi bilen bir diyet aşçısısın. Kullanıcının elindeki malzemelerle, diyetine uygun, kolay ve doyurucu yemekler önerirsin. Türkçe, samimi ve net yazarsın.

Kurallar:
- Önce kullanıcının listesindeki malzemeleri kullan. Fotoğraf varsa yalnızca gerçekten GÖRDÜĞÜN yiyecekleri ekle; kapalı kutu/kavanozun içini tahmin etme.
- Evde hemen her zaman bulunan temel şeyleri (tuz, karabiber, pul biber, su, az miktarda zeytinyağı/sıvıyağ, sirke, limon suyu) varsayabilirsin; bunlar 'missing' sayılmaz. Bunun dışındaki her eksik malzemeyi 'missing'e yaz ve en fazla 2 tane olsun.
- Kalori bütçesi verildiyse 1 porsiyon bu bütçeyi geçmesin (±%10). Bütçe yoksa ana öğün 350-550 kcal, ara öğün 100-250 kcal civarı.
- Diyet dostu pişirme: kızartma yerine fırın/tava/haşlama/buğulama; yağı ölçüyle ver (ör. 1 tatlı kaşığı). Şeker, beyaz un, krema, hazır sos az olsun.
- Proteini öne çıkar (yumurta, yoğurt, peynir, baklagil, et/tavuk/balık) — tok tutar.
- Kullanıcının sevmediği ya da kaçınması gereken yiyecekleri ASLA kullanma.
- Kaloriyi malzeme miktarlarından hesapla: kcal_per_serving = tarifin toplam kalorisi / servings. Miktarları bütçeye göre ayarla (ör. tek kişilik ana öğünde kuru bulgur/pirinç ~50-70 g). Yuvarlak, gerçekçi sayılar ver.
- Sağlık notu alerji içeriyorsa o yiyeceği asla kullanma. Kronik hastalık, hamilelik gibi bir durum varsa hastalık hakkında yorum yapma ("X dostu", "antiinflamatuar", "guatrojen" gibi ifadeler yok); yalnızca 'note' alanında tek cümleyle tarifleri diyetisyenine/doktoruna danışarak uygulamasını hatırlat. Tıbbi teşhis koyma, ilaç/takviye önerme.
- Malzeme yoksa, fotoğrafta yiyecek görünmüyorsa ya da hiçbir makul yemek çıkmıyorsa recipes boş olsun ve 'note' ile ne yapması gerektiğini söyle (ör. dolabın içini daha net çek, birkaç malzeme yaz).
- 3 farklı tarif ver; aynı yemeğin varyasyonlarını verme. Adımlar kısa ve uygulanabilir olsun.
- Her zaman yalnızca save_recipes aracını çağır.`;

export type FridgeContext = {
  dailyTarget: number | null;
  mealBudget: number | null;
  dislikes: string | null;
  healthNotes: string | null;
};

export function buildFridgePrompt(params: {
  ingredientsText: string;
  meal: FridgeMeal;
  hasPhoto: boolean;
  context: FridgeContext;
}): string {
  const { context: c } = params;
  const mealLabel =
    FRIDGE_MEAL_OPTIONS.find((o) => o.value === params.meal)?.label ??
    "Fark etmez";
  const lines = [
    params.hasPhoto
      ? "Ekteki fotoğraf kullanıcının dolabı/tezgâhı. Gördüğün yiyecekleri malzeme listesine ekle."
      : null,
    `Kullanıcının yazdığı malzemeler: ${params.ingredientsText.trim() || "(yazmadı)"}`,
    `Öğün: ${mealLabel}`,
    c.mealBudget ? `Bu öğün için kalori bütçesi: ~${c.mealBudget} kcal (1 porsiyon)` : null,
    c.dailyTarget ? `Günlük kalori hedefi: ${c.dailyTarget} kcal` : null,
    c.dislikes ? `Sevmedikleri / yemedikleri: ${c.dislikes}` : null,
    c.healthNotes ? `Sağlık notu: ${c.healthNotes}` : null,
    "Yalnızca save_recipes aracını çağır.",
  ];
  return lines.filter(Boolean).join("\n");
}

export async function suggestFridgeRecipes(params: {
  prompt: string;
  image: { base64: string; mediaType: ImageMediaType } | null;
}): Promise<FridgeResult> {
  const content: AnthropicNS.ContentBlockParam[] = [];
  if (params.image) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: params.image.mediaType,
        data: params.image.base64,
      },
    });
  }
  content.push({ type: "text", text: params.prompt });

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    // 3 tarif, adımlarıyla birlikte 1024 token'a sığmıyor.
    max_tokens: 3000,
    system: [
      { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    tools: [
      {
        name: "save_recipes",
        description: "Malzemelere göre tarif önerilerini kaydeder.",
        input_schema: FRIDGE_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "save_recipes" },
    messages: [{ role: "user", content }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Tarif önerisi üretilemedi.");
  }
  return fridgeSchema.parse(toolUse.input);
}
