import { describe, expect, it } from "vitest";

import { shoppingRangeLabel, shoppingSlots } from "@/lib/plan/shopping";

describe("shoppingSlots", () => {
  it("tek haftalık planda Pazar'dan sonra Pazartesi'ye döner", () => {
    expect(shoppingSlots(0, 5, 1, 3)).toEqual([
      { week: 0, day: 5 },
      { week: 0, day: 6 },
      { week: 0, day: 0 },
    ]);
  });

  it("çok haftalık döngüde sonraki haftaya, sondan sonra başa geçer", () => {
    const slots = shoppingSlots(1, 4, 2, 7);
    expect(slots[0]).toEqual({ week: 1, day: 4 });
    expect(slots[2]).toEqual({ week: 1, day: 6 });
    expect(slots[3]).toEqual({ week: 0, day: 0 });
    expect(slots).toHaveLength(7);
  });
});

describe("shoppingRangeLabel", () => {
  it("aynı ayda tek ay adı yazar", () => {
    expect(shoppingRangeLabel(new Date("2026-10-16T09:00:00Z"), 3)).toBe(
      "16–18 Eki",
    );
  });
  it("ay değişince iki ay adı yazar", () => {
    expect(shoppingRangeLabel(new Date("2026-10-29T09:00:00Z"), 7)).toBe(
      "29 Eki – 4 Kas",
    );
  });
});
