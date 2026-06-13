// Pomodoro odak planı — saf hesaplama yardımcıları (UI/DB'den bağımsız, test edilebilir).
// "Gün penceresi → otomatik böl" modeli: kullanıcı bir çalışma penceresi
// (başlangıç–bitiş) ile çalışma/mola sürelerini verir; pencere art arda
// çalışma ve mola seanslarına bölünür (sonda mola bırakılmaz).

export const DAY_MIN = 24 * 60;

export type PomodoroSettings = {
  /** gece yarısından itibaren dakika */
  startMin: number;
  endMin: number;
  workMin: number;
  breakMin: number;
};

export type SegmentKind = "work" | "break";

export type Segment = {
  kind: SegmentKind;
  /** çalışma seansının 1 tabanlı sırası; mola, kendisinden önceki seansın sırasını taşır */
  session: number;
  startMin: number;
  endMin: number;
};

export type Schedule = {
  segments: Segment[];
  workSessions: number;
  totalWorkMin: number;
  totalBreakMin: number;
  /** son çalışma seansının bittiği dakika */
  finishMin: number;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Dakikayı "HH:MM" biçimine çevirir (24s sarmalı). */
export function minToHHMM(min: number): string {
  const m = ((Math.round(min) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** "HH:MM" değerini gece yarısından itibaren dakikaya çevirir. Geçersizse NaN. */
export function hhmmToMin(value: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return NaN;
  return h * 60 + min;
}

/**
 * Çalışma penceresini çalışma/mola seanslarına böler.
 * Bir mola yalnızca ardından en az bir çalışma seansı daha sığıyorsa eklenir;
 * böylece pencere sonunda boşta mola kalmaz.
 */
export function buildSchedule(s: PomodoroSettings): Schedule {
  const segments: Segment[] = [];
  let cursor = s.startMin;
  let session = 0;
  let totalBreakMin = 0;

  while (cursor + s.workMin <= s.endMin) {
    session += 1;
    segments.push({
      kind: "work",
      session,
      startMin: cursor,
      endMin: cursor + s.workMin,
    });
    cursor += s.workMin;

    if (s.breakMin > 0 && cursor + s.breakMin + s.workMin <= s.endMin) {
      segments.push({
        kind: "break",
        session,
        startMin: cursor,
        endMin: cursor + s.breakMin,
      });
      cursor += s.breakMin;
      totalBreakMin += s.breakMin;
    }
  }

  return {
    segments,
    workSessions: session,
    totalWorkMin: session * s.workMin,
    totalBreakMin,
    finishMin: segments.length ? segments[segments.length - 1].endMin : s.startMin,
  };
}

/** Verilen segment için saniye cinsinden süre. */
export function segmentSeconds(seg: Segment): number {
  return (seg.endMin - seg.startMin) * 60;
}

/** Tamamlanmış çalışma seansı sayısından sonra başlanacak segment indeksi. */
export function resumeIndex(schedule: Schedule, completedSessions: number): number {
  if (completedSessions <= 0) return 0;
  const idx = schedule.segments.findIndex(
    (seg) => seg.kind === "work" && seg.session === completedSessions + 1,
  );
  return idx === -1 ? schedule.segments.length : idx;
}

/** "5 sa 25 dk" gibi okunaklı süre. */
export function humanMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h} sa ${m} dk`;
  if (h) return `${h} sa`;
  return `${m} dk`;
}
