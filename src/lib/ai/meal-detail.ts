import type AnthropicNS from "@anthropic-ai/sdk";

import { anthropic } from "./client";

export type MealDetail = {
  protein_g: number;
  carb_g: number;
  fat_g: number;
  recipe: string;
  tip: string;
};

const SCHEMA: AnthropicNS.Tool.InputSchema = {
  type: "object",
  properties: {
    protein_g: { type: "number", description: "Protein (gram)" },
    carb_g: { type: "number", description: "Karbonhidrat (gram)" },
    fat_g: { type: "number", description: "Yağ (gram)" },
    recipe: {
      type: "string",
      description:
        "Bu öğünün kısa, pratik hazırlanışı (2-4 cümle ya da kısa adımlar). Hazır/çiğ bir besinse nasıl tüketileceğine dair kısa öneri.",
    },
    tip: {
      type: "string",
      description: "Tek cümlelik kısa, faydalı bir beslenme ipucu.",
    },
  },
  required: ["protein_g", "carb_g", "fat_g", "recipe", "tip"],
};

/**
 * Bir öğün öğesi için makro besin değerleri + kısa hazırlanış/ipucu üretir.
 * Ucuz model (haiku) kullanır; sonuç çağıran tarafından meals'e cache'lenir.
 */
export async function generateMealDetail(params: {
  item: string;
  calories: number;
}): Promise<MealDetail> {
  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 700,
    tools: [
      {
        name: "meal_detail",
        description: "Öğünün makro besin değerlerini ve kısa hazırlanışını verir.",
        input_schema: SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "meal_detail" },
    messages: [
      {
        role: "user",
        content: `Şu öğün öğesi için makro besin değerlerini (protein/karbonhidrat/yağ, gram) ve kısa bir hazırlanış (tarif) + tek cümle ipucu ver. Makrolar yaklaşık ${params.calories} kcal ile tutarlı olsun (protein 4, karbonhidrat 4, yağ 9 kcal/g). Türkçe yaz.\n\nÖğün: "${params.item}"`,
      },
    ],
  });
  const tool = res.content.find((b) => b.type === "tool_use");
  if (tool?.type !== "tool_use") throw new Error("Detay üretilemedi.");
  const i = tool.input as Partial<MealDetail>;
  return {
    protein_g: Math.max(0, Math.round((i.protein_g ?? 0) * 10) / 10),
    carb_g: Math.max(0, Math.round((i.carb_g ?? 0) * 10) / 10),
    fat_g: Math.max(0, Math.round((i.fat_g ?? 0) * 10) / 10),
    recipe: (i.recipe ?? "").slice(0, 1000),
    tip: (i.tip ?? "").slice(0, 300),
  };
}
