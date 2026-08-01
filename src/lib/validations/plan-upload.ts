import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES } from "./progress";

/**
 * Plan görseli/PDF yükleme limitleri — hem danışanın "Hazır planım var"
 * akışı hem diyetisyenin "Fotoğraftan şablon oku" akışı aynı sınırları kullanır.
 */
export const MAX_PLAN_PHOTOS = 4;
/** Tekil PDF sınırı. */
export const MAX_PLAN_PDF_BYTES = 10 * 1024 * 1024; // 10 MB
/** Toplam: base64'e çevrilince ~27 MB — Claude'un 32 MB istek sınırının altında. */
export const MAX_PLAN_TOTAL_BYTES = 20 * 1024 * 1024;
export const ALLOWED_PLAN_FILE_TYPES: string[] = [
  ...ALLOWED_PHOTO_TYPES,
  "application/pdf",
];

export { MAX_PHOTO_BYTES };
