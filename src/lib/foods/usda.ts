import "server-only";

import type AnthropicNS from "@anthropic-ai/sdk";

import { anthropic } from "@/lib/ai/client";

/**
 * USDA FoodData Central entegrasyonu.
 *
 * USDA verisi İNGİLİZCE ve 100 GRAM başınadır. Türkçe adlar doğrudan
 * eşleşmez ve USDA arama sonuçları gevşektir ("apple" -> "Rose-apples"),
 * bu yüzden naif "ilk sonuç" yanlış kalori verir. Yaklaşım:
 *  1) Terimi İngilizceye çevir (model).
 *  2) USDA'da ara, temiz genel veri için Foundation/SR Legacy; TOP adayları al.
 *  3) Doğru adayı MODELE seçtir (yanlış eşleşmeyi eler; uygun yoksa "yok" der).
 *
 * Anahtar yalnızca sunucuda (`USDA_API_KEY`). Limit ~3600 istek/saat; aynı süreç
 * içinde tekrar eden sorgular bellek-içi cache'lenir.
 */

const SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
const ENERGY_KCAL_NUTRIENT_ID = 1008;
const ENERGY_NUTRIENT_NUMBER = "208";
const HAIKU = "claude-haiku-4-5-20251001";
const MAX_CANDIDATES = 8;

export type UsdaCandidate = {
  fdcId: number;
  description: string;
  kcalPer100g: number;
};

type UsdaFoodNutrient = {
  nutrientId?: number;
  nutrientNumber?: string;
  unitName?: string;
  value?: number;
};
type UsdaFood = {
  fdcId: number;
  description: string;
  foodNutrients?: UsdaFoodNutrient[];
};

const candidateCache = new Map<string, UsdaCandidate[]>();
const translateCache = new Map<string, string>();

function kcalPer100g(food: UsdaFood): number | null {
  const n = food.foodNutrients?.find(
    (x) =>
      x.nutrientId === ENERGY_KCAL_NUTRIENT_ID ||
      (x.nutrientNumber === ENERGY_NUTRIENT_NUMBER &&
        (x.unitName ?? "").toUpperCase() === "KCAL"),
  );
  return typeof n?.value === "number" && n.value > 0 ? n.value : null;
}

/**
 * İngilizce bir terim için USDA'dan temiz genel adayları döndürür
 * (Foundation/SR Legacy; bulunamazsa Survey FNDDS). En fazla 8, tekilleştirilmiş.
 */
export async function searchUsdaCandidates(
  englishQuery: string,
): Promise<UsdaCandidate[]> {
  const q = englishQuery.trim().toLowerCase();
  const key = process.env.USDA_API_KEY;
  if (!q || !key) return [];
  if (candidateCache.has(q)) return candidateCache.get(q)!;

  for (const dataType of ["Foundation,SR Legacy", "Survey (FNDDS)"]) {
    const url = `${SEARCH_URL}?query=${encodeURIComponent(
      q,
    )}&dataType=${encodeURIComponent(dataType)}&pageSize=25&api_key=${key}`;
    let foods: UsdaFood[] = [];
    try {
      const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
      if (!res.ok) continue;
      foods = ((await res.json()) as { foods?: UsdaFood[] }).foods ?? [];
    } catch {
      continue;
    }
    const seen = new Set<string>();
    const out: UsdaCandidate[] = [];
    for (const f of foods) {
      const kcal = kcalPer100g(f);
      if (kcal == null) continue;
      const dk = f.description.toLowerCase();
      if (seen.has(dk)) continue;
      seen.add(dk);
      out.push({
        fdcId: f.fdcId,
        description: f.description,
        kcalPer100g: Math.round(kcal),
      });
      if (out.length >= MAX_CANDIDATES) break;
    }
    if (out.length > 0) {
      candidateCache.set(q, out);
      return out;
    }
  }
  candidateCache.set(q, []);
  return [];
}

const TRANSLATE_SCHEMA: AnthropicNS.Tool.InputSchema = {
  type: "object",
  properties: {
    english_term: {
      type: "string",
      description:
        "USDA'da aranacak kısa GENEL İngilizce gıda adı (markasız, miktarsız). Örn: 'beyaz peynir' -> 'feta cheese'.",
    },
    is_standard_food: {
      type: "boolean",
      description:
        "USDA'da bulunması muhtemel standart/basit bir gıda mı (true) yoksa karmaşık yöresel yemek mi (false)?",
    },
  },
  required: ["english_term", "is_standard_food"],
};

