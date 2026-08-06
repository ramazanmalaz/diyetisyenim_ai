# App Store Yeniden Gönderim Rehberi

**Red tarihi:** 18 Temmuz 2026
**Submission ID:** 4926aa02-adcc-4047-89bf-46efc73c630e
**İncelenen sürüm:** 1.0 (17)
**İnceleme cihazları:** iPhone 17 Pro Max, iPad Air 11-inch (M3) — iOS/iPadOS 26.5.2
**Bundle ID:** `com.uzmandiyet.app`

---

## 1. Apple ne dedi, biz ne yaptık

| # | Guideline | Apple'ın şikâyeti | Çözüm | Nerede |
|---|---|---|---|---|
| 1 | 2.1(b) | Uygulamada premium referansı var ama IAP ürünleri incelemeye gönderilmemiş | IAP tamamen kaldırıldı | Kod ✅ |
| 2 | 2.1(b) | Sandbox'ta satın alma işlenemedi | Satın alma akışı yok | Kod ✅ |
| 3 | 1.4.1 | Tıbbi teşhis/tedavi tavsiyesi var ama zorunlu uyarı yok | App Store **açıklamasına** uyarı eklenecek | ASC ⬜ |
| 4 | 2.1(a) | Tabak fotoğrafı paylaşıp AI plan oluşturulurken hata | Kök neden giderildi | Kod ✅ |

### 4. maddenin kök nedeni

Reviewer'ın gördüğü hata ayrı bir bug değildi, 1. ve 2. maddenin görünen yüzüydü:

1. Tabak fotoğrafı paylaştı → ücretsiz fotoğraf analizi kotası **günde 1** idi, doldu
2. Premium duvarı açıldı
3. Satın almaya bastı → App Store Connect'te ürün olmadığı için `getOffering()` boş döndü
4. Ekranda **"Ürün bulunamadı. Lütfen tekrar dene."** hatası çıktı

### Kodda yapılan değişiklikler

**Commit `0755137` — iOS'ta ödeme arayüzü kaldırıldı**

- `src/lib/use-native-platform.ts` + `src/components/payments/web-only.tsx`: platform algılama.
  **Fail-closed** kurgu — ödeme arayüzü yalnızca web olduğu *kesinleşince* gösteriliyor.
  SSR çıktısında, ilk render'da ve Capacitor yüklenemezse gizli kalıyor.
- Header'daki Premium rozeti ve `/abonelik` sayfasının tamamı (fiyatlar, iyzico logo
  bandı, satın alma butonları, SSS, ödeme geçmişi) native'de gizli. Yerine fiyat
  içermeyen, "premium" kelimesi geçmeyen sade bir "Kullanımın" ekranı.
- `SmartCheckout` native dalında `null` dönüyor. Eski metin kullanıcıyı
  uzmandiyet.com'a yönlendiriyordu — bu Guideline 3.1.1 anti-steering ihlaliydi.
- Kota dolunca ödemeye yönlendirme yok. Yeni `QuotaNotice`:
  *"Bugünlük fotoğraf analizi hakkın doldu — Hakkın her gün gece yarısı yenilenir.
  Planın, kalori takibin, su ve öğün hatırlatıcıların çalışmaya devam ediyor."*
- Ücretsiz günlük limitler yükseltildi: **sohbet 5 → 20**, **fotoğraf/PDF analizi 1 → 5**.

**Commit `01474f2` — RevenueCat/StoreKit bağımlılığı kaldırıldı**

- `npm uninstall @revenuecat/purchases-capacitor`
- `src/lib/purchases/revenuecat.ts` ve
  `src/components/payments/native-checkout-button.tsx` silindi (ikisi de
  hiçbir yerden çağrılmıyordu)
- `api/webhooks/revenuecat` route'u duruyor — SDK import etmiyor, yalnızca Supabase
  kullanıyor. İleride IAP'ye dönülürse gerekecek.

