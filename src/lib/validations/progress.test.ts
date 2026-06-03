import { describe, expect, it } from "vitest";

import { progressSchema } from "@/lib/validations/progress";

describe("progressSchema", () => {
  it("boş string'leri null'a çevirir", () => {
    const r = progressSchema.parse({
      entryDate: "2026-06-01",
      weightKg: "",
      waterMl: "",
      waistCm: "",
      hipCm: "",
      note: "",
    });
    expect(r.weightKg).toBeNull();
    expect(r.waterMl).toBeNull();
    expect(r.note).toBeNull();
  });

  it("geçerli sayıları ayrıştırır", () => {
    const r = progressSchema.parse({
      entryDate: "2026-06-01",
      weightKg: "72.5",
      waterMl: "2000",
      waistCm: "",
      hipCm: "",
      note: "iyi gidiyor",
    });
    expect(r.weightKg).toBe(72.5);
    expect(r.waterMl).toBe(2000);
    expect(r.note).toBe("iyi gidiyor");
  });

  it("tarih zorunludur", () => {
    expect(progressSchema.safeParse({ entryDate: "" }).success).toBe(false);
  });

  it("negatif kiloyu reddeder", () => {
    expect(
      progressSchema.safeParse({ entryDate: "2026-06-01", weightKg: "-5" })
        .success,
    ).toBe(false);
  });
});
