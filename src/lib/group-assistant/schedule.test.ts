import { describe, expect, it } from "vitest";

import {
  computeWeighResults,
  dueKinds,
  istanbulNow,
  nudgeMessage,
  templateFor,
  weighResultsMessage,
} from "@/lib/group-assistant/schedule";

const TUESDAY = 2;

describe("istanbulNow", () => {
  it("UTC'yi İstanbul saatine çevirir (gece yarısı gün değişir)", () => {
    const now = istanbulNow(new Date("2026-10-13T22:30:00Z"));
    expect(now).toEqual({ date: "2026-10-14", hhmm: "01:30", dow: 3 });
  });
});

describe("dueKinds", () => {
  const at = (dow: number, hhmm: string) => ({ date: "2026-10-14", hhmm, dow });

  it("sıradan bir günde sabah, su, yoklama ve akşam mesajı atar", () => {
    expect(dueKinds(at(3, "09:00"), TUESDAY)).toEqual(["morning"]);
    expect(dueKinds(at(3, "14:00"), TUESDAY)).toEqual(["water_call"]);
    expect(dueKinds(at(3, "17:00"), TUESDAY)).toEqual(["nudge"]);
    expect(dueKinds(at(3, "19:00"), TUESDAY)).toEqual(["dinner_call"]);
    expect(dueKinds(at(3, "10:00"), TUESDAY)).toEqual([]);
  });

  it("Cumartesi hafta sonu uyarısı, Pazartesi haftaya başlangıç", () => {
    expect(dueKinds(at(6, "09:00"), TUESDAY)).toEqual(["weekend_warning"]);
    expect(dueKinds(at(1, "09:00"), TUESDAY)).toEqual(["week_start"]);
  });

  it("tartı günü çağrı + öğlen sonuç, akşamüstü yoklaması yok", () => {
    expect(dueKinds(at(2, "09:00"), TUESDAY)).toEqual(["weigh_call"]);
    expect(dueKinds(at(2, "12:00"), TUESDAY)).toEqual(["weigh_results"]);
    expect(dueKinds(at(2, "17:00"), TUESDAY)).toEqual([]);
  });

  it("tartıdan önceki akşam hatırlatma", () => {
    expect(dueKinds(at(1, "19:30"), TUESDAY)).toEqual(["weigh_reminder"]);
  });

  it("Pazar sessiz; ama tartı Pazartesiyse Pazar akşamı hatırlatma yine gider", () => {
    expect(dueKinds(at(0, "09:00"), TUESDAY)).toEqual([]);
    expect(dueKinds(at(0, "14:00"), TUESDAY)).toEqual([]);
    expect(dueKinds(at(0, "19:30"), 1)).toEqual(["weigh_reminder"]);
  });
});

describe("şablonlar", () => {
  it("aynı gün aynı varyantı seçer", () => {
    expect(templateFor("water_call", "2026-10-14")).toBe(
      templateFor("water_call", "2026-10-14"),
    );
  });

  it("yoklamada kimse sessiz değilse mesaj yok", () => {
    expect(nudgeMessage([], "2026-10-14")).toBeNull();
    expect(nudgeMessage(["Ayşe", "Elif"], "2026-10-14")).toMatch(/^@Ayşe @Elif /);
  });
});

describe("tartı sıralaması", () => {
  const members = [
    { id: "a", name: "Ayşe" },
    { id: "b", name: "Elif" },
    { id: "c", name: "Zehra" },
  ];

  it("programın ilk tartısından bugüne toplam değişimi büyükten küçüğe sıralar", () => {
    const result = computeWeighResults(
      members,
      [
        { client_id: "a", date: "2026-10-06", weight_kg: 70 },
        { client_id: "a", date: "2026-10-13", weight_kg: 68.2 },
        { client_id: "a", date: "2026-10-20", weight_kg: 67.05 },
        { client_id: "b", date: "2026-10-06", weight_kg: 88.8 },
        { client_id: "b", date: "2026-10-20", weight_kg: 84.5 },
        { client_id: "c", date: "2026-10-06", weight_kg: 71.8 },
      ],
      "2026-10-20",
    );
    expect(result.ranked.map((r) => [r.name, r.delta])).toEqual([
      ["Elif", -4.3],
      ["Ayşe", -3],
    ]);
    expect(result.missing.map((m) => m.name)).toEqual(["Zehra"]);
  });

  it("dün akşam/sabah erken yazılan tartıyı da sayar", () => {
    const result = computeWeighResults(
      [members[0]],
      [
        { client_id: "a", date: "2026-10-06", weight_kg: 70 },
        { client_id: "a", date: "2026-10-19", weight_kg: 69 },
      ],
      "2026-10-20",
    );
    expect(result.ranked[0].delta).toBe(-1);
  });

  it("mesaj sıralama, normalleştirme, ödül ve eksikleri içerir", () => {
    const text = weighResultsMessage({
      ranked: [{ id: "b", name: "Elif", start: 88.8, current: 84.5, delta: -4.3 }],
      missing: [{ id: "c", name: "Zehra" }],
    });
    expect(text).toContain("Elif 👉🏻 -4.3 kg");
    expect(text).toContain("Regl veya kabızlık");
    expect(text).toContain("ödül hakkı");
    expect(text).toContain("@Zehra");
  });

  it("kilo alana utandırmadan + gösterir", () => {
    const text = weighResultsMessage({
      ranked: [{ id: "c", name: "Zehra", start: 71.8, current: 72.8, delta: 1 }],
      missing: [],
    });
    expect(text).toContain("Zehra 👉🏻 +1 kg");
  });
});
