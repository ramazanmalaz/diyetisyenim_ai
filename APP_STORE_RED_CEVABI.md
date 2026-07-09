# App Store Red Gerekçeleri ve Çözüm Planı
**Submission ID:** 6bc85c09f-e54b-4a35-bef2-ee0e1d7a0286
**İnceleme tarihi:** 7 Temmuz 2026
**İnceleme cihazı:** iPad Air 11-inch (M3)

---

## RED 1 — Guideline 2.1(a): Uygulama İkonu Placeholder Görünüyor

### Apple'ın söylediği
> "Specifically, the icons contains placeholder content."
> İkon tamamlanmamış/geçici içerik içeriyor.

### Sorun
Oluşturduğumuz yeşil arka plan + beyaz "U" harfi ikonu Apple inceleyicisine **geliştirici test ikonu** gibi görünmüş. Apple bunu gerçek bir marka kimliği olarak kabul etmemiş.

### Çözüm — Yeni ikon tasarımı

İkonun "gerçek uygulama" gibi görünmesi için şunlar gerekiyor:

**Yapılacaklar:**

1. **İkonu yeniden tasarla** — Sadece harf değil, anlam taşıyan bir görsel:
   - Bir tabak + yaprak kombinasyonu
   - Kalp + salata yaprağı
   - Stilize bir "U" ama şık font ve gölgeli tasarımla
   - Veya bir diyetisyen/beslenme sembolü

2. **Tasarım araçları (ücretsiz):**
   - **Canva** → canva.com → "App Icon" şablonu ara → 1024×1024 export et
   - **Figma** → figma.com → ücretsiz hesapla tasarla
   - **IconKitchen** → icon.kitchen → otomatik ikon seti üretir

3. **Hazır ikon paketi satın al (hızlı çözüm):**
   - icons8.com → "nutrition" veya "diet" ara → PNG 1024×1024 indir (~10$)
   - flaticon.com → ücretsiz ikonlar mevcut (attribution gerekebilir)

4. **Yeni ikonu `appicon.html` dosyasına uygula** ve `node appicon-screenshot.mjs` ile yeniden üret.

5. App Store Connect → **App Icon** bölümüne yeni 1024×1024 PNG'yi yükle.

---

## RED 2 — Guideline 3.1.1: Ödeme Sistemi (KRİTİK)

### Apple'ın söylediği
> "The subscriptions can be purchased in the app using payment mechanisms other than In-App Purchase."
> Uygulama içi abonelik satın alma, Apple'ın kendi ödeme sistemi (In-App Purchase) yerine başka bir sistem üzerinden yapılıyor.

### Sorun
iOS uygulamalarında **dijital içerik ve abonelik satışı zorunlu olarak Apple'ın In-App Purchase (StoreKit) sistemiyle** yapılmak zorunda. iyzico, Stripe vb. **iOS uygulaması içinde kullanılamaz.** Bu Apple'ın en katı kurallarından biri.

> ⚠️ Bu kuralı çiğneyen uygulamalar (Fortnite/Epic gibi) App Store'dan tamamen kaldırılmış, dava süreçlerine girmiştir.

### Seçenekler

---

### SEÇENEK A — Abonelik ekranını iOS'tan kaldır (Önerilen / Hızlı)

Netflix, Spotify, Amazon Kindle'ın kullandığı yöntem.

**Nasıl çalışır:**
- iOS uygulamasından ödeme/abonelik butonları tamamen kaldırılır
- Kullanıcıya "Abonelik için web sitemizi ziyaret edin" mesajı gösterilir
- Ödeme yalnızca **uzmandiyet.com** üzerinden iyzico ile yapılır
- iOS kullanıcısı web'de ödeme yapar → hesabı aktif olur → uygulamaya girince premium görünür

**Avantajları:**
- Hızlı çözüm, yeni build gerektirmez (sadece UI değişikliği)
- Apple komisyonu yok (%30 veya %15 küçük geliştirici programıyla)
- iyzico entegrasyonunu değiştirmene gerek yok

