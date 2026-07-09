# RevenueCat Kurulum Rehberi — UzmanDiyet iOS IAP

Apple In-App Purchase'ı canlıya almak için 4 aşama.

---

## Aşama 1 — App Store Connect: Abonelik Ürünleri

1. https://appstoreconnect.apple.com → uygulamanı seç
2. Sol menü: **Monetization → Subscriptions**
3. **Create → Subscription Group** oluştur → isim: `Premium`
4. Gruba 2 ürün ekle:

| Alan | Aylık | Yıllık |
|---|---|---|
| Product ID | `com.uzmandiyet.premium.monthly` | `com.uzmandiyet.premium.annual` |
| Reference Name | Premium Aylık | Premium Yıllık |
| Duration | 1 Month | 1 Year |
| Price | Tier seç (~₺149) | Tier seç (~₺999) |

5. Her ürün için **Localization → Türkçe** ekle (isim + açıklama zorunlu)
6. Durumları **"Ready to Submit"** olana kadar bekle

> **Not:** Product ID'leri ileride değiştiremezsin. Kodda `productId.includes("annual")` kontrolü yapıldığı için yıllık ürünün ID'si `annual` kelimesini içermeli.

---

## Aşama 2 — RevenueCat Dashboard

### 2.1 — Hesap ve Proje

1. https://app.revenuecat.com → ücretsiz hesap aç
2. **New Project** → proje adı: `UzmanDiyet`

### 2.2 — iOS Uygulamasını Bağla

3. Sol menü: **Apps → + Add App → App Store**
   - Bundle ID: `com.uzmandiyet.app` (Xcode'daki Bundle Identifier ile aynı olmalı)
   - App Store Connect API Key yükle:
     - App Store Connect → Users & Access → Integrations → App Store Connect API → Key oluştur (Admin rolü)
     - `.p8` dosyasını ve Key ID + Issuer ID'yi RevenueCat'e gir

### 2.3 — Ürünleri Tanımla

4. Sol menü: **Products → + New**
   - Store: App Store
   - Product ID: `com.uzmandiyet.premium.monthly`
5. Tekrar **+ New**
   - Product ID: `com.uzmandiyet.premium.annual`

### 2.4 — Entitlement Oluştur

6. Sol menü: **Entitlements → + New**
   - Identifier: `premium`  ← **Bu isim değiştirilmemeli** (kodda `["premium"]` olarak kullanılıyor)
   - Attach Products: her iki ürünü de bağla

### 2.5 — Offering Oluştur

7. Sol menü: **Offerings → + New**
   - Identifier: `default`  ← **Bu isim değiştirilmemeli**
   - + Add Package:
     - Identifier: `$rc_monthly` → aylık ürünü seç
   - + Add Package:
     - Identifier: `$rc_annual` → yıllık ürünü seç

---

## Aşama 3 — API Anahtarları

### iOS Public Key

1. RevenueCat Dashboard → **Project Settings → API Keys**
2. **Public app-specific keys** → iOS anahtarını kopyala (`appl_` ile başlar)
3. `.env.local` dosyasına ekle:

```
NEXT_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxxxxxxxxxxxxx
```

### Webhook Secret

4. RevenueCat Dashboard → **Project Settings → Integrations → Webhooks → + New**
5. Ayarlar:
   - **Endpoint URL:** `https://uzmandiyet.com/api/webhooks/revenuecat`
   - **Authorization:** Rastgele güçlü bir şifre yaz — üretmek için terminalde:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
6. Üretilen şifreyi `.env.local`'a ekle:

```
REVENUECAT_WEBHOOK_SECRET=<ürettiğin şifre>
```

### Vercel Environment Variables

Vercel Dashboard → Project → Settings → Environment Variables'a şunları ekle:

```
NEXT_PUBLIC_REVENUECAT_IOS_KEY   →  appl_xxxxxxx...   (Production + Preview)
REVENUECAT_WEBHOOK_SECRET        →  <şifre>           (Production)
```

---

## Aşama 4 — Supabase Migration

```bash
npx supabase db push
```

Bu komut `supabase/migrations/20260101003300_revenuecat_extend_premium.sql` dosyasını çalıştırır.

---

## Aşama 5 — Yeni iOS Build

```bash
git tag v1.0.10
git push origin v1.0.10
```

GitHub Actions tetiklenir → IPA oluşur → TestFlight'a yüklenir.

App Store Connect → uygulamanı seç → **+ Version → 1.0.10** oluştur → TestFlight build'i seç → App Review'a gönder.

---

## Sandbox Test (Ödeme Test)

Gerçek para çekilmeden satın alma testini şu şekilde yap:

1. Xcode → **Settings → Accounts → +** → Apple ID ekle (test için ayrı bir hesap önerilir)
2. App Store Connect → **Users & Access → Sandbox Testers → + Add** → sandbox Apple ID oluştur
3. iPhone'da: **Settings → App Store → Sandbox Account** → sandbox hesabıyla giriş yap
4. Uygulamada abonelik ekranına git → satın alma yap → Apple'ın test sayfası açılır → "Subscribe" → para çekilmez

---

## Kontrol Listesi

- [ ] App Store Connect'te 2 abonelik ürünü oluşturuldu
- [ ] Her ürüne Türkçe lokalizasyon eklendi
- [ ] RevenueCat hesabı açıldı, iOS uygulaması bağlandı
- [ ] 2 ürün RevenueCat'e eklendi
- [ ] `premium` entitlement oluşturuldu, her iki ürün bağlandı
- [ ] `default` offering oluşturuldu, `$rc_monthly` ve `$rc_annual` paketler eklendi
- [ ] `NEXT_PUBLIC_REVENUECAT_IOS_KEY` `.env.local` ve Vercel'e eklendi
- [ ] `REVENUECAT_WEBHOOK_SECRET` `.env.local` ve Vercel'e eklendi
- [ ] Webhook URL RevenueCat'e girildi
- [ ] `npx supabase db push` çalıştırıldı
- [ ] v1.0.10 tag atıldı ve push edildi
- [ ] TestFlight ile sandbox testi yapıldı
- [ ] App Store'a yeniden başvuruldu
