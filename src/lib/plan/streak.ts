// Plan takip serisi (streak) ve takvim-eşleme yardımcıları — SAF fonksiyonlar.
// React'ten bağımsız tutulur ki birim testlenebilsin (bkz. streak.test.ts).

function shiftDate(todayDate: string, offset: number): string {
  const [y, m, d] = todayDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + offset * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * (hafta, gün) program slotunu gerçek takvim tarihine (yyyy-mm-dd) eşler.
 * Anchor: anchorWeek = içinde bulunulan takvim haftası, todayIdx = bugün
 * (0=Pzt..6=Paz) → (anchorWeek, todayIdx) bugüne denk gelir. TZ-güvenli (UTC).
 */
export function slotDate(
  todayDate: string,
  todayIdx: number,
  anchorWeek: number,
  week: number,
  day: number,
): string {
  return shiftDate(todayDate, (week - anchorWeek) * 7 + day - todayIdx);
}

/**
 * Bugün (varsa) ya da dünden geriye doğru kesintisiz "aktif" gün sayısı.
 * Bugün henüz aktif değilse seri kopmaz: dün aktifse oradan sayılır.
 */
export function computeStreak(
  eatenDates: Set<string>,
  todayDate: string,
): number {
  const has = (o: number) => eatenDates.has(shiftDate(todayDate, o));
  const start = has(0) ? 0 : has(-1) ? -1 : null;
  if (start === null) return 0;
  let streak = 0;
  let o = start;
  while (has(o)) {
    streak += 1;
    o -= 1;
  }
  return streak;
}

const DOW = ["Pz", "Pt", "Sa", "Ça", "Pe", "Cu", "Ct"];

export type StreakDay = { active: boolean; isToday: boolean; label: string };

/** Bugünle biten son 7 günün aktiflik şeridi (en eski → en yeni). */
export function last7Days(
  eatenDates: Set<string>,
  todayDate: string,
): StreakDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const offset = -(6 - i);
    const key = shiftDate(todayDate, offset);
    return {
      active: eatenDates.has(key),
      isToday: offset === 0,
      label: DOW[new Date(key + "T00:00:00Z").getUTCDay()],
    };
  });
}
