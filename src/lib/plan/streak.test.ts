import { describe, expect, it } from "vitest";

import { computeStreak, last7Days, slotDate } from "./streak";

describe("slotDate", () => {
  // 2026-06-21 Pazar (todayIdx=6), içinde bulunulan hafta = 2.
  const today = "2026-06-21";
  const todayIdx = 6;
  const anchor = 2;

  it("bugüne denk gelir (anchor hafta + bugün)", () => {
    expect(slotDate(today, todayIdx, anchor, anchor, 6)).toBe("2026-06-21");
  });
  it("dünü doğru verir", () => {
    expect(slotDate(today, todayIdx, anchor, anchor, 5)).toBe("2026-06-20");
  });
  it("bu haftanın Pazartesisi", () => {
    expect(slotDate(today, todayIdx, anchor, anchor, 0)).toBe("2026-06-15");
  });
  it("gelecek haftanın aynı günü +7", () => {
    expect(slotDate(today, todayIdx, anchor, anchor + 1, 6)).toBe("2026-06-28");
  });
  it("önceki haftanın aynı günü -7", () => {
    expect(slotDate(today, todayIdx, anchor, anchor - 1, 6)).toBe("2026-06-14");
  });
});

describe("computeStreak", () => {
  const today = "2026-06-21";

  it("hiç kayıt yoksa 0", () => {
    expect(computeStreak(new Set(), today)).toBe(0);
  });
  it("yalnızca bugün → 1", () => {
    expect(computeStreak(new Set(["2026-06-21"]), today)).toBe(1);
  });
  it("üst üste 3 gün (bugün dahil) → 3", () => {
    const s = new Set(["2026-06-19", "2026-06-20", "2026-06-21"]);
    expect(computeStreak(s, today)).toBe(3);
  });
  it("bugün boş ama dün aktif → seri kopmaz (dünden sayar)", () => {
    const s = new Set(["2026-06-19", "2026-06-20"]);
    expect(computeStreak(s, today)).toBe(2);
  });
  it("aradaki boşluk seriyi keser", () => {
    // bugün + dün var, 2 gün önce yok → 2
    const s = new Set(["2026-06-21", "2026-06-20", "2026-06-18"]);
    expect(computeStreak(s, today)).toBe(2);
  });
  it("bugün ve dün boşsa → 0 (eski günler sayılmaz)", () => {
    const s = new Set(["2026-06-18", "2026-06-17"]);
    expect(computeStreak(s, today)).toBe(0);
  });
});

describe("last7Days", () => {
  const today = "2026-06-21";

  it("7 gün döndürür, sonuncusu bugün", () => {
    const days = last7Days(new Set(), today);
    expect(days).toHaveLength(7);
    expect(days[6].isToday).toBe(true);
    expect(days.slice(0, 6).every((d) => !d.isToday)).toBe(true);
  });
  it("aktif günleri doğru işaretler", () => {
    const days = last7Days(new Set(["2026-06-21", "2026-06-18"]), today);
    expect(days[6].active).toBe(true); // bugün
    expect(days[3].active).toBe(true); // 18'i (6-3=3 gün önce)
    expect(days[5].active).toBe(false); // dün
  });
  it("bugünün etiketi Pazar (Pz)", () => {
    const days = last7Days(new Set(), today);
    expect(days[6].label).toBe("Pz");
  });
});