**Dezavantajı:**
- Kullanıcı deneyimi biraz zorlaşır (tarayıcıya geçmek zorunda)
- Apple, "Neden abonelik yok?" diye tekrar sorabilir — açıklama notu eklemen gerekir

**Yapılacaklar:**
1. `src/app/(app)/abonelik/page.tsx` sayfasını düzenle
2. Ödeme butonlarını kaldır
3. Şu mesajı ekle:
   ```
   Aboneliğinizi yönetmek için uzmandiyet.com adresini ziyaret edin.
   ```
4. App Review notuna ekle:
   ```
   "This app does not offer in-app purchases. Subscriptions are managed
   exclusively through our website at uzmandiyet.com. The iOS app provides
   access to content for users who have already subscribed via the web."
   ```

---

### SEÇENEK B — Apple In-App Purchase (StoreKit) uygula (Uzun vadeli)

**Nasıl çalışır:**
- Apple'ın StoreKit 2 framework'ü kullanılır
- Abonelik ürünleri App Store Connect'te tanımlanır
- Ödeme tamamen Apple üzerinden geçer
- Apple **%30 komisyon** alır (yıllık geliri 1M$'ın altındaki geliştiriciler için %15)

**Avantajları:**
- En sorunsuz kullanıcı deneyimi
- Apple One-Click abonelik
- Otomatik yenileme ve iptal yönetimi Apple tarafından yapılır

**Dezavantajları:**
- Geliştirme süreci karmaşık (RevenueCat gibi kütüphane kullanmak gerekir)
- Her abonelikten %15–30 Apple'a gidiyor
- Capacitor + Next.js yapısında StoreKit entegrasyonu ek efor gerektirir
- Tahmini geliştirme süresi: 2–4 hafta

**Önerilen kütüphane:** RevenueCat (`@revenuecat/purchases-capacitor`)

---

### SEÇENEK C — Uygulamayı tamamen ücretsiz yap

Eğer şu an gelir modeli öncelik değilse:
- Tüm özellikleri ücretsiz aç
- Ödeme sistemini iOS'tan tamamen çıkar
- "Free" olarak App Store'a sun
- Para kazanmak istediğinde web üzerinden veya Seçenek B ile ekle

---

## Önerilen Eylem Planı

### Hızlı çözüm (1–2 gün):

1. **İkonu yeniden tasarla** → Canva/Figma ile gerçek marka kimliği oluştur
2. **Abonelik sayfasını iOS'tan temizle** → Seçenek A'yı uygula
3. **App Review notuna açıklama ekle** → "No IAP, web-only subscriptions"
4. Yeni build yükle → tekrar gönder

### Uzun vadeli (1–2 ay):

5. RevenueCat ile StoreKit entegrasyonu
6. Web (iyzico) + iOS (StoreKit) paralel çalışan hibrit ödeme sistemi

---

## App Store Connect'te Cevap Verme

App Store Connect → Resolution Center → Apple'ın mesajına **Reply** yaz:

```
Hi App Review Team,

Thank you for the detailed feedback.

Regarding Guideline 2.1(a): We have redesigned the app icon with a 
professional nutrition/diet themed design. The new icon has been uploaded.

Regarding Guideline 3.1.1: We have removed all subscription purchase 
functionality from the iOS app. UzmanDiyet is now completely free on iOS. 
Users who wish to access premium features can subscribe through our website 
at uzmandiyet.com. The iOS app provides access to content for users who 
have already subscribed via the web. There are no digital goods or 
subscriptions available for purchase within the app itself.

We have submitted a new build addressing both issues. Please let us know 
if you need any additional information.

Best regards,
Ramazan Malaz
```

---

## Özet Tablo

| Ret Gerekçesi | Sebep | Çözüm | Süre |
|---|---|---|---|
| 2.1(a) İkon | Yeşil U harfi placeholder görünüyor | Yeni profesyonel ikon tasarla | 1 gün |
| 3.1.1 Ödeme | iyzico iOS'ta kullanılamaz | Abonelik butonlarını kaldır + web'e yönlendir | 1 gün |
