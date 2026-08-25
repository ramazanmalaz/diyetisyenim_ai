import webpush from "web-push";

import { apnsHazir, sendApns, type ApnsEnvironment } from "@/lib/apns";
import { createAdminClient } from "@/lib/supabase/admin";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@uzmandiyet.com";
  if (!pub || !priv) throw new Error("VAPID anahtarları tanımlı değil.");
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  tag?: string;
  url?: string;
};

/**
 * Bir kullanıcının tüm kayıtlı cihazlarına push bildirimi gönderir — hem
 * tarayıcı/PWA (Web Push) hem iOS uygulaması (APNs). Geçersiz abonelik ve
 * token'ları temizler. Gönderilen cihaz sayısını döndürür.
 *
 * `yalnizcaWeb`: bildirim iOS uygulamasına gönderilmesin. Ödeme/abonelik
 * yönlendirmesi içeren bildirimler için zorunlu — uygulamada ödeme arayüzü
 * yok, kullanıcı hiçbir yere varamaz ve bu Guideline 3.1.1 (anti-steering)
 * sınırında durur.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  secenek: { yalnizcaWeb?: boolean } = {},
): Promise<number> {
  const admin = createAdminClient();
  const [web, native] = await Promise.all([
    webPushGonder(admin, userId, payload),
    secenek.yalnizcaWeb
      ? Promise.resolve(0)
      : apnsGonder(admin, userId, payload),
  ]);
  return web + native;
}

type Admin = ReturnType<typeof createAdminClient>;

/** Tarayıcı ve PWA cihazları (VAPID / Service Worker). */
async function webPushGonder(
  admin: Admin,
  userId: string,
  payload: PushPayload,
): Promise<number> {
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("client_id", userId);
  if (!subs || subs.length === 0) return 0;

  try {
    ensureConfigured();
  } catch (err) {
    console.error("[push] VAPID yapılandırılmamış:", err);
    return 0;
  }

  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
        sent += 1;
      } catch (err) {
        const code = (err as { statusCode?: number })?.statusCode ?? 0;
        if (code === 404 || code === 410) {
          await admin
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", s.endpoint);
        } else {
          console.error("[push] web gönderilemedi:", code, err);
        }
      }
    }),
  );
  return sent;
}

/** iOS uygulaması (APNs). Yapılandırma yoksa sessizce atlanır. */
async function apnsGonder(
  admin: Admin,
  userId: string,
  payload: PushPayload,
): Promise<number> {
  if (!apnsHazir()) return 0;

  const { data: tokens } = await admin
    .from("apns_tokens")
    .select("token, environment")
    .eq("client_id", userId);
  if (!tokens || tokens.length === 0) return 0;

  let sent = 0;
  await Promise.all(
    tokens.map(async (t) => {
      const ortam = (t.environment as ApnsEnvironment) ?? "production";
      let sonuc = await sendApns(t.token, payload, ortam);

      // İstemci hangi APNs ortamına kaydolduğunu bilemiyor (Xcode derlemesi
      // sandbox, TestFlight/App Store production) ve varsayılan olarak
      // production yazıyor. BadDeviceToken gelirse diğer ortamı dene; tutarsa
      // kaydı düzelt. "Dev'de çalışıyor, TestFlight'ta gelmiyor" sorununun
      // kendi kendine çözülmesi bu sayede.
      if (!sonuc.ok && sonuc.hata?.includes("BadDeviceToken")) {
        const diger: ApnsEnvironment =
          ortam === "production" ? "sandbox" : "production";
        sonuc = await sendApns(t.token, payload, diger);
        if (sonuc.ok) {
          await admin
            .from("apns_tokens")
            .update({ environment: diger })
            .eq("token", t.token);
        }
      }

      if (sonuc.ok) {
        sent += 1;
        return;
      }
      if (sonuc.gecersiz) {
        await admin.from("apns_tokens").delete().eq("token", t.token);
        return;
      }
      console.error("[push] APNs gönderilemedi:", sonuc.hata);
    }),
  );
  return sent;
}
