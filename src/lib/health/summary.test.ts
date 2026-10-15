import { describe, expect, it } from "vitest";

import {
  istanbulDay,
  lastDays,
  summarizePeriod,
  type DayInput,
} from "@/lib/health/summary";

const day = (d: string, over: Partial<DayInput> = {}): DayInput => ({
  day: d,
  consumedKcal: null,
  steps: null,
  activeKcal: null,
  sleepMinutes: null,
  restingHr: null,
  ...over,
});

describe("lastDays", () => {
  it("bugün dahil geriye doğru, eskiden yeniye", () => {
    expect(lastDays("2026-10-02", 3)).toEqual([
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
  });
});

describe("istanbulDay", () => {
  it("UTC 22:30 İstanbul'da ertesi gündür", () => {
    expect(istanbulDay("2026-10-15T22:30:00Z")).toBe("2026-10-16");
  });
});

describe("summarizePeriod", () => {
  it("yenen kaloriyi yalnızca kayıtlı günlerden ortalar, net dengeyi ikisinin olduğu günlerden", () => {
    const s = summarizePeriod(
      [
        day("2026-10-10", { consumedKcal: 1400, activeKcal: 400, steps: 8000 }),
        day("2026-10-11", {
          consumedKcal: 1600,
          activeKcal: null,
          steps: 4000,
        }),
        day("2026-10-12", { activeKcal: 300, steps: 6000 }),
      ],
      [],
      [],
      1500,
    );
    expect(s.loggedDays).toBe(2);
    expect(s.avgConsumed).toBe(1500);
    expect(s.avgNet).toBe(1000);
    expect(s.avgActive).toBe(350);
    expect(s.avgSteps).toBe(6000);
    expect(s.hasHealthData).toBe(true);
  });

  it("antrenman ya da 7.000+ adımlı günleri aktif sayar, dönem dışı antrenmanı saymaz", () => {
    const s = summarizePeriod(
      [
        day("2026-10-10", { steps: 9000 }),
        day("2026-10-11"),
        day("2026-10-12"),
      ],
      [
        { day: "2026-10-11", minutes: 30, kcal: 200, source: "health" },
        { day: "2026-10-11", minutes: 20, kcal: null, source: "app" },
        { day: "2026-10-01", minutes: 60, kcal: 500, source: "health" },
      ],
      [],
      null,
    );
    expect(s.workoutCount).toBe(2);
    expect(s.workoutMinutes).toBe(50);
    expect(s.activeDays).toBe(2);
  });

  it("kilo değişimi dönemin ilk ve son tartısından", () => {
    const s = summarizePeriod(
      [day("2026-10-10"), day("2026-10-11"), day("2026-10-12")],
      [],
      [
        { day: "2026-10-12", kg: 71.2 },
        { day: "2026-10-10", kg: 72.5 },
        { day: "2026-09-01", kg: 80 },
      ],
      null,
    );
    expect(s.weightStart).toBe(72.5);
    expect(s.weightEnd).toBe(71.2);
    expect(s.weightDelta).toBe(-1.3);
  });

  it("veri yoksa ortalamalar null", () => {
    const s = summarizePeriod([day("2026-10-10")], [], [], null);
    expect(s.avgConsumed).toBeNull();
    expect(s.avgSleepHours).toBeNull();
    expect(s.weightDelta).toBeNull();
    expect(s.hasHealthData).toBe(false);
  });
});
