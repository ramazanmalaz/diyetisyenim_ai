"use client";

import { registerPlugin } from "@capacitor/core";

import {
  getHealthWriteback,
  saveHealthSync,
} from "@/app/(app)/gelisim/actions";
import { isNative, nativePlatform } from "@/lib/native-push";
import { istanbulDay } from "@/lib/health/summary";
import type {
  HealthSyncInput,
  HealthWriteback,
} from "@/lib/validations/health";

/**
 * Apple Sağlık (HealthKit) köprüsü — yalnızca iOS uygulamasında çalışır.
 * Apple Watch verisi iPhone'daki Sağlık'a aktığı için ayrıca saat uygulaması
 * gerekmez. Okuma/izin @capgo/capacitor-health ile, "günün değerini değiştir"
 * yazması uygulamanın kendi UzmanHealth eklentisiyle (ios/App/App/AppDelegate.swift).
 */

type UzmanHealthPlugin = {
  replaceDailyValue(options: {
    kind: "dietaryEnergy" | "bodyMass";
    date: string;
    value: number;
  }): Promise<void>;
};
const UzmanHealth = registerPlugin<UzmanHealthPlugin>("UzmanHealth");

const READ = [
  "steps",
  "calories",
  "workouts",
  "weight",
  "sleep",
  "restingHeartRate",
] as const;
const WRITE = ["weight", "dietaryEnergyConsumed"] as const;

const CONNECTED_KEY = "uzd-health-connected";
const LAST_SYNC_KEY = "uzd-health-last-sync";
const SYNC_EVERY_MS = 20 * 60 * 1000;
const OWN_BUNDLE = "com.uzmandiyet.app";
const ASLEEP = new Set(["asleep", "rem", "deep", "light"]);

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function storageSet(key: string, value: string | null) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Depolama kapalıysa senkron yine çalışır, yalnızca sıklık sınırı olmaz.
  }
}

async function plugin() {
  const { Health } = await import("@capgo/capacitor-health");
  return Health;
}

/** iOS uygulamasında ve cihazda Sağlık varsa true. */
export async function isHealthAvailable(): Promise<boolean> {
  // Android'de Health Connect henüz kapalı (izin beyanı ayrı sürümde).
  if (!isNative() || nativePlatform() !== "ios") return false;
  try {
    return (await (await plugin()).isAvailable()).available;
  } catch {
    return false;
  }
}

export function isHealthConnectedLocally(): boolean {
  return storageGet(CONNECTED_KEY) === "1";
}

/** İzin ekranını açar, ilk senkronu (son 30 gün) yapar. */
export async function connectHealth(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!(await isHealthAvailable())) {
    return { ok: false, error: "Apple Sağlık bu cihazda kullanılamıyor." };
  }
  try {
    const Health = await plugin();
    await Health.requestAuthorization({ read: [...READ], write: [...WRITE] });
    // iOS okuma iznini gizlilik gereği bildirmez; reddedildiyse veri boş gelir.
    storageSet(CONNECTED_KEY, "1");
    const res = await syncHealth(30);
    return res;
  } catch {
    return { ok: false, error: "Apple Sağlık izni alınamadı." };
  }
}

export function forgetHealthLocally() {
  storageSet(CONNECTED_KEY, null);
  storageSet(LAST_SYNC_KEY, null);
}

/** Bağlıysa ve son senkrondan beri yeterli süre geçtiyse sessizce senkronlar. */
export async function maybeSyncHealth(): Promise<void> {
  if (nativePlatform() !== "ios" || !isHealthConnectedLocally()) return;
  const last = Number(storageGet(LAST_SYNC_KEY) ?? 0);
  if (Date.now() - last < SYNC_EVERY_MS) return;
  await syncHealth(14);
}

let writebackTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Öğün işaretlendiğinde ya da kilo girildiğinde çağrılır: kısa bir gecikmeyle
 * (art arda işaretlemeler tek yazmaya insin) son günleri Sağlık'a yazar.
 */
export function scheduleHealthWriteback() {
  if (nativePlatform() !== "ios" || !isHealthConnectedLocally()) return;
  if (writebackTimer) clearTimeout(writebackTimer);
  writebackTimer = setTimeout(async () => {
    writebackTimer = null;
    const res = await getHealthWriteback().catch(() => null);
    if (res && "ok" in res) await writeBack(res.writeback);
  }, 2500);
}

async function writeBack(wb: HealthWriteback) {
  for (const k of wb.kcal) {
    await UzmanHealth.replaceDailyValue({
      kind: "dietaryEnergy",
      date: k.day,
      value: k.value,
    }).catch(() => {});
  }
  for (const w of wb.weights) {
    await UzmanHealth.replaceDailyValue({
      kind: "bodyMass",
      date: w.day,
      value: w.value,
    }).catch(() => {});
  }
}

let syncing: Promise<{ ok: boolean; error?: string }> | null = null;

/** Son `days` günü okur, sunucuya yazar, uygulamadaki değerleri Sağlık'a geri yazar. */
export function syncHealth(
  days: number,
): Promise<{ ok: boolean; error?: string }> {
  // Aynı anda iki senkron çalışmasın (açılış + buton).
  syncing ??= runSync(days).finally(() => {
    syncing = null;
  });
  return syncing;
}

