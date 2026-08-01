/**
 * Fotoğrafı tarayıcıda küçültüp JPEG blob'una çevirir (en uzun kenar ~1280px).
 *
 * Mobilde çekilen 3-8 MB'lık fotoğrafları hızlandırır ve 5 MB sunucu sınırını
 * aşmasını engeller; iOS HEIC'i Safari <img> ile çözdüğü için JPEG'e dönüşür
 * (sunucuya geçerli image/jpeg gider — HEIC doğrudan gönderilirse reddedilir).
 *
 * Yalnızca tarayıcıda çağrılabilir.
 */
export function downscaleImage(file: File, maxEdge = 1280): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxEdge || height > maxEdge) {
        const r = Math.min(maxEdge / width, maxEdge / height);
        width = Math.round(width * r);
        height = Math.round(height * r);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("blob"))),
        "image/jpeg",
        0.82,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("img"));
    };
    img.src = url;
  });
}