/**
 * Türkçe (ya da herhangi bir dildeki) gıda terimini USDA araması için kısa
 * İngilizce ada çevirir. Karmaşık yöresel yemekte boş string döner.
 */
export async function translateFoodTerm(term: string): Promise<string> {
  const t = term.trim();
  if (!t) return "";
  const ck = t.toLowerCase();
  if (translateCache.has(ck)) return translateCache.get(ck)!;
  try {
    const res = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 200,
      tools: [
        {
          name: "to_english",
          description: "Gıda adını USDA için İngilizceye çevirir.",
          input_schema: TRANSLATE_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: "to_english" },
      messages: [
        {
          role: "user",
          content: `Şu gıda adını USDA FoodData Central'da aranacak kısa, GENEL bir İngilizce gıda adına çevir: "${t}"`,
        },
      ],
    });
    const tool = res.content.find((b) => b.type === "tool_use");
    if (tool?.type !== "tool_use") return "";
    const input = tool.input as {
      english_term?: string;
      is_standard_food?: boolean;
    };
    const out = input.is_standard_food ? (input.english_term ?? "").trim() : "";
    translateCache.set(ck, out);
    return out;
  } catch {
    return "";
  }
}

/**
 * Food picker için: Türkçe terimi çevirir + USDA adaylarını döndürür.
 * 100 g başına kcal taşır; kullanıcı doğru olanı kendi seçer.
 */
export async function searchUsdaForPicker(
  term: string,
): Promise<UsdaCandidate[]> {
  const english = await translateFoodTerm(term);
  if (!english) return [];
  return searchUsdaCandidates(english);
}

// ---------------------------------------------------------------------------
// AI akışı zenginleştirme (best-effort): üretilen/okunan öğelerin kalorilerini
// USDA ile günceller. Adaylar modele seçtirilir (yanlış eşleşme elenir).
// ---------------------------------------------------------------------------

const MAP_SCHEMA: AnthropicNS.Tool.InputSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          i: { type: "integer", description: "Öğenin sırası (0-temelli)" },
          english_term: {
            type: "string",
            description:
              "USDA'da aranacak kısa genel İngilizce gıda adı (markasız). Karmaşık yemekse boş bırak.",
          },
          grams: {
            type: "integer",
            description:
              "Öğede tarif edilen porsiyonun toplam tahmini ağırlığı (gram). Örn '5 siyah zeytin' ~ 20 g.",
          },
          use_usda: {
            type: "boolean",
            description: "Standart/basit gıdaysa true; karmaşık/belirsizse false.",
          },
        },
        required: ["i", "english_term", "grams", "use_usda"],
      },
    },
  },
  required: ["items"],
};

const SELECT_SCHEMA: AnthropicNS.Tool.InputSchema = {
  type: "object",
  properties: {
    picks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          i: { type: "integer", description: "Öğenin sırası" },
          fdc_id: {
            type: "integer",
            description:
              "Öğeye en uygun adayın fdcId'si. Hiçbiri uygun değilse 0 ver.",
          },
        },
        required: ["i", "fdc_id"],
      },
    },
  },
  required: ["picks"],
};

type MealLike = { item: string; calories: number };

async function mapItems(
  meals: MealLike[],
): Promise<{ i: number; english_term: string; grams: number; use_usda: boolean }[]> {
  const list = meals.map((m, i) => `${i}: ${m.item}`).join("\n");
  const res = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 4096,
    tools: [
      {
        name: "map_foods",
        description: "Her öğeyi USDA için İngilizce ad + gram'a eşler.",
        input_schema: MAP_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "map_foods" },
    messages: [
      {
        role: "user",
        content: `Aşağıdaki Türkçe öğün öğelerini USDA araması için eşle. Her öğe için: kısa genel İngilizce gıda adı (markasız), porsiyonun toplam tahmini gramı ve USDA'da bulunma olasılığı yüksek standart bir gıdaysa use_usda=true. Karmaşık/yöresel hazır yemekler için use_usda=false.

Gram tahmininde gerçekçi ol (adet/dilim küçük gelir): 1 badem ~1.2 g, 1 zeytin ~4 g, 1 fındık ~1 g, 1 ceviz içi ~5 g, 1 dilim peynir ~25-30 g, 1 dilim ekmek ~25-35 g, 1 orta yumurta ~50 g, 1 orta elma ~180 g, 1 yemek kaşığı yağ ~14 g.

${list}`,
      },
    ],
  });
  const tool = res.content.find((b) => b.type === "tool_use");
  if (tool?.type !== "tool_use") return [];
  return (
    (tool.input as { items?: { i: number; english_term: string; grams: number; use_usda: boolean }[] }).items ?? []
  );
}

