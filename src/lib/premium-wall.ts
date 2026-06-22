// Ücretsiz kota dolunca premium çağrısı popup'ını tetikleyen yardımcı.
// Global bir CustomEvent yayar; <PremiumWall /> (app layout'ta mount) dinler.

export type PremiumWallKind = "chat" | "vision";

export const PREMIUM_WALL_EVENT = "premium-wall";

/** Sunucu aksiyonlarının döndürdüğü metinde kota işareti (UI bunu yakalar). */
export const QUOTA_MARKER = "__QUOTA__";

export function triggerPremiumWall(kind: PremiumWallKind = "chat") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(PREMIUM_WALL_EVENT, { detail: { kind } }),
  );
}
