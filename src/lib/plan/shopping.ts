/** Alışveriş listesi kaç günü kapsayabilir. */
export const SHOPPING_DAY_OPTIONS = [3, 7] as const;
export type ShoppingDays = (typeof SHOPPING_DAY_OPTIONS)[number];

/**
 * Bugünden başlayarak `days` günün plan slotlarını döndürür. Çok haftalık
 * döngüde Pazar'dan sonra sonraki haftaya, son haftadan sonra başa döner.
 * day: 0=Pazartesi ... 6=Pazar (bkz. lib/diet DAYS).
 */
export function shoppingSlots(
  currentWeek: number,
  todayIdx: number,
  weekCount: number,
  days: number,
): { week: number; day: number }[] {
  const weeks = Math.max(1, weekCount);
  return Array.from({ length: days }, (_, i) => {
    const offset = todayIdx + i;
    return {
      week: (currentWeek + Math.floor(offset / 7)) % weeks,
      day: offset % 7,
    };
  });
}

/** "16–18 Eki" / "29 Eki – 4 Kas" */
export function shoppingRangeLabel(from: Date, days: number): string {
  const to = new Date(from.getTime() + (days - 1) * 86_400_000);
  const month = (d: Date) =>
    d.toLocaleDateString("tr-TR", {
      month: "short",
      timeZone: "Europe/Istanbul",
    });
  const day = (d: Date) =>
    d.toLocaleDateString("tr-TR", {
      day: "numeric",
      timeZone: "Europe/Istanbul",
    });
  return month(from) === month(to)
    ? `${day(from)}–${day(to)} ${month(to)}`
    : `${day(from)} ${month(from)} – ${day(to)} ${month(to)}`;
}
