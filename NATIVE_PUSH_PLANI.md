# Native Push Bildirimleri — Uygulama Planı

**Hazırlanma:** 25 Ağustos 2026
**Sorun:** Uygulama içinde su/öğün/mesaj bildirimleri hiç gelmiyor.

**Kök neden:** Sistem tamamen **Web Push** (VAPID + Service Worker) üzerine kurulu.
iOS'ta Web Push yalnızca Safari'de ve ana ekrana eklenmiş PWA'da çalışır;
Capacitor'ın kullandığı **WKWebView'da `PushManager` nesnesi hiç yoktur**.
`src/lib/push-client.ts` → `isPushSupported()` uygulamada daima `false` döner,
abonelik kurulmaz, cron gönderecek hedef bulamaz.

Ölçüm (22 Ağustos): 42 profilin tamamında su hatırlatıcısı açık, kayıtlı push
cihazı **4** (2 × `web.push.apple.com`, 2 × `fcm.googleapis.com`) — hepsi
tarayıcıdan. Uygulamadan gelen tek bir abonelik yok.

---

## 1. Mimari karar

Web Push **kaldırılmıyor**. Tarayıcı ve PWA kullanıcılarında çalışıyor; native
kanal onun yanına ekleniyor. `sendPushToUser()` tek giriş noktası olarak kalıyor,
içeride iki kanala dağıtıyor.

```
                  sendPushToUser(userId, payload)
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
     push_subscriptions                  apns_tokens
     (web-push / VAPID)                  (APNs / HTTP2)
     tarayıcı + PWA                      iOS uygulaması
```

**Neden ayrı tablo?** `push_subscriptions`'ın birincil anahtarı `endpoint`,
`p256dh`/`auth` ise `not null`. APNs'te bunların karşılığı yok. Aynı tabloya
sıkıştırmak (`endpoint = 'apns:<token>'`, diğer alanlara boş string) şemayı
kirletir. Ayrı tablo hem temiz, hem de cihaz token'ına özgü alanları
(`environment`, `last_seen_at`) taşıyabilir.

---

## 2. Apple tarafı (bir kereye mahsus)

1. **APNs Auth Key üret** — developer.apple.com → Certificates, Identifiers &
   Profiles → **Keys** → `+` → adı ver, **Apple Push Notifications service (APNs)**
   işaretle → Continue → Register → **`.p8` dosyasını indir**.
   > `.p8` yalnızca **bir kez** indirilebilir. Kaybedersen yeni anahtar üretmen
   > gerekir. Parola yöneticisine ya da güvenli bir kasaya koy.
2. Şu üç değeri not al: **Key ID** (anahtar sayfasında), **Team ID** (sağ üst
   köşede), **Bundle ID** = `com.uzmandiyet.app`.
3. Identifier'da push açık olmalı: Identifiers → `com.uzmandiyet.app` →
   **Push Notifications** kutusu işaretli.

> Sertifika (`.p12`) yöntemi **kullanılmayacak**. Token tabanlı (`.p8`) yöntem
> süresiz, tek anahtar tüm uygulamalar için geçerli ve sunucuda yönetimi kolay.

`.gitignore` zaten `*.p8` ve `*.p12` içeriyor — anahtar repoya girmez.

### Ortam değişkenleri

```
APNS_KEY_ID=            # 10 karakter
APNS_TEAM_ID=           # 10 karakter
APNS_BUNDLE_ID=com.uzmandiyet.app
APNS_P8_BASE64=         # .p8 dosyasının base64'ü, tek satır
APNS_ENV=production     # production | sandbox
```

`.env.example` güncellenecek, Vercel'e `vercel env add` ile eklenecek.

---

## 3. Veritabanı

Yeni migration: `supabase/migrations/<zaman>_apns.sql`

```sql
create table if not exists public.apns_tokens (
  token        text primary key,
  client_id    uuid not null references public.profiles (id) on delete cascade,
  environment  text not null default 'production'
               check (environment in ('production', 'sandbox')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists apns_tokens_client_idx
  on public.apns_tokens (client_id);

alter table public.apns_tokens enable row level security;

-- push_subscriptions ile aynı desen: kullanıcı yalnızca kendi cihazlarını görür.
create policy "apns_select_self" on public.apns_tokens
  for select using (client_id = auth.uid());
create policy "apns_insert_self" on public.apns_tokens
  for insert with check (client_id = auth.uid());
create policy "apns_delete_self" on public.apns_tokens
  for delete using (client_id = auth.uid());
```

Sonra `npx supabase gen types typescript` ile `src/types/database.ts` yenilenecek.

`environment` alanının niçin gerektiği için bkz. §7 tuzak 1.

---

## 4. Sunucu katmanı

### 4.1 `src/lib/apns.ts` (yeni)

