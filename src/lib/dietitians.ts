import type { SlotStatus } from "@/types/database";

/**
 * Danışana gösterilen diyetisyen alanları. Gizli iletişim kolonları
 * (contact_phone / contact_email) KESİNLİKLE buraya eklenmez. Ancak diyetisyenin
 * yayımlamayı seçtiği HALKA AÇIK alanlar (slogan, hizmetler, çalışma saatleri,
 * adres, instagram, whatsapp) profilde gösterilir.
 */
export const PUBLIC_DIETITIAN_COLUMNS =
  "id, full_name, title, bio, specialties, city, photo_url, years_experience, is_active, sort_order, featured, slogan, services, working_hours, address, instagram, whatsapp";

/**
 * Randevu/iletişim için tek WhatsApp hattı (tüm diyetisyenler için ortak).
 * 0553 915 12 78 → uluslararası: +90 553 915 1278.
 */
export const APPOINTMENT_WHATSAPP = "905539151278";

/** Diyetisyen için önceden doldurulmuş WhatsApp randevu bağlantısı. */
export function appointmentWhatsappUrl(dietitianName: string): string {
  const text = `Merhaba, ${dietitianName} ile randevu almak istiyorum.`;
  return `https://wa.me/${APPOINTMENT_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

export type WorkingHours = Record<string, string>;

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
  featured: boolean;
  slogan: string | null;
  services: string[];
  working_hours: WorkingHours | null;
  address: string | null;
  instagram: string | null;
  whatsapp: string | null;
};

/** Çalışma saatleri tablosu için gün sırası ve Türkçe etiketler. */
export const WORKING_DAYS: { key: string; label: string; short: string }[] = [
  { key: "mon", label: "Pazartesi", short: "Pzt" },
  { key: "tue", label: "Salı", short: "Sal" },
  { key: "wed", label: "Çarşamba", short: "Çar" },
  { key: "thu", label: "Perşembe", short: "Per" },
  { key: "fri", label: "Cuma", short: "Cum" },
  { key: "sat", label: "Cumartesi", short: "Cmt" },
  { key: "sun", label: "Pazar", short: "Paz" },
];

/** Bugünün gün anahtarı (working_hours için): mon..sun. */
export function todayDayKey(): string {
  // getDay: 0=Paz..6=Cmt → WORKING_DAYS index'ine çevir.
  return WORKING_DAYS[(new Date().getDay() + 6) % 7].key;
}

/** "Kapalı"/boş değilse çalışma günü kabul edilir. */
export function isOpenHours(value: string | undefined): boolean {
  return !!value && !/kapal/i.test(value);
}

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
