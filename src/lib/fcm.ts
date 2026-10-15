import { createSign } from "node:crypto";

import type { PushPayload } from "@/lib/push";

/**
 * Firebase Cloud Messaging (HTTP v1) istemcisi — Android uygulaması.
 *
 * Yetkilendirme: Firebase servis hesabı anahtarıyla RS256 imzalı JWT →
 * Google OAuth erişim belirteci. Node'un yerleşik `crypto`su yettiği için
 * firebase-admin gibi ağır bir bağımlılık eklenmiyor (bkz. lib/apns.ts deseni).
 *
 * Ortam: FCM_SERVICE_ACCOUNT_BASE64 = servis hesabı JSON dosyasının base64'ü.
 */

export type FcmSonuc = {
  ok: boolean;
  /** Token artık geçersiz (uygulama silindi vb.) — kaydı silinmeli. */
  gecersiz?: boolean;
  hata?: string;
};

type ServisHesabi = {
  project_id: string;
  client_email: string;
  private_key: string;
};

let hesapOnbellek: ServisHesabi | null | undefined;

function hesap(): ServisHesabi | null {
  if (hesapOnbellek !== undefined) return hesapOnbellek;
  const b64 = process.env.FCM_SERVICE_ACCOUNT_BASE64;
  if (!b64) return (hesapOnbellek = null);
  try {
    const json = JSON.parse(
      Buffer.from(b64, "base64").toString("utf8"),
    ) as Partial<ServisHesabi>;
    if (!json.project_id || !json.client_email || !json.private_key) {
      console.error("[fcm] servis hesabı eksik alan içeriyor");
      return (hesapOnbellek = null);
    }
    return (hesapOnbellek = json as ServisHesabi);
  } catch {
    console.error("[fcm] FCM_SERVICE_ACCOUNT_BASE64 okunamadı");
    return (hesapOnbellek = null);
  }
}

/** FCM yapılandırılmış mı? Değilse Android kanalı sessizce atlanır. */
export function fcmHazir(): boolean {
  return hesap() !== null;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

let erisimOnbellek: { token: string; bitis: number } | null = null;

/** Google OAuth erişim belirteci (1 saat geçerli; 5 dk erken yenilenir). */
async function erisimBelirteci(h: ServisHesabi): Promise<string> {
  if (erisimOnbellek && Date.now() < erisimOnbellek.bitis)
    return erisimOnbellek.token;

  const simdi = Math.floor(Date.now() / 1000);
  const baslik = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const govde = base64url(
    JSON.stringify({
      iss: h.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: simdi,
      exp: simdi + 3600,
    }),
  );
  const imza = createSign("RSA-SHA256")
    .update(`${baslik}.${govde}`)
    .sign(h.private_key);
  const jwt = `${baslik}.${govde}.${base64url(imza)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok)
    throw new Error(`OAuth ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  erisimOnbellek = {
    token: json.access_token,
    bitis: Date.now() + (json.expires_in - 300) * 1000,
  };
  return json.access_token;
}

/** Bildirimlerin düştüğü Android kanalı (istemci aynı kimlikle oluşturur). */
export const ANDROID_KANAL = "genel";

export async function sendFcm(
  token: string,
  payload: PushPayload,
): Promise<FcmSonuc> {
  const h = hesap();
  if (!h) return { ok: false, hata: "FCM yapılandırılmamış" };

  try {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${h.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await erisimBelirteci(h)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: payload.title, body: payload.body },
            // Dokununca açılacak sayfa: istemci data.url'i okur (native-push.ts).
            data: { url: payload.url ?? "/panel" },
            android: {
              priority: "HIGH",
              notification: {
                channel_id: ANDROID_KANAL,
                // Aynı etiketli bildirim öncekinin yerini alır (iOS thread gibi).
                ...(payload.tag ? { tag: payload.tag } : {}),
              },
            },
          },
        }),
      },
    );
    if (res.ok) return { ok: true };

    const text = await res.text();
    // UNREGISTERED: uygulama silindi/token yenilendi. INVALID_ARGUMENT + token
    // hatası: biçimsiz token. İkisinde de kayıt silinmeli.
    const gecersiz =
      res.status === 404 ||
      text.includes("UNREGISTERED") ||
      (res.status === 400 && text.includes("registration token"));
    return { ok: false, gecersiz, hata: `${res.status} ${text.slice(0, 200)}` };
  } catch (err) {
    return {
      ok: false,
      hata: err instanceof Error ? err.message : String(err),
    };
  }
}
