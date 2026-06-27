// Su sayacı, su hatırlatıcısı ve ayarlar arasında canlı senkron.
//
// Tek kaynak = DB (profiles.water_reminder_enabled / water_amount_ml ...).
// Sunucudan prop olarak gelir; client tarafında anlık tutarlılık için localStorage
// "ayna" + CustomEvent kullanılır (in-app hatırlatıcı layout'ta kalıcıdır,
// rota değişiminde yeniden fetch olmaz — bu yüzden event/ayna gerekir).

export const WATER_UPDATE_EVENT = "water:update";
export const REMINDER_TOGGLE_EVENT = "water:reminder-toggle";

// Hatırlatıcı aç/kapa aynası (sunucu prop'u ile başlatılır, zil/ayarlar günceller).
export const REMINDER_ENABLED_KEY = "su_reminder_enabled";

/** Bardak miktarı (ml) için son-çare varsayılan — ayarların varsayılanıyla aynı. */
export const WATER_GLASS_ML = 200;

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

/** Hatırlatıcı aç/kapa durumunu localStorage aynasına yazar + yayınlar. */
export function setReminderEnabledLs(on: boolean): void {
  try {
    localStorage.setItem(REMINDER_ENABLED_KEY, on ? "1" : "0");
  } catch {
    /* no-op */
  }
  try {
    window.dispatchEvent(
      new CustomEvent(REMINDER_TOGGLE_EVENT, { detail: { on } }),
    );
  } catch {
    /* no-op */
  }
}

/** Aynayı sunucudan gelen DB değeriyle eşitler (tam yüklemede DB otoritedir). */
export function syncReminderEnabledLs(on: boolean): void {
  try {
    localStorage.setItem(REMINDER_ENABLED_KEY, on ? "1" : "0");
  } catch {
    /* no-op */
  }
}
