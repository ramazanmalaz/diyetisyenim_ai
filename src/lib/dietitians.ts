import type { SlotStatus } from "@/types/database";

/**
 * Danışana gösterilen diyetisyen alanları — iletişim (telefon/e-posta)
 * kolonları KESİNLİKLE buraya eklenmez.
 */
export const PUBLIC_DIETITIAN_COLUMNS =
  "id, full_name, title, bio, specialties, city, photo_url, years_experience, is_active, sort_order";

export type PublicDietitian = {
  id: string;
  full_name: string;
  title: string;
  bio: string | null;
  specialties: string[];
  city: string | null;
  photo_url: string | null;
  years_experience: number | null;
  is_active: boolean;
  sort_order: number;
};

export type Slot = {
  id: string;
  dietitian_id: string;
  start_at: string;
  duration_min: number;
  status: SlotStatus;
};

export function initials(name: string): string {
  return (
    name
      .replace(/^Dyt\.?\s*/i, "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("") || "D"
  );
}

/** Slotları güne göre gruplar (Türkçe gün başlığı + saat). */
export function groupSlotsByDay(
  slots: Slot[],
): { dayKey: string; dayLabel: string; slots: Slot[] }[] {
  const map = new Map<string, { dayLabel: string; slots: Slot[] }>();
  for (const s of slots) {
    const d = new Date(s.start_at);
    const dayKey = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString("tr-TR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!map.has(dayKey)) map.set(dayKey, { dayLabel, slots: [] });
    map.get(dayKey)!.slots.push(s);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, v]) => ({ dayKey, dayLabel: v.dayLabel, slots: v.slots }));
}

export const SLOT_STATUS_LABEL: Record<SlotStatus, string> = {
  open: "Açık",
  booked: "Dolu",
  closed: "Kapalı",
};

export function formatSlotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
