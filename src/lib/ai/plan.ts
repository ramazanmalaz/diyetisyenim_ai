import type AnthropicNS from "@anthropic-ai/sdk";
import { z } from "zod";

import { anthropic, DEFAULT_MODEL } from "./client";
import { buildSystemPrompt } from "./prompt";

const planItemSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  meal_type: z.enum([
    "breakfast",
    "snack_morning",
    "lunch",
    "snack_afternoon",
    "dinner",
  ]),
  item: z.string().min(1).max(200),
  calories: z.number().int().min(0).max(3000),
});

const planSchema = z.object({ meals: z.array(planItemSchema).min(5).max(140) });

export type GeneratedMeal = z.infer<typeof planItemSchema>;

const INPUT_SCHEMA: AnthropicNS.Tool.InputSchema = {
  type: "object",
  properties: {
    meals: {
      type: "array",
      description: "Haftalık plandaki tüm öğün öğeleri.",
      items: {
        type: "object",
        properties: {
          day_of_week: {
            type: "integer",
            description: "0=Pazartesi ... 6=Pazar",
          },
          meal_type: {
            type: "string",
            enum: [
              "breakfast",
              "snack_morning",
              "lunch",
              "snack_afternoon",
              "dinner",
            ],
          },
          item: {
            type: "string",
            description: "Tek bir yiyecek, miktarıyla. Örn: '5 siyah zeytin'",
          },
          calories: { type: "integer", description: "Bu öğenin kalorisi" },
        },
        required: ["day_of_week", "meal_type", "item", "calories"],
      },
    },
  },
  required: ["meals"],
};

/**
 * Claude'dan tool-use ile YAPILANDIRILMIŞ 7 günlük diyet planı üretir.
 * Her öğe miktarıyla ve kalorisiyle gelir; günlük toplam hedefe yakın olur.
 */
export async function generatePlanMeals(params: {
  dietitianRules: string | null;
  dailyTarget: number;
  intakeSummary: string;
  weekNote?: string;
}): Promise<GeneratedMeal[]> {
  const system = buildSystemPrompt(params.dietitianRules);

  const prompt = `Aşağıdaki kişi için 7 günlük (day_of_week: 0=Pazartesi ... 6=Pazar) Türk mutfağına uygun, dengeli bir diyet programı oluştur.

- Her gün 5 öğün olmalı: breakfast, snack_morning, lunch, snack_afternoon, dinner.
- Her öğün için 1-3 yiyecek öğesi ver. Her öğeyi MİKTARIYLA yaz (örn. "2 haşlanmış yumurta", "5 siyah zeytin", "1 dilim tam buğday ekmeği").
- Her öğenin tahmini kalorisini ekle.
- Günlük toplam kalori YAKLAŞIK ${params.dailyTarget} kcal olmalı (±100).
- ÇOK ÖNEMLİ: 7 günün HER BİRİ BİRBİRİNDEN FARKLI olsun. Aynı öğünü/menüyü iki güne KOYMA; malzeme, pişirme ve öğünleri günden güne değiştir.
${params.weekNote ? `- ${params.weekNote}\n` : ""}
Kişi bilgisi: ${params.intakeSummary}

Planı yalnızca save_diet_plan aracını çağırarak döndür.`;

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 8000,
    system: [
      { type: "text", text: system, cache_control: { type: "ephemeral" } },
    ],
    tools: [
      {
        name: "save_diet_plan",
        description: "Oluşturulan diyet planının tüm öğünlerini kaydeder.",
        input_schema: INPUT_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "save_diet_plan" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Plan üretilemedi.");
  }

  return planSchema.parse(toolUse.input).meals;
}

/** Maliyet/süre dengesi için üretilen farklı hafta sayısı üst sınırı. */
export const MAX_PLAN_WEEKS = 4;

/**
 * Hedef süreye göre BİRBİRİNDEN FARKLI haftalık programlar üretir (paralel).
 * numWeeks 1..MAX_PLAN_WEEKS arasına çekilir; plan bu haftaları hedef süre
 * boyunca döngüyle yayar. Dizinin her elemanı bir haftanın öğünleridir.
 */
export async function generateWeeklyPrograms(params: {
  dietitianRules: string | null;
  dailyTarget: number;
  intakeSummary: string;
  numWeeks: number;
}): Promise<GeneratedMeal[][]> {
  const n = Math.max(1, Math.min(MAX_PLAN_WEEKS, params.numWeeks));
  return Promise.all(
    Array.from({ length: n }, (_, i) =>
      generatePlanMeals({
        dietitianRules: params.dietitianRules,
        dailyTarget: params.dailyTarget,
        intakeSummary: params.intakeSummary,
        weekNote: `Bu, ${n} haftalık programın ${i + 1}. haftası. Diğer haftalardan TAMAMEN farklı menüler kur (hiç tekrar olmasın).`,
      }),
    ),
  );
}
