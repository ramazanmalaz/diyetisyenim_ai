// Su sayacı ile su hatırlatıcısı arasında canlı senkron.
//
// Hatırlatıcı (global, layout'ta) DB'ye yazınca, açık olan WaterTracker kendi
// client state'ini bu olayla günceller — aksi halde değişiklik ancak tam
// reload'da görünüyordu.

export const WATER_UPDATE_EVENT = "water:update";

/** Sayaç + hatırlatıcı için ortak standart bardak (ml). */
export const WATER_GLASS_ML = 250;

/** Güncel toplamı (ml) tüm açık su bileşenlerine yayınlar. */
export function broadcastWater(total: number): void {
  try {
    window.dispatchEvent(
      new CustomEvent(WATER_UPDATE_EVENT, { detail: { total } }),
    );
  } catch {
    /* no-op */
  }
}
