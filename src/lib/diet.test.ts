import { describe, expect, it } from "vitest";

import {
  DAYS,
  MEAL_TYPES,
  PLAN_STATUS_LABEL,
  mealTypeLabel,
  mealTypeOrder,
} from "@/lib/diet";

describe("diet sabitleri", () => {
  it("öğün tiplerini Türkçe etiketler", () => {
    expect(mealTypeLabel("breakfast")).toBe("Kahvaltı");
    expect(mealTypeLabel("dinner")).toBe("Akşam");
  });

  it("öğünleri kronolojik sıralar", () => {
    expect(mealTypeOrder("breakfast")).toBe(0);
    expect(mealTypeOrder("dinner")).toBe(MEAL_TYPES.length - 1);
    expect(mealTypeOrder("breakfast")).toBeLessThan(mealTypeOrder("lunch"));
  });

  it("haftayı Pazartesi'den başlatır ve 7 gün içerir", () => {
    expect(DAYS).toHaveLength(7);
    expect(DAYS[0]).toBe("Pazartesi");
    expect(DAYS[6]).toBe("Pazar");
  });

  it("plan durumlarını etiketler", () => {
    expect(PLAN_STATUS_LABEL.active).toBe("Aktif");
    expect(PLAN_STATUS_LABEL.draft).toBe("Taslak");
  });
});
