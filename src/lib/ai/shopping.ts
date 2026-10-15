import type AnthropicNS from "@anthropic-ai/sdk";
import { z } from "zod";

import { anthropic, DEFAULT_MODEL } from "./client";

/**
 * Diyet planındaki öğünlerden alışveriş listesi çıkarır: malzemeleri ayıklar,
 * günler boyunca miktarları toplar, markette alınacak birimlere çevirir ve
 * reyonlara göre gruplar. Öğün içerikleri serbest metin olduğu için AI gerekli.
 */

export const SHOPPING_CATEGORIES = [
  { key: "vegetable", label: "Sebze", emoji: "🥬" },
  { key: "fruit", label: "Meyve", emoji: "🍎" },
  { key: "legume_grain", label: "Bakliyat & tahıl", emoji: "🫘" },
  { key: "bakery", label: "Ekmek & unlu", emoji: "🍞" },
  { key: "dairy_egg", label: "Kahvaltılık, süt & yumurta", emoji: "🧀" },
  { key: "meat_fish", label: "Et, tavuk & balık", emoji: "🍗" },
  { key: "nuts_dried", label: "Kuruyemiş & kuru meyve", emoji: "🥜" },
  { key: "oil_sauce", label: "Yağ, sos & baharat", emoji: "🫒" },
  { key: "drink", label: "İçecek", emoji: "🍵" },
  { key: "other", label: "Diğer", emoji: "🛒" },
] as const;

export type ShoppingCategory = (typeof SHOPPING_CATEGORIES)[number]["key"];

const CATEGORY_KEYS = SHOPPING_CATEGORIES.map((c) => c.key) as [
  ShoppingCategory,
  ...ShoppingCategory[],
];

const itemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  amount: z.string().trim().max(60),
  category: z.enum(CATEGORY_KEYS).catch("other"),
});

const listSchema = z.object({
  items: z.array(itemSchema).max(80),
});

export type ShoppingItem = z.infer<typeof itemSchema>;

const TOOL: AnthropicNS.Tool = {
  name: "save_shopping_list",
  description: "Plandan çıkarılan alışveriş listesini kaydeder.",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description:
                "Markette aranacak ürün adı: 'Domates', 'Lor peyniri', 'Kırmızı mercimek'",
            },
            amount: {
              type: "string",
              description:
                "Tüm günler için TOPLAM, markette alınacak birimle: '1 kg', '12 adet', '500 g', '1 demet', '1 paket'. Belirsizse kısa tahmin.",
            },
            category: { type: "string", enum: [...CATEGORY_KEYS] },
          },
          required: ["name", "amount", "category"],
        },
      },
    },
    required: ["items"],
  },
};

const SYSTEM = `Sen bir diyet planını market alışveriş listesine çeviren yardımcısın. Türkçe yazarsın.

Kurallar:
- Öğünlerdeki her yiyeceği malzemesine ayır. Hazır yemek adı geçiyorsa ("etli nohut", "sebze çorbası", "menemen") temel malzemelerini yaz (nohut, dana kuşbaşı, domates, soğan…).
- Aynı ürünü tek satırda topla ve tüm günlerin TOPLAM miktarını markette alınacak birime çevir: 14 yumurta → "15 adet" ya da "1 koli (15'li)"; 7 dilim peynir → "250 g"; 2 dilim ekmek × 7 → "1 paket tam buğday ekmeği".
- "Bol yeşillik", "salata" gibi ifadelerden makul sebzeler çıkar (marul, roka, maydanoz, salatalık, domates) ve miktarı günlere göre tahmin et.
- Seçenekli öğünlerde ("1. seçenek / 2. seçenek", "tavuk veya balık") her seçeneğin malzemesini yaz; miktarı seçenek sayısına bölüştür.
- Şunları YAZMA: su, ılık su, tuz, karabiber, pul biber gibi temel baharatlar, buz.
- Zeytinyağı, limon, sirke gibi kalıcı malzemeleri yalnızca planda gerçekten geçiyorsa ve küçük miktarla yaz ("1 şişe zeytinyağı (evde yoksa)").
- Zeytin, bal, pekmez, reçel gibi kahvaltılıklar dairy_egg; kakao, maya gibi ürünler other.
- Marka adı yazma. Uydurma ürün ekleme.
- Her zaman yalnızca save_shopping_list aracını çağır.`;

export async function buildShoppingList(
  planText: string,
): Promise<ShoppingItem[]> {
  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 3000,
    system: [
      { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    tools: [TOOL],
    tool_choice: { type: "tool", name: TOOL.name },
    messages: [
      {
        role: "user",
        content: `${planText}\n\nYalnızca save_shopping_list aracını çağır.`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Alışveriş listesi üretilemedi.");
  }
  return listSchema.parse(toolUse.input).items;
}

/** Reyon sırasına göre sıralar; reyon içinde ürün adına göre. */
export function sortShoppingItems(items: ShoppingItem[]): ShoppingItem[] {
  const order = new Map<string, number>(
    SHOPPING_CATEGORIES.map((c, i) => [c.key, i]),
  );
  return [...items].sort(
    (a, b) =>
      (order.get(a.category) ?? 99) - (order.get(b.category) ?? 99) ||
      a.name.localeCompare(b.name, "tr"),
  );
}

export function shoppingItemTitle(item: ShoppingItem): string {
  const emoji =
    SHOPPING_CATEGORIES.find((c) => c.key === item.category)?.emoji ?? "🛒";
  return item.amount
    ? `${emoji} ${item.name} · ${item.amount}`
    : `${emoji} ${item.name}`;
}
