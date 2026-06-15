import webpush from "web-push";

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
 * Bir kullanıcının tüm kayıtlı cihazlarına push bildirimi gönderir.
 * Geçersiz (404/410) abonelikleri temizler. Gönderilen cihaz sayısını döndürür.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<number> {
  ensureConfigured();
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("client_id", userId);
  if (!subs || subs.length === 0) return 0;

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
        }
      }
    }),
  );
  return sent;
}