APNs, HTTP/2 üzerinden JWT ile konuşuyor. Node 24'te `node:http2` yerleşik,
JWT'yi `node:crypto` ile ES256 imzalamak ~30 satır — **yeni bağımlılık
gerekmiyor**. Alternatif `@parse/node-apn` paketi; bağlantı havuzunu yönetir ama
serverless'ta havuzun faydası sınırlı.

> Öneri: önce bağımlılıksız `node:http2` ile yaz. Hata yönetimi karmaşıklaşırsa
> `@parse/node-apn`'e geç.

```ts
export type ApnsSonuc = { ok: boolean; gecersiz?: boolean };

/** Tek bir cihaz token'ına bildirim gönderir. */
export async function sendApns(
  token: string,
  payload: PushPayload,
  environment: "production" | "sandbox",
): Promise<ApnsSonuc>;
```

- **JWT:** başlık `{ alg: "ES256", kid: APNS_KEY_ID }`, gövde `{ iss: APNS_TEAM_ID, iat }`.
  **En fazla saatte bir yenilenir** → modül seviyesinde önbelleğe alınacak (bkz. tuzak 2).
- **Host:** `api.push.apple.com` (production) / `api.sandbox.push.apple.com`
- **Başlıklar:** `apns-topic: com.uzmandiyet.app`, `apns-push-type: alert`,
  `apns-priority: 10`, `apns-collapse-id: <payload.tag>`
- **Gövde:**
  ```json
  {
    "aps": {
      "alert": { "title": "...", "body": "..." },
      "sound": "default",
      "thread-id": "water"
    },
    "url": "/plan"
  }
  ```
- `410` ya da `reason: "BadDeviceToken" | "Unregistered"` → `gecersiz: true`

### 4.2 `src/lib/push.ts` (değişiklik)

`sendPushToUser()` iki kanalı da dolaşacak. **İmza ve dönüş tipi aynı kalıyor**
(gönderilen cihaz sayısı), böylece beş çağrı noktasının hiçbiri değişmiyor:

| Çağrı noktası | Ne gönderiyor |
|---|---|
| `api/cron/notifications/route.ts:43` | 💧 Su molası |
| `api/cron/notifications/route.ts:72` | 🍳🥗🍲 Öğün vakti |
| `api/cron/notifications/route.ts:109` | 👑 Premium süresi — *bkz. tuzak 4* |
| `api/cron/notifications/route.ts:161` | ⏱ Pomodoro |
| `lib/chat/notify.ts:51` | 💬 Yeni mesaj |

Geçersiz token'lar, web tarafındaki 404/410 temizliğiyle aynı şekilde silinecek.

### 4.3 `src/app/(app)/push/actions.ts` (ekleme)

```ts
/** iOS cihaz token'ını kaydeder (varsa tazeler). */
export async function saveApnsToken(values: unknown): Promise<ActionResult>;
```

`savePushSubscription` ile aynı desen: `getUser()` → zod doğrulama
(`token` hex, `environment` enum) → `admin.upsert(..., { onConflict: "token" })`.

---

## 5. İstemci katmanı

### 5.1 Paket

```bash
npm i @capacitor/push-notifications
npx cap sync ios      # ⚠️ Mac'te — Windows'ta çalıştırma
```

> Windows'ta `cap sync` çalıştırmak `Package.swift`'e ters bölülü yollar yazıyor
> ve Xcode build'ini patlatıyor (bkz. `APP_STORE_YENIDEN_GONDERIM.md` §4).

### 5.2 `src/lib/native-push.ts` (yeni)

```ts
/** Native kabukta mıyız? */
export async function isNative(): Promise<boolean>;

/** İzin iste → APNs'e kaydol → token'ı sunucuya yaz. */
export async function enableNativePush(): Promise<boolean>;
```

- `PushNotifications.requestPermissions()` → `granted` değilse `false`
- `PushNotifications.register()`
- `addListener("registration", …)` → `saveApnsToken({ token, environment })`
- `addListener("registrationError", …)` → sessizce `false`
- `addListener("pushNotificationActionPerformed", e => {
    location.href = e.notification.data.url ?? "/panel" })`
  → bildirime dokununca doğru ekrana gider

### 5.3 `src/lib/push-client.ts` (değişiklik)

Üç fonksiyon native'i de hesaba katacak:

