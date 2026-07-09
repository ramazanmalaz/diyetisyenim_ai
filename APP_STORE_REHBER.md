# App Store Connect — İncelemeye Gönderme Rehberi
**UzmanDiyet iOS Uygulaması**

---

## ÖNCE YAPILACAKLAR (Bilgisayarda hazırla)

### Gerekli dosyalar
- `app-store-screenshots/ipad-129-screen1.png` … `ipad-129-screen5.png` (2048×2732)
- `app-store-screenshots/iphone-67-screen1.png` … (1290×2796)
- `app-store-screenshots/iphone-65-screen1.png` … (1242×2688)
- `app-store-screenshots/AppIcon-1024x1024.png`
- Test hesabı bilgileri (Apple inceleyicisi için): e-posta + şifre

---

## ADIM 1 — Ekran Görüntüleri

**Nerede:** Distribution → Previews and Screenshots

### iPhone 6.7" (1290×2796)
1. iPhone sekmesine tıkla
2. "6.7-inch Display" bölümüne `iphone-67-screen1` … `screen5` dosyalarını sürükle/yükle

### iPhone 6.5" (1242×2688)
1. Aynı iPhone sekmesinde "6.5-inch Display" bölümüne `iphone-65-screen1` … `screen5` dosyalarını yükle

### iPad 13" (2048×2732) ← ZORUNLU / hata veren
1. **iPad** sekmesine tıkla
2. "13-inch Display" bölümüne `ipad-129-screen1` … `screen5` dosyalarını yükle

**Save** butonuna bas.

---

## ADIM 2 — Uygulama Bilgileri

**Nerede:** Sol menü → **App Information**

| Alan | Değer |
|---|---|
| Name | UzmanDiyet |
| Subtitle | AI Diyet Asistanı *(opsiyonel, max 30 karakter)* |
| Primary Category | Health & Fitness |
| Secondary Category | Food & Drink *(opsiyonel)* |
| **Copyright** ← ZORUNLU | © 2026 Ramazan Malaz |
| Content Rights | "No, it does not contain third-party content" |

**Save** butonuna bas.

---

## ADIM 3 — İletişim Bilgileri

**Nerede:** Sol menü → App Information → aşağı kaydır → **Contact Information**

| Alan | Değer |
|---|---|
| First Name | Ramazan |
| Last Name | Malaz |
| Phone | (kendi telefon numaran) |
| Email | ramazanmalaz@gmail.com |
| Address Line 1 | (adresin) |
| City | (şehrin) |
| State/Province | (ilin) |
| Postal Code | (posta kodu) |
| Country | Turkey |

**Save** butonuna bas.

---

## ADIM 4 — Destek URL'si

**Nerede:** Sol menü → App Information → **URLs** bölümü

| Alan | Değer |
|---|---|
| Support URL | https://uzmandiyet.com veya mailto:ramazanmalaz@gmail.com |
| Marketing URL | *(opsiyonel)* |
| Privacy Policy URL | *(varsa gizlilik politikası sayfası)* |

> Not: Support URL zorunludur. Henüz web siten yoksa geçici olarak LinkedIn veya herhangi bir sayfa linki girilebilir.

**Save** butonuna bas.

---

## ADIM 5 — Gizlilik Etiketi (App Privacy)

**Nerede:** Sol menü → **App Privacy** → "Get Started" butonu

Sırasıyla şu sorulara cevap ver:

### Hangi veri toplanıyor?

| Veri Türü | Toplanıyor mu? | Seçim |
|---|---|---|
| E-posta adresi | ✅ Evet | Kullanıcıya bağlı · Gerekli |
| Ad/Soyad | ✅ Evet | Kullanıcıya bağlı · Gerekli |
| Sağlık verisi (kilo, ölçüler) | ✅ Evet | Kullanıcıya bağlı · Gerekli |
| Kullanım verisi (analytics) | ❌ Hayır | — |
| Konum | ❌ Hayır | — |
| Finansal bilgi | ❌ Hayır | — |
| Arama geçmişi | ❌ Hayır | — |
| Tanımlayıcılar (User ID) | ✅ Evet | Kullanıcıya bağlı · Gerekli |

**Publish** butonuna bas.

---

