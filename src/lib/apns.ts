import { createSign } from "node:crypto";
import http2 from "node:http2";

import type { PushPayload } from "@/lib/push";

/**
 * Apple Push Notification service (APNs) istemcisi.
 *
 * Token tabanlı (.p8) yetkilendirme kullanılıyor: sertifika yenileme derdi yok,
 * tek anahtar tüm uygulamalar için geçerli. Apple HTTP/2 istiyor; Node'un
 * yerleşik `node:http2` modülü yettiği için ek bağımlılık yok.
 */

export type ApnsEnvironment = "production" | "sandbox";

export type ApnsSonuc = {
  ok: boolean;
  /** Token artık geçersiz (cihaz uygulamayı sildi vb.) — kaydı silinmeli. */
  gecersiz?: boolean;
  hata?: string;
};

const HOST: Record<ApnsEnvironment, string> = {
  production: "https://api.push.apple.com",
  sandbox: "https://api.sandbox.push.apple.com",
};

/** Apple 60 dakikadan sık üretilen JWT'yi TooManyProviderTokenUpdates ile reddeder. */
const JWT_OMRU_MS = 50 * 60 * 1000;

function ayar() {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundleId = process.env.APNS_BUNDLE_ID;
  const p8 = process.env.APNS_P8_BASE64;
  if (!keyId || !teamId || !bundleId || !p8) return null;
  return { keyId, teamId, bundleId, p8 };
}

/** APNs yapılandırılmış mı? Değilse native kanal sessizce atlanır. */
export function apnsHazir(): boolean {
  return ayar() !== null;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

let jwtOnbellek: { deger: string; uretim: number } | null = null;

function jwtUret(): string | null {
  const a = ayar();
  if (!a) return null;

  const simdi = Date.now();
  if (jwtOnbellek && simdi - jwtOnbellek.uretim < JWT_OMRU_MS) {
    return jwtOnbellek.deger;
  }

  const header = base64url(JSON.stringify({ alg: "ES256", kid: a.keyId }));
  const claims = base64url(
    JSON.stringify({ iss: a.teamId, iat: Math.floor(simdi / 1000) }),
  );
  const govde = `${header}.${claims}`;

  // .p8 dosyası base64'lenmiş PEM; imza ES256 (P-256 + SHA-256), DER değil JOSE
  // formatında olmalı — `dsaEncoding: "ieee-p1363"` bunu sağlıyor.
  const pem = Buffer.from(a.p8, "base64").toString("utf8");
  const imza = createSign("SHA256")
    .update(govde)
    .sign({ key: pem, dsaEncoding: "ieee-p1363" });

  const deger = `${govde}.${base64url(imza)}`;
  jwtOnbellek = { deger, uretim: simdi };
  return deger;
}

/** Token geçersizliğini bildiren APNs sebepleri. */
const GECERSIZ_SEBEPLER = new Set([
  "BadDeviceToken",
  "Unregistered",
  "DeviceTokenNotForTopic",
]);

/**
 * Tek bir cihaz token'ına bildirim gönderir.
 * Bağlantı istek başına açılıp kapanıyor: serverless'ta uzun ömürlü havuzun
 * faydası yok, fonksiyon donarken açık kalan soket sorun çıkarıyor.
 */
export async function sendApns(
  token: string,
  payload: PushPayload,
  environment: ApnsEnvironment = "production",
): Promise<ApnsSonuc> {
  const a = ayar();
  const jwt = jwtUret();
  if (!a || !jwt) return { ok: false, hata: "APNs yapılandırılmamış." };

  const govde = JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: "default",
      ...(payload.tag ? { "thread-id": payload.tag } : {}),
    },
    // Bildirime dokunulduğunda açılacak ekran (native-push.ts okuyor).
    url: payload.url ?? "/panel",
  });

  return new Promise<ApnsSonuc>((resolve) => {
    let bitti = false;
    const bitir = (sonuc: ApnsSonuc) => {
      if (bitti) return;
      bitti = true;
      resolve(sonuc);
    };

    const baglanti = http2.connect(HOST[environment]);
    baglanti.on("error", (e) => {
      bitir({ ok: false, hata: e.message });
      baglanti.close();
    });

    const istek = baglanti.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": a.bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      ...(payload.tag ? { "apns-collapse-id": payload.tag.slice(0, 64) } : {}),
      "content-type": "application/json",
      "content-length": Buffer.byteLength(govde),
    });

    let durum = 0;
    let yanit = "";
    istek.setEncoding("utf8");
    istek.on("response", (h) => {
      durum = Number(h[":status"] ?? 0);
    });
    istek.on("data", (parca: string) => {
      yanit += parca;
    });
    istek.on("end", () => {
      baglanti.close();
      if (durum === 200) return bitir({ ok: true });

      let sebep = "";
      try {
        sebep = (JSON.parse(yanit) as { reason?: string }).reason ?? "";
      } catch {
        sebep = yanit.slice(0, 120);
      }
      bitir({
        ok: false,
        gecersiz: durum === 410 || GECERSIZ_SEBEPLER.has(sebep),
        hata: `${durum} ${sebep}`,
      });
    });
    istek.on("error", (e) => {
      baglanti.close();
      bitir({ ok: false, hata: e.message });
    });

    istek.end(govde);
  });
}