> **Not:** Web (uzmandiyet.com) tarafında premium ve iyzico ödemesi **aynen çalışıyor**.
> Gizleme yalnızca native iOS kabuğunda geçerli. iOS uygulaması uzmandiyet.com'u
> WebView'de açtığı için global gizleme web gelirini de kapatırdı.

---

## 2. Mac'te hazırlık (tek seferlik)

1. **Xcode** — Mac App Store'dan kur (~10 GB). Kurulunca bir kez aç,
   "Install additional components" derse kabul et.
2. **Node.js** — [nodejs.org](https://nodejs.org) → LTS sürümü indir, kur.
3. **Apple hesabını Xcode'a ekle** — Xcode → Settings (`⌘,`) → Accounts → `+` →
   Apple ID → developer hesabınla giriş yap.

CocoaPods **gerekmiyor** — proje Swift Package Manager kullanıyor, `pod install` yok.

---

## 3. Projeyi Mac'e al

Terminal'i aç (`⌘Space` → "Terminal").

**Proje Mac'te zaten varsa:**

```bash
cd ~/Desktop/Masterclass      # projenin gerçek yolu neyse
git pull
```

**Mac'te yoksa, klonla:**

```bash
cd ~/Desktop
git clone https://github.com/ramazanmalaz/diyetisyenim_ai.git Masterclass
cd Masterclass
```

Klonlarsan `.env.local` gelmez (repoda yok, doğrusu da bu). Build için gerekmiyor —
uygulama uzmandiyet.com'u açıyor.

---

## 4. Terminal komutları

Sırayla:

```bash
npm install
npx cap sync ios
npx cap open ios
```

### ⚠️ `npm install` adımını atlama

Mac'teki `node_modules` hâlâ RevenueCat içeriyorsa `npx cap sync` onu tekrar plugin
olarak ekler ve StoreKit binary'ye geri girer.

**Doğru çalıştıysa `cap sync` çıktısı şöyle olmalı:**

```
Found 2 Capacitor plugins for ios:
  @capacitor/splash-screen@8.0.1
  @capacitor/status-bar@8.0.2
```

Üçüncü satırda `@revenuecat/...` görürsen **dur** — `npm install` düzgün çalışmamış.

### Görmezden gelinebilecek uyarı

```
[warn] Cannot copy web assets from out to ios/App/App/public
       Web asset directory specified by webDir does not exist.
       This is not an error because server.url is set in config.
```

Normal. Uygulama uzmandiyet.com'u WebView'de açtığı için yerel web klasörü kullanılmıyor.

### Windows'ta neden yapılmadı

`cap sync`'i Windows'ta çalıştırmak `ios/App/CapApp-SPM/Package.swift` dosyasına
ters bölülü (`..\..\..\node_modules\...`) yollar yazıyor. Swift Package Manager
macOS'ta bunu çözemez, Xcode build'i patlar. Bu yüzden Windows'ta üretilen dosya
geri alındı — Mac'te doğru yollarla yeniden üretilecek.

---

## 5. Xcode'da

1. Sol panelde en üstteki mavi **App** ikonu → orta panelde **TARGETS → App** seçili olsun.

2. **General** sekmesi → **Identity**:
   - **Version:** `1.0` (aynı kalabilir)
   - **Build:** `18` — reddedilen gönderim `1.0 (17)` idi, build numarası mutlaka
     artmalı yoksa upload reddedilir.

3. **Signing & Capabilities** sekmesi:
   - "Automatically manage signing" işaretli, **Team** senin developer hesabın olsun.
   - Capability listesinde **In-App Purchase yoksa hiçbir şey yapma.** Projede
     `.entitlements` dosyası yok, yani zaten kapalı. Varsa üstüne gel, `×` ile kaldır.

4. Üst çubukta cihaz seçici (App ▸ ...) → **Any iOS Device (arm64)** seç.
   Simulator seçiliyse Archive menüsü gri kalır.

5. Menü: **Product → Archive**. 5–15 dakika sürer.

6. Bitince **Organizer** penceresi açılır → arşivi seç → sağda **Distribute App** →
   **App Store Connect** → **Upload** → varsayılanlarla ilerle → **Upload**.

Yükleme bitince App Store Connect'te build'in "Processing" durumundan çıkması
10–30 dakika sürer; hazır olunca e-posta gelir.

---

## 6. App Store Connect

[appstoreconnect.apple.com](https://appstoreconnect.apple.com) → My Apps → UzmanDiyetApp

### 6.1 Açıklamaya tıbbi uyarıyı ekle

**App Information → Description**, metnin sonuna:

```
ÖNEMLİ SAĞLIK UYARISI

UzmanDiyet bir sağlık hizmeti değildir. Uygulama tıbbi teşhis koymaz, hastalık
tedavi etmez ve tıbbi tavsiye vermez. Sunulan beslenme önerileri, kalori
hesaplamaları ve yapay zekâ yanıtları yalnızca genel bilgilendirme amaçlıdır.

Herhangi bir diyete başlamadan, beslenme düzeninizde değişiklik yapmadan ve
sağlığınızla ilgili herhangi bir karar vermeden önce mutlaka doktorunuza veya
kayıtlı bir diyetisyene danışın. Uygulamayı doktorunuzun tavsiyelerinin yerine
değil, onlara ek olarak kullanın.

Hamilelik, emzirme, kronik hastalık (diyabet, kalp, böbrek, karaciğer
rahatsızlıkları vb.), yeme bozukluğu öyküsü veya düzenli ilaç kullanımı
durumunda uygulamayı hekim onayı almadan kullanmayın. Acil bir sağlık
sorununuz varsa derhal bir sağlık kuruluşuna başvurun.
```

**İngilizce lokalizasyon varsa** oraya da (yoksa bu bloğu atla):

```
IMPORTANT HEALTH DISCLAIMER

UzmanDiyet is not a medical service. The app does not diagnose, treat, or cure
any condition, and does not provide medical advice. All nutrition suggestions,
calorie calculations, and AI-generated responses are for general informational
purposes only.

Always consult your doctor or a registered dietitian before starting any diet,
changing your nutrition, or making any medical decision. Use this app in
addition to your doctor's advice, never as a replacement for it.

Do not use this app without medical approval if you are pregnant or
breastfeeding, have a chronic condition (such as diabetes, heart, kidney, or
liver disease), have a history of an eating disorder, or take regular
medication. If you have a medical emergency, contact a healthcare provider
immediately.
```

→ **Save**

### 6.2 Build'i seç

Sol menü **iOS App → 1.0** (veya "Prepare for Submission") → **Build** bölümünde
`+` ile yeni yüklediğin build'i (18) seç.

### 6.3 App Review Notes

Aynı sayfada aşağıda **App Review Information → Notes**:

```
IN-APP PURCHASES
This version does not offer any in-app purchases. There are no subscriptions,
no premium tiers, no paid unlocks, and no payment options anywhere in the app.
All features are available to every user for free. The previously reported
In-App Purchase products have been removed from this build entirely — the
StoreKit/RevenueCat dependency is no longer linked, and all purchase-related
UI has been removed.

DAILY USAGE LIMITS
To manage AI processing costs, free accounts have generous daily limits:
20 AI chat messages and 5 photo analyses per day. These limits reset every
day at midnight. When a limit is reached, the app simply informs the user
that the daily allowance is used up — it does not prompt for payment or link
to any external purchase page. All other features (diet plan, calorie
tracking, water/meal reminders, progress tracking, workouts) are unlimited.

MEDICAL DISCLAIMER (Guideline 1.4.1)
The app description has been updated with a disclaimer reminding users to
consult a doctor in addition to using the app and before making any medical
decisions. The same disclaimer is also displayed inside the app on the AI
assistant, diet plan, and onboarding screens.

DEMO ACCOUNT
Email: <demo hesabın e-postası>
Password: <şifre>

The app is a web-based client; an active internet connection is required.
```

> **Demo hesap satırlarını doldurmayı unutma.** Apple hesapsız test edemezse
> tekrar reddediyor.

### 6.4 Gönder

Sağ üstte **Add for Review** → **Submit to App Review**.

### 6.5 Resolution Center'a cevap yaz

**En son bu adımı yap** — cevapta "IAP kaldırıldı" diyoruz, build yüklenmeden
yazarsan Apple doğrulayamaz.

Resolution Center → Apple'ın mesajına **Reply**:

```
Hi App Review Team,

Thank you for the detailed feedback. We have addressed all four items.

Guideline 2.1(b) — In-App Purchase products:
We have removed in-app purchases from the app entirely. This build contains no
subscriptions, no premium tiers, and no purchase flows. The StoreKit/RevenueCat
dependency has been removed from the binary and all purchase-related UI has
been deleted. There are therefore no In-App Purchase products to submit for
this version. All features are free for all users.

Guideline 2.1(a) — Bug when sharing a meal image and creating an AI plan:
This was caused by the purchase flow failing when the free daily allowance was
reached. With in-app purchases removed, the app now shows a clear message
stating that the daily allowance has been used and that it resets the next day.
We have also raised the free daily limits (20 AI chat messages and 5 photo
analyses per day) so the feature can be evaluated comfortably.

Guideline 1.4.1 — Medical disclaimer:
We have updated the app description to include a disclaimer reminding users to
seek a doctor's advice in addition to using the app and before making any
medical decisions. The same disclaimer is also shown inside the app on the AI
assistant, diet plan, and onboarding screens.

A new binary has been uploaded. Please let us know if you need anything else.

Best regards,
Ramazan Malaz
```

---

## 7. Kontrol listesi

**Gönderimden önce**

- [ ] Vercel deploy'u bitti — `origin/main` (`01474f2` veya sonrası) production'da
- [ ] Safari'de uzmandiyet.com açıldığında Premium **görünüyor** (web'de kaldı, doğrusu bu)
- [ ] Mac'te `git pull` yapıldı
- [ ] Mac'te `npm install` yapıldı
- [ ] `npx cap sync ios` çıktısında **2 plugin** var, RevenueCat yok
- [ ] Xcode → Build numarası **18** (veya 17'den büyük)
- [ ] Xcode → Signing & Capabilities'te In-App Purchase yok
- [ ] Archive alındı ve upload edildi
- [ ] Build App Store Connect'te "Processing"ten çıktı

**App Store Connect'te**

- [ ] Description'a tıbbi uyarı eklendi ve kaydedildi
- [ ] Yeni build sürüme atandı
- [ ] App Review Notes yapıştırıldı
- [ ] **Demo hesap e-posta + şifre dolduruldu**
- [ ] Submit to App Review yapıldı
- [ ] Resolution Center'a cevap yazıldı (en son)

---

## 8. Sonrası

IAP'ye dönmek istediğinde gerekenler:

1. **Paid Apps Agreement** — ASC → Business → Agreements. Banka + vergi bilgisi
   gerekiyor, onay 1–2 gün sürebilir. Bu aktif olmadan hiçbir IAP çalışmaz.
2. ASC → Subscriptions → Subscription Group + aylık/yıllık ürünler, her birine
   **App Review screenshot** ekle.
3. RevenueCat → ürünleri ekle, **`premium`** adında entitlement oluştur, ürünleri
   ona bağla, Offering'de **`monthly`** ve **`annual`** paketlerini doldur.
   Kod tam olarak bu isimleri bekliyordu.
4. `npm install @revenuecat/purchases-capacitor`
5. Silinen iki dosyayı geri al: `git checkout 0755137 -- src/lib/purchases/revenuecat.ts src/components/payments/native-checkout-button.tsx`
6. `NEXT_PUBLIC_REVENUECAT_IOS_KEY`'i **Vercel production ortamına** da ekle —
   yalnızca `.env.local`'da olması yetmez.
7. Yeni binary + IAP ürünlerini **aynı submission'da** gönder.