| Fonksiyon | Yeni davranış |
|---|---|
| `isPushSupported()` | native ise `true` (WKWebView'da `PushManager` yok ama APNs var) |
| `enablePush()` | native ise `enableNativePush()`, değilse mevcut web akışı |
| `hasPushSubscription()` | native ise `checkPermissions()` + kayıtlı token |

Bunlar değişince `water-tracker.tsx` ve `notification-settings.tsx`
**kendiliğinden doğru çalışır** — ikisi de yalnızca bu üç fonksiyonu kullanıyor.
`water-tracker`'daki *"Bu sürümde uygulama içi bildirim gönderilemiyor · Safari'de
aç"* dalı yalnızca gerçekten desteklemeyen tarayıcılarda görünür hale gelir.

---

## 6. iOS projesi (Xcode, Mac'te)

1. **Signing & Capabilities** → `+ Capability` → **Push Notifications**.
   Bu adım `App.entitlements` dosyasını oluşturur ve `aps-environment` ekler.
   > ⚠️ Projede şu an `.entitlements` **yok**. Oluşan dosyaya **yalnızca**
   > `aps-environment` girmeli. **In-App Purchase capability'sini ekleme** —
   > 1.0 gönderimi Guideline 2.1(b)'den tam olarak bu yüzden reddedilmişti.
2. `Info.plist` → `UIBackgroundModes` içinde `remote-notification` **zaten var**,
   dokunma.
3. `AppDelegate.swift` — `didRegisterForRemoteNotificationsWithDeviceToken` ve
   `didFailToRegister…` NotificationCenter’a iletilmeli (eklenti README’si). Bunlar
   olmadan izin verilir ama token hiç gelmez — 1.2 ilk derlemesinde bu yaşandı.
4. Build numarasını artır, arşivle.

---

## 7. Tuzaklar

1. **Sandbox ↔ production karışması.** Xcode'dan cihaza kurulan derleme
   **sandbox** APNs'e, TestFlight ve App Store derlemeleri **production**'a kayıt
   olur. Yanlış ortama gönderilen token `BadDeviceToken` döner ve bildirim
   sessizce kaybolur. *"Geliştirmede çalışıyordu, TestFlight'ta gelmiyor"*
   şikâyetinin bir numaralı sebebi budur. Bu yüzden token satırında `environment`
   tutuluyor ve gönderim ona göre yönlendiriliyor.
2. **JWT yenileme sınırı.** APNs, 60 dakikadan sık üretilen yetkilendirme
   token'ını `TooManyProviderTokenUpdates` ile reddeder. JWT modül seviyesinde
   önbelleğe alınmalı, her istekte yeniden üretilmemeli.
3. **İzin isteme anı.** iOS'ta izin diyaloğu bir kez çıkar; reddedilirse uygulama
   içinden bir daha gösterilemez, kullanıcı Ayarlar'a gitmek zorunda kalır.
   Diyalog, kullanıcı hatırlatıcıyı **açtığı anda** çıkmalı — ilk açılışta değil.
   Mevcut `toggleReminder` akışı zaten böyle.
4. **Premium bildirimleri.** `route.ts:109`'daki *"Premium'un yarın doluyor ·
   Yenileyerek sınırsız erişimini kaybetme"* bildirimi platform ayrımı yapmıyor.
   Native push açılınca bu bildirim iOS kullanıcısına da **ulaşacak** — oysa
   uygulamada ödeme arayüzü yok. Dokunan kullanıcı hiçbir yere varamaz ve bu,
   Guideline 3.1.1 (anti-steering) sınırında durur.
   **Native push açılmadan önce bu bildirim iOS token'larına gönderilmeyecek
   şekilde filtrelenmeli.**
5. **Sessiz başarısızlık.** Şu an bir bildirim gönderilemezse hiçbir yerde iz
   kalmıyor — sorunun bu kadar geç fark edilmesinin sebebi de bu.
   `sendPushToUser` en azından başarısız kanalı loglamalı.

---

## 8. Sıra ve efor

| # | İş | Nerede | Tahmin |
|---|---|---|---|
| 1 | APNs Auth Key + env değişkenleri | Apple Developer + Vercel | 20 dk |
| 2 | `apns_tokens` migration + tip üretimi | Windows | 30 dk |
| 3 | `src/lib/apns.ts` | Windows | 2–3 sa |
| 4 | `sendPushToUser` çift kanal + premium filtresi | Windows | 1 sa |
| 5 | `saveApnsToken` action | Windows | 30 dk |
| 6 | `native-push.ts` + `push-client.ts` köprüsü | Windows | 1–2 sa |
| 7 | Paket kurulumu + `cap sync` + Xcode capability | **Mac** | 45 dk |
| 8 | Cihazda uçtan uca test (sandbox) | **Mac + cihaz** | 1–2 sa |
| 9 | TestFlight derlemesiyle production testi | **Mac** | 1 sa |

**1–6 arası Windows'ta yapılabilir**, Mac'e ihtiyaç yok. 7–9 için Mac ve gerçek
cihaz şart — **Simulator push almaz**.

Toplam: **~8–11 saat**, ikiye bölünmüş şekilde.

---

## 9. Kapsam dışı

- **Android / FCM.** Aynı Capacitor eklentisi çalışır; `apns_tokens` yerine
  `fcm_tokens` ve bir Firebase projesi gerekir. Google Play kararı verildiğinde
  ele alınacak.
- **Zengin bildirim** (görsel, aksiyon butonları) — Notification Service
  Extension gerektirir, şimdilik gereksiz.
- **Tercihlerin cihaz bazında ayrılması.** Şu an tercih profil düzeyinde;
  kullanıcının iki cihazı varsa ikisine de gider. Mevcut davranış korunuyor.
