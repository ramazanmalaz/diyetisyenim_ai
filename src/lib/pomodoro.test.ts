import { describe, expect, it } from "vitest";

import {
  buildPhases,
  buildSchedule,
  DEFAULT_POMODORO_CONFIG,
  hhmmToMin,
  humanMinutes,
  minToHHMM,
  nextMode,
  resumeIndex,
} from "@/lib/pomodoro";

describe("zaman dönüşümleri", () => {
  it("HH:MM ↔ dakika çevirir", () => {
    expect(hhmmToMin("09:00")).toBe(540);
    expect(hhmmToMin("14:30")).toBe(870);
    expect(minToHHMM(540)).toBe("09:00");
    expect(minToHHMM(870)).toBe("14:30");
  });

  it("geçersiz saat için NaN döndürür", () => {
    expect(Number.isNaN(hhmmToMin("25:00"))).toBe(true);
    expect(Number.isNaN(hhmmToMin("abc"))).toBe(true);
  });
});

describe("buildSchedule", () => {
  it("pencereyi çalışma + mola seanslarına böler, sonda mola bırakmaz", () => {
    // 09:00–11:00 (120 dk), 25 dk çalışma + 5 dk mola
    const s = buildSchedule({
      startMin: 540,
      endMin: 660,
      workMin: 25,
      breakMin: 5,
    });
    // 25+5 = 30; 4 tam çalışma (100 dk) + 3 mola (15 dk) = 115 dk ≤ 120
    expect(s.workSessions).toBe(4);
    expect(s.totalWorkMin).toBe(100);
    expect(s.totalBreakMin).toBe(15);
    expect(s.segments[s.segments.length - 1].kind).toBe("work");
    expect(s.finishMin).toBe(655); // 540 + 115
  });

  it("mola 0 ise yalnızca çalışma seansları üretir", () => {
    const s = buildSchedule({
      startMin: 0,
      endMin: 100,
      workMin: 25,
      breakMin: 0,
    });
    expect(s.workSessions).toBe(4);
    expect(s.segments.every((seg) => seg.kind === "work")).toBe(true);
  });

  it("pencere bir seansa yetmezse boş plan döndürür", () => {
    const s = buildSchedule({
      startMin: 0,
      endMin: 20,
      workMin: 25,
      breakMin: 5,
    });
    expect(s.workSessions).toBe(0);
    expect(s.segments).toHaveLength(0);
  });
});

describe("resumeIndex", () => {
  const schedule = buildSchedule({
    startMin: 540,
    endMin: 660,
    workMin: 25,
    breakMin: 5,
  });

  it("tamamlanan seans yoksa baştan başlar", () => {
    expect(resumeIndex(schedule, 0)).toBe(0);
  });

  it("tamamlanan seanslardan sonraki çalışma segmentine atlar", () => {
    const idx = resumeIndex(schedule, 1);
    expect(schedule.segments[idx].kind).toBe("work");
    expect(schedule.segments[idx].session).toBe(2);
  });

  it("hepsi bittiyse segment sonunu döndürür", () => {
    expect(resumeIndex(schedule, schedule.workSessions)).toBe(
      schedule.segments.length,
    );
  });
});

describe("humanMinutes", () => {
  it("saat ve dakikayı okunaklı yazar", () => {
    expect(humanMinutes(25)).toBe("25 dk");
    expect(humanMinutes(60)).toBe("1 sa");
    expect(humanMinutes(115)).toBe("1 sa 55 dk");
  });
});

describe("buildPhases (klasik pomodoro)", () => {
  it("varsayılan: 4 odak + 3 kısa + 1 uzun = 8 faz", () => {
    const ph = buildPhases(DEFAULT_POMODORO_CONFIG);
    expect(ph).toHaveLength(8);
    expect(ph.filter((p) => p.kind === "focus")).toHaveLength(4);
    expect(ph.filter((p) => p.kind === "short")).toHaveLength(3);
    expect(ph.filter((p) => p.kind === "long")).toHaveLength(1);
    expect(ph[0]).toMatchObject({ kind: "focus", min: 25 });
    expect(ph[ph.length - 1]).toMatchObject({ kind: "long", min: 15 });
  });

  it("öğle arası 2. odaktan sonra eklenir", () => {
    const ph = buildPhases({
      ...DEFAULT_POMODORO_CONFIG,
      lunchEnabled: true,
      lunchAfter: 2,
      lunchMin: 45,
    });
    const lunch = ph.filter((p) => p.kind === "lunch");
    expect(lunch).toHaveLength(1);
    expect(lunch[0].min).toBe(45);
  });
});

describe("nextMode (geçiş mantığı)", () => {
  const c = DEFAULT_POMODORO_CONFIG;
  it("odak sonrası kısa mola (periyot katı değilse)", () => {
    expect(nextMode(c, "focus", 1)).toBe("short");
    expect(nextMode(c, "focus", 3)).toBe("short");
  });
  it("4. odaktan sonra uzun mola", () => {
    expect(nextMode(c, "focus", 4)).toBe("long");
    expect(nextMode(c, "focus", 8)).toBe("long");
  });
  it("mola sonrası odak", () => {
    expect(nextMode(c, "short", 2)).toBe("focus");
    expect(nextMode(c, "long", 4)).toBe("focus");
  });
  it("öğle arası açıksa ilgili odaktan sonra öğle", () => {
    const lc = { ...c, lunchEnabled: true, lunchAfter: 2 };
    expect(nextMode(lc, "focus", 2)).toBe("lunch");
  });
});
