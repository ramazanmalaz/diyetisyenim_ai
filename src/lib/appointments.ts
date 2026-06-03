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
