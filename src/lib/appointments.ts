import type { AppointmentStatus } from "@/types/database";

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  requested: "Talep edildi",
  confirmed: "Onaylandı",
  cancelled: "İptal edildi",
  completed: "Tamamlandı",
};

/** ISO tarihini Türkçe okunur biçime çevirir (sunucu/istemci ortak). */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Randevuyu kullanıcının Google Takvimine eklemek için hazır bağlantı üretir. */
export function googleCalendarUrl(
  title: string,
  startIso: string,
  minutes = 40,
  details = "",
): string {
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(startIso);
  const end = new Date(start.getTime() + minutes * 60000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
