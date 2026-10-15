"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  buildShoppingList,
  shoppingItemTitle,
  sortShoppingItems,
} from "@/lib/ai/shopping";
import { getUser } from "@/lib/auth";
import { DAYS, mealTypeLabel, mealTypeOrder } from "@/lib/diet";
import { consumeAiCredit } from "@/lib/entitlements";
import { istanbulNow } from "@/lib/group-assistant/schedule";
import {
  SHOPPING_DAY_OPTIONS,
  shoppingRangeLabel,
  shoppingSlots,
} from "@/lib/plan/shopping";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  days: z.coerce
    .number()
    .refine((d) => (SHOPPING_DAY_OPTIONS as readonly number[]).includes(d)),
});

export type ShoppingActionResult =
  | { error: string }
  | { quota: true }
  | { ok: true; listId: string; count: number };

/**
 * Aktif plandan bugünden itibaren `days` günün alışveriş listesini çıkarır ve
 * Hatırlatıcı'ya yeni bir liste olarak ekler. Kullanıcı tetikler.
 */
export async function exportShoppingList(
  values: unknown,
): Promise<ShoppingActionResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { error: "Geçersiz gün sayısı." };
  const days = parsed.data.days;

  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("diet_plans")
    .select("id, valid_from")
    .eq("client_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan) return { error: "Aktif bir diyet planın yok." };

  const { data: meals } = await supabase
    .from("meals")
    .select("week_index, day_of_week, meal_type, content")
    .eq("plan_id", plan.id);
  if (!meals || meals.length === 0) {
    return { error: "Planında henüz öğün yok." };
  }

  // Plan sayfasıyla aynı hafta hesabı (bkz. plan/page.tsx).
  const weekCount = Math.max(
    1,
    meals.reduce((mx, m) => Math.max(mx, (m.week_index ?? 0) + 1), 1),
  );
  const nowMs = Date.now();
  const startMs = plan.valid_from ? new Date(plan.valid_from).getTime() : nowMs;
  const currentWeek =
    Math.max(0, Math.floor((nowMs - startMs) / (7 * 86_400_000))) % weekCount;
  const todayIdx = (istanbulNow().dow + 6) % 7;

  const slots = shoppingSlots(currentWeek, todayIdx, weekCount, days);
  const lines: string[] = [];
  for (const slot of slots) {
    const dayMeals = meals
      .filter(
        (m) => (m.week_index ?? 0) === slot.week && m.day_of_week === slot.day,
      )
      .sort((a, b) => mealTypeOrder(a.meal_type) - mealTypeOrder(b.meal_type));
    if (dayMeals.length === 0) continue;
    lines.push(`## ${DAYS[slot.day]}`);
    for (const m of dayMeals) {
      lines.push(`- ${mealTypeLabel(m.meal_type)}: ${m.content}`);
    }
  }
  if (lines.length === 0) {
    return { error: "Bu günler için planında öğün bulunamadı." };
  }

  const credit = await consumeAiCredit(user.id, "chat");
  if (!credit.ok) return { quota: true };

  let items;
  try {
    items = sortShoppingItems(
      await buildShoppingList(
        `# ${days} günlük diyet planı (alışveriş bu günler için)\n\n${lines.join("\n")}`,
      ),
    );
  } catch (err) {
    console.error("[alisveris] liste üretilemedi:", err);
    return { error: "Alışveriş listesi şu an hazırlanamadı, tekrar dene." };
  }
  if (items.length === 0) {
    return { error: "Planından alınacak malzeme çıkarılamadı." };
  }

  const { data: list, error: listError } = await supabase
    .from("reminder_lists")
    .insert({
      client_id: user.id,
      name: `Diyet alışverişi · ${shoppingRangeLabel(new Date(), days)}`,
      color: "green",
      icon: "cart",
      sort_order: Date.now() % 100000,
    })
    .select("id")
    .single();
  if (listError || !list)
    return { error: "Hatırlatıcı listesi oluşturulamadı." };

  // Hatırlatıcı ekranı listeyi created_at'e göre sıralıyor; reyon sırası
  // korunsun diye her ürüne 1 ms arayla artan zaman veriyoruz.
  const base = Date.now();
  const { error: itemsError } = await supabase.from("reminders").insert(
    items.map((item, i) => ({
      client_id: user.id,
      list_id: list.id,
      title: shoppingItemTitle(item),
      sort_order: i,
      created_at: new Date(base + i).toISOString(),
    })),
  );
  if (itemsError) {
    await supabase.from("reminder_lists").delete().eq("id", list.id);
    return { error: "Ürünler hatırlatıcıya eklenemedi." };
  }

  revalidatePath("/hatirlatici");
  return { ok: true, listId: list.id, count: items.length };
}