async function runSync(days: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const payload = await readHealth(days);
    const res = await saveHealthSync(payload);
    if ("error" in res) return { ok: false, error: res.error };
    storageSet(LAST_SYNC_KEY, String(Date.now()));
    await writeBack(res.writeback);
    return { ok: true };
  } catch {
    return { ok: false, error: "Apple Sağlık verisi okunamadı." };
  }
}

async function readHealth(days: number): Promise<HealthSyncInput> {
  const Health = await plugin();
  const end = new Date();
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const range = { startDate: start.toISOString(), endDate: end.toISOString() };

  // Her okuma bağımsız: biri reddedildiyse diğerleri yine gelsin.
  const [steps, active, resting, sleep, weight, workouts] = await Promise.all([
    Health.queryAggregated({
      ...range,
      dataType: "steps",
      bucket: "day",
      aggregation: "sum",
    }).catch(() => null),
    Health.queryAggregated({
      ...range,
      dataType: "calories",
      bucket: "day",
      aggregation: "sum",
    }).catch(() => null),
    Health.queryAggregated({
      ...range,
      dataType: "restingHeartRate",
      bucket: "day",
      aggregation: "average",
    }).catch(() => null),
    // Uyku dünden başlar: gece yarısından önce yatılan uyku da sayılsın.
    Health.readSamples({
      dataType: "sleep",
      startDate: new Date(start.getTime() - 86_400_000).toISOString(),
      endDate: range.endDate,
      limit: 5000,
    }).catch(() => null),
    Health.readSamples({ ...range, dataType: "weight", limit: 500 }).catch(
      () => null,
    ),
    Health.queryWorkouts({ ...range, limit: 300 }).catch(() => null),
  ]);

  const byDay = new Map<string, HealthSyncInput["days"][number]>();
  const at = (iso: string) => {
    const key = istanbulDay(iso);
    let d = byDay.get(key);
    if (!d) {
      d = { day: key };
      byDay.set(key, d);
    }
    return d;
  };

  // Gün kovası yerel gece yarısında başlar; ortasını alıp güne yerleştiriyoruz.
  const mid = (s: { startDate: string; endDate: string }) =>
    new Date(
      (new Date(s.startDate).getTime() + new Date(s.endDate).getTime()) / 2,
    ).toISOString();

  for (const s of steps?.samples ?? []) at(mid(s)).steps = Math.round(s.value);
  for (const s of active?.samples ?? [])
    at(mid(s)).activeKcal = Math.round(s.value);
  for (const s of resting?.samples ?? []) {
    if (s.value > 0) at(mid(s)).restingHr = Math.round(s.value);
  }

  // Uyku: kaynak başına (Watch, iPhone, üçüncü parti) ayrı topla, en büyüğünü
  // al — aynı gece iki cihazdan gelince iki kat sayılmasın. Uyanılan güne yazılır.
  const sleepBySource = new Map<string, Map<string, number>>();
  for (const s of sleep?.samples ?? []) {
    if (!s.sleepState || !ASLEEP.has(s.sleepState)) continue;
    const day = istanbulDay(s.endDate);
    const src = s.sourceId ?? s.sourceName ?? "?";
    const minutes =
      (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000;
    const perDay = sleepBySource.get(day) ?? new Map<string, number>();
    perDay.set(src, (perDay.get(src) ?? 0) + minutes);
    sleepBySource.set(day, perDay);
  }
  for (const [day, perSource] of sleepBySource) {
    if (day < istanbulDay(range.startDate)) continue;
    at(`${day}T12:00:00+03:00`).sleepMinutes = Math.min(
      1440,
      Math.round(Math.max(...perSource.values())),
    );
  }

  // Kilo: kendi yazdığımızı geri okumayalım; günün son ölçümü.
  const weightByDay = new Map<string, { kg: number; t: number }>();
  for (const s of weight?.samples ?? []) {
    if (s.sourceId === OWN_BUNDLE) continue;
    const day = istanbulDay(s.startDate);
    const t = new Date(s.startDate).getTime();
    const prev = weightByDay.get(day);
    if (!prev || t > prev.t)
      weightByDay.set(day, { kg: Math.round(s.value * 10) / 10, t });
  }

  return {
    days: [...byDay.values()].slice(-40),
    workouts: (workouts?.workouts ?? [])
      .filter((w) => w.platformId)
      .slice(0, 300)
      .map((w) => ({
        platformId: w.platformId as string,
        type: w.workoutType,
        startedAt: w.startDate,
        durationMin: Math.round((w.duration / 60) * 10) / 10,
        kcal:
          w.totalEnergyBurned != null ? Math.round(w.totalEnergyBurned) : null,
        distanceM: w.totalDistance != null ? Math.round(w.totalDistance) : null,
        source: w.sourceName ?? null,
      })),
    weights: [...weightByDay]
      .filter(([, v]) => v.kg >= 30 && v.kg <= 300)
      .map(([day, v]) => ({ day, kg: v.kg }))
      .slice(-60),
  };
}