## ADIM 6 — Fiyatlandırma

**Nerede:** Sol menü → **Pricing and Availability**

- **Price**: Tier 0 — **Ücretsiz (Free)** seç
- **Availability**: "All countries and regions" veya sadece Türkiye
- **Pre-Order**: Hayır

**Save** butonuna bas.

---

## ADIM 7 — Sürüm Bilgileri

**Nerede:** Distribution sayfası → iOS App Version 1.0 bölümü

### What's New (Yenilikler)
```
UzmanDiyet ile yapay zekâ destekli diyet yolculuğuna başlayın.

• Kişiye özel diyet planı oluşturma
• AI diyetisyen ile sohbet
• Günlük öğün ve kalori takibi
• Su içme hatırlatıcısı
• Spor programı ve egzersiz rehberi
• İlerleme grafikleri
```

### Promotional Text *(opsiyonel)*
```
Yapay zekâ ile kişisel diyetisyeniniz her an yanınızda.
```

### Description
```
UzmanDiyet, yapay zekâ destekli kişisel diyet asistanınızdır.

Nasıl çalışır?
1. Bilgilerini gir: yaş, kilo, boy, hedefin
2. AI diyetisyen sana özel plan oluşturur
3. Günlük öğünlerini takip et
4. Her soruyu AI'ya sor

Özellikler:
• Kişiye özel haftalık diyet planı
• Günlük kalori ve öğün takibi
• AI ile anlık diyet danışmanlığı
• Su içme hatırlatıcısı
• Spor programı ve video rehberi
• Kilo ve ölçü takibi ile ilerleme grafikleri
• Öğün fotoğrafı analizi (yakında)

Not: Bu uygulama genel bilgilendirme amaçlıdır. Tıbbi tavsiye yerine geçmez.
```

### Keywords *(max 100 karakter, virgülle ayır)*
```
diyet,kalori,sağlıklı beslenme,kilo verme,ai,diyetisyen,öğün takibi
```

### Support URL
```
mailto:ramazanmalaz@gmail.com
```

---

## ADIM 8 — Apple İnceleyicisi İçin Test Hesabı

**Nerede:** Distribution → App Review → "App Review Information"

> Apple inceleyicisi uygulamana giriş yapabilmek için test hesabı ister.

| Alan | Değer |
|---|---|
| First Name | Test |
| Last Name | Kullanıcı |
| Email | (Supabase'de oluşturduğun test hesabı e-postası) |
| Password | (test hesabı şifresi) |
| Notes | "Giriş yapın ve planı görüntüleyin. İnternete bağlı olmanız gerekir." |

> ⚠️ Supabase'de önceden bir test kullanıcısı oluştur (AI planı olan, aktif hesap).

---

## ADIM 9 — İncelemeye Gönder

**Nerede:** Distribution sayfası → üst sağ köşe → **"Add for Review"** butonu

Tıkla → çıkan ekranda:

- **Version Release**: "Manually release this version" seç
  *(Apple onayladıktan sonra yayını sen başlatırsın)*
- **Submit for Review** butonuna bas ✅

---

## SÜREÇ

```
Submit for Review
      ↓
Waiting for Review  (birkaç saat - 1 gün)
      ↓
In Review           (1-3 iş günü)
      ↓
Approved / Rejected
      ↓ (Approved ise)
Ready for Sale      (sen "Release" butonuna basınca yayınlanır)
```

Sonuç **ramazanmalaz@gmail.com** adresine e-posta ile gelir.

---

## REDDEDILIRSE

Apple genellikle şu sebeplerle reddeder:
- **Guideline 4.0** (Tasarım): UI çok basit/kırık görünüyor → ekran görüntülerini düzelt
- **Guideline 5.1.1** (Gizlilik): Privacy policy URL eksik → gizlilik politikası sayfası ekle
- **Guideline 2.1** (Çöküyor): Test hesabıyla giriş yapamıyor → hesabı kontrol et
- **Guideline 3.1.1** (Ödeme): Uygulama içi satın alma Apple sisteminden geçmeli → iyzico yerine In-App Purchase

Ret gerekçesi e-posta ve App Store Connect → Resolution Center'da görünür. Düzelt → tekrar gönder.
