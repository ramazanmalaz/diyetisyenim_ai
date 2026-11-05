import type AnthropicNS from "@anthropic-ai/sdk";
import { z } from "zod";

import { enrichMealsWithUsda } from "@/lib/foods/usda";

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

  const lo = Math.round(params.dailyTarget * 0.95);
  const hi = Math.round(params.dailyTarget * 1.05);

  const prompt = `Aşağıdaki kişi için 7 günlük Türk mutfağına uygun dengeli diyet planı oluştur.

KURALLAR:
- Her gün TAM OLARAK 5 kayıt: breakfast, snack_morning, lunch, snack_afternoon, dinner.
- Her kayıt = 1 satır. "item" alanına TÜM öğün içeriğini tek cümlede yaz: miktar + besin (örn. "2 yumurta + 1 dilim tam buğday ekmeği + 5 zeytin").
- "calories" = o öğünün TOPLAM kalorisi (gerçekçi, porsiyona uygun).
- Günlük toplam ${lo}–${hi} kcal bandında olmalı (hedef ${params.dailyTarget} kcal).
- 7 günün her biri birbirinden FARKLI olsun; tekrar yok.
${params.weekNote ? `- ${params.weekNote}\n` : ""}
Kişi: ${params.intakeSummary}

Yalnızca save_diet_plan aracını çağır.`;

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 3500,
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

  if (response.stop_reason === "max_tokens") {
    throw new Error("Yanıt token limitinde kesildi — max_tokens artırılmalı.");
  }

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Plan üretilemedi.");
  }

  const meals = planSchema.parse(toolUse.input).meals;
  // Standart gıdaların kalorisini USDA ile doğrula/güncelle (best-effort).
  const enriched = await enrichMealsWithUsda(meals);
  return splitMealsIntoFoods(enriched);
}

const splitSchema = z.object({
  meals: z.array(
    z.object({
      index: z.number().int().min(0),
      foods: z
        .array(
          z.object({
            item: z.string().min(1).max(200),
            calories: z.number().int().min(0).max(3000),
          }),
        )
        .min(1)
        .max(8),
    }),
  ),
});

const SPLIT_SCHEMA: AnthropicNS.Tool.InputSchema = {
  type: "object",
  properties: {
    meals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer", description: "Öğünün listedeki sırası" },
          foods: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item: { type: "string", description: "Tek besin, miktarıyla" },
                calories: { type: "integer" },
              },
              required: ["item", "calories"],
            },
          },
        },
        required: ["index", "foods"],
      },
    },
  },
  required: ["meals"],
};

/**
 * Plan önce öğün başına tek kayıt ("2 yumurta + 5 zeytin + …") üretilir: AI
 * 35 öğün kalorisini toplarken hedefi tutturur, 100+ ayrı besinde ise belirgin
 * şekilde eksik toplar. Sonra her öğün besinlerine bölünür ki kullanıcı tek tek
 * işaretleyip değiştirebilsin; öğün toplamı birebir korunur. Bölünemeyen gün
 * olduğu gibi kalır (plan ekranı "+"lı öğünü yine alt alta gösterir).
 */
async function splitMealsIntoFoods(
  meals: GeneratedMeal[],
): Promise<GeneratedMeal[]> {
  const days = [0, 1, 2, 3, 4, 5, 6].map((d) =>
    meals.filter((m) => m.day_of_week === d),
  );
  const split = await Promise.all(
    days.map(async (dayMeals) => {
      if (!dayMeals.some((m) => m.item.includes("+"))) return dayMeals;
      try {
        return await splitDay(dayMeals);
      } catch (e) {
        console.error(
          "[plan] öğünler besinlere bölünemedi:",
          e instanceof Error ? e.message : e,
        );
        return dayMeals;
      }
    }),
  );
  return split.flat();
}

async function splitDay(dayMeals: GeneratedMeal[]): Promise<GeneratedMeal[]> {
  const list = dayMeals
    .map((m, i) => `${i} | ${m.calories} kcal | ${m.item}`)
    .join("\n");

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    tools: [
      {
        name: "save_foods",
        description: "Besinlerine ayrılmış öğünleri kaydeder.",
        input_schema: SPLIT_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "save_foods" },
    messages: [
      {
        role: "user",
        content: `Her satır bir öğün: "sıra | toplam kcal | içerik". Her öğünü "+" işaretlerinden tek tek besinlere ayır.
- Metni değiştirme, yalnızca böl; her besin miktarıyla kalsın. Parantez içi açıklamalar ait olduğu besinde kalsın.
- Her besine gerçekçi kalori ver; bir öğündeki besinlerin toplamı o öğünün toplamına TAM EŞİT olsun.
- Tüm sıraları döndür.

${list}`,
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (response.stop_reason === "max_tokens" || toolUse?.type !== "tool_use") {
    throw new Error("Bölme yanıtı eksik.");
  }
  const byIndex = new Map(
    splitSchema.parse(toolUse.input).meals.map((m) => [m.index, m.foods]),
  );

  return dayMeals.flatMap((meal, i) => {
    const foods = byIndex.get(i);
    if (!foods) return [meal];
    const out = foods.map((f) => ({ ...meal, item: f.item, calories: f.calories }));
    // Yuvarlama farkını en büyük besine yükle: öğün toplamı değişmesin.
    const diff = meal.calories - out.reduce((s, f) => s + f.calories, 0);
    if (diff !== 0) {
      const biggest = out.reduce((b, f) => (f.calories > b.calories ? f : b));
      biggest.calories = Math.max(0, biggest.calories + diff);
    }
    return out;
  });
}

/**
 * Çeşitlilik için üretilen FARKLI hafta sayısı. Hedef daha uzun sürse bile plan
 * ekranı bu haftaları döngüleyerek yayar (weeksSinceStart % weekCount). Az tutmak
 * onboarding'i HIZLI ve GÜVENİLİR kılar: tek paralel grup → Vercel 60sn'yi aşmaz,
 * rate limit'e takılmaz. 4 hafta = 28 farklı günlük menü (aylık döngü).
 */
export const PLAN_VARIETY_WEEKS = 1;
/** Aynı anda üretilen hafta sayısı (tümü tek grupta paralel). */
const GEN_CONCURRENCY = 5;

/**
 * BİRBİRİNDEN FARKLI haftalık programlar üretir (en çok PLAN_VARIETY_WEEKS).
 * Tek paralel grupta üretilir; plan ekranı haftaları döngüyle yayar.
 */
export async function generateWeeklyPrograms(params: {
  dietitianRules: string | null;
  dailyTarget: number;
  intakeSummary: string;
  numWeeks: number;
}): Promise<GeneratedMeal[][]> {
  const n = Math.max(1, Math.min(PLAN_VARIETY_WEEKS, params.numWeeks));
  const out: GeneratedMeal[][] = [];
  for (let start = 0; start < n; start += GEN_CONCURRENCY) {
    const size = Math.min(GEN_CONCURRENCY, n - start);
    const batch = await Promise.all(
      Array.from({ length: size }, (_, j) => {
        const i = start + j;
        return generatePlanMeals({
          dietitianRules: params.dietitianRules,
          dailyTarget: params.dailyTarget,
          intakeSummary: params.intakeSummary,
          weekNote: `Bu, ${n} haftalık programın ${i + 1}. haftası. Diğer haftalardan TAMAMEN farklı menüler kur (hiç tekrar olmasın).`,
        });
      }),
    );
    out.push(...batch);
  }
  return out;
}