async function selectMatches(
  prompts: { i: number; item: string; candidates: UsdaCandidate[] }[],
): Promise<Map<number, number>> {
  const text = prompts
    .map(
      (p) =>
        `Öğe ${p.i}: "${p.item}"\n` +
        p.candidates
          .map((c) => `   [${c.fdcId}] ${c.description} (${c.kcalPer100g} kcal/100g)`)
          .join("\n"),
    )
    .join("\n\n");
  const res = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 2048,
    tools: [
      {
        name: "pick_matches",
        description: "Her öğe için en uygun USDA adayını seçer.",
        input_schema: SELECT_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "pick_matches" },
    messages: [
      {
        role: "user",
        content: `Her öğün öğesi için, gerçekten AYNI gıdayı temsil eden en uygun USDA adayını seç. Aday gerçekten o gıda değilse (örn. "elma" için "Rose-apples" ya da "kruvasan" uygun değil) fdc_id=0 ver. Taze/çiğ/sade genel formu tercih et.\n\n${text}`,
      },
    ],
  });
  const tool = res.content.find((b) => b.type === "tool_use");
  if (tool?.type !== "tool_use") return new Map();
  const picks = (tool.input as { picks?: { i: number; fdc_id: number }[] }).picks ?? [];
  return new Map(picks.map((p) => [p.i, p.fdc_id]));
}

/**
 * Öğün kalorilerini USDA ile günceller (best-effort). Map -> ara -> modele seçtir
 * -> `kcal = kcal/100 * gram`. Eşleşme yoksa AI'nın orijinal kalorisi korunur.
 * Hata akışı asla bozmaz (öğeleri değişmeden döndürür).
 */
export async function enrichMealsWithUsda<T extends MealLike>(
  meals: T[],
): Promise<T[]> {
  if (!process.env.USDA_API_KEY || meals.length === 0) return meals;
  try {
    const mapped = await mapItems(meals);
    const targets = mapped.filter(
      (m) => m.use_usda && m.english_term?.trim() && m.grams > 0,
    );
    if (targets.length === 0) return meals;

    // Benzersiz terimleri paralel ara.
    const uniqueTerms = [...new Set(targets.map((m) => m.english_term.trim().toLowerCase()))];
    const searched = await Promise.all(
      uniqueTerms.map(async (t) => [t, await searchUsdaCandidates(t)] as const),
    );
    const byTerm = new Map(searched);

    const selectPrompts = targets
      .map((m) => ({
        i: m.i,
        item: meals[m.i]?.item ?? "",
        candidates: byTerm.get(m.english_term.trim().toLowerCase()) ?? [],
      }))
      .filter((p) => p.candidates.length > 0 && p.item);
    if (selectPrompts.length === 0) return meals;

    const picks = await selectMatches(selectPrompts);

    const out = meals.map((m) => ({ ...m }));
    for (const m of targets) {
      const fdcId = picks.get(m.i);
      if (!fdcId) continue; // 0 = uygun yok
      const cand = (byTerm.get(m.english_term.trim().toLowerCase()) ?? []).find(
        (c) => c.fdcId === fdcId,
      );
      if (!cand) continue;
      if (m.i < 0 || m.i >= out.length) continue;
      const kcal = Math.round((cand.kcalPer100g * m.grams) / 100);
      const orig = out[m.i].calories;
      // Akıl sınırı: USDA sonucu (gram tahmini × 100g kalorisi) AI'nın orijinal
      // tahmininin 0.5×–2× bandı dışına düşüyorsa, gram/eşleşme hatası olasıdır;
      // AI'nın bağlamsal porsiyon tahminini koru. Aksi halde USDA ile güncelle.
      const inBand = orig > 0 ? kcal >= orig * 0.5 && kcal <= orig * 2 : true;
      if (kcal > 0 && kcal <= 3000 && inBand) {
        out[m.i].calories = kcal;
      }
    }
    return out;
  } catch {
    return meals;
  }
}
