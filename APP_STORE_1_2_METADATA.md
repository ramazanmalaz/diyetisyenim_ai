# App Store 1.2 — Metadata Paketi

**Hazırlanma:** 22 Ağustos 2026
**Mevcut durum:** `1.1` · Ready for Distribution → **yayında**
(App Store'a giriş: 2026-08-22 06:43 UTC · Apple ID `6785798052` · `com.uzmandiyet.app`)

Bu dosya, bir sonraki sürümde App Store Connect'e **birebir kopyalanacak** metinleri içerir.
Karakter sayıları doğrulanmıştır.

---

## 1. Hangi alan ne zaman değişir

| Alan | Yeni sürüm gerekli mi? |
|---|---|
| **Name** | ✅ Evet |
| **Subtitle** | ✅ Evet |
| **Keywords** | ✅ Evet |
| **Category** | ✅ Evet |
| **Description** | ✅ Evet |
| **Screenshots** | ✅ Evet |
| **Promotional Text** | ❌ **Hayır — istediğin an değiştirilebilir** |
| Fiyat / Ülke (Pricing and Availability) | ❌ Hayır |
| Support URL, Privacy Policy URL | ❌ Hayır |

> Yani aşağıdaki **Promotional Text'i bugün** girebilirsin; diğerleri
> `+ Version or Platform` ile 1.2 açıldıktan sonra düzenlenebilir hale gelir.

---

## 2. Önerilen metinler

### Name — 26/30 ✅
```
UzmanDiyet: Diyet & Kalori
```

**Neden:** Uygulamanın cihazdaki adı zaten `UzmanDiyet`
(`capacitor.config.ts` → `appName`, `Info.plist` → `CFBundleDisplayName`).
Mağazadaki `UzmanDiyetApp` bu yüzden tutarsız duruyor ve sondaki "App"
hem jenerik hem 3 karakter israfı.

Name, App Store aramasında **en ağır sıralama sinyali**. Şu an 30 karakterin
sadece 13'ü kullanılıyor ve hiçbiri aranan bir kelime değil. Rakipler bu alanı
dolduruyor: *"Diyetkolik - Kalori Hesaplama"*, *"Diyet Talk: Online Diyetisyen"*,
*"DiyetAI: AI Calorie Counter"*.

**Alternatifler:**
| Aday | Uzunluk | Not |
|---|---|---|
| `UzmanDiyet: Kalori & Kilo` | 25 | "kilo verme" aramasına daha yakın |
| `UzmanDiyet - Diyet ve Kalori` | 28 | `&` yerine `ve` |
| `UzmanDiyet: AI Diyet Asistanı` | 29 | ⚠️ aşağıdaki nota bak |

> ⚠️ **"Diyetisyen" kelimesini Name'e koyma.** 1.0 zaten Guideline 1.4.1
> (tıbbi tavsiye) ile reddedilmişti. Uygulamayı bir diyetisyen hizmeti gibi
> adlandırmak aynı maddeye tekrar davetiye çıkarır. "Asistan" güvenli — mevcut
> altyazı bu kelimeyle onaydan geçti.

**Kontrol:** App Store'da `UzmanDiyet` adında başka uygulama yok (TR mağazasında
28 sonuçluk "uzman diyet" taramasında çıkmadı). Yine de isim benzersizliği global
ve rezerve adları da kapsar — 1.2 sürümünü açtığında ASC alanı reddederse
alternatiflerden birine geç.

---

### Subtitle — 28/30 ✅
```
Kilo Verme ve Öğün Takibi AI
```

**Neden:** Mevcut altyazı `AI Destekli Diyet Asistanı`, yeni Name ile
"diyet" kelimesini tekrar ediyor. Apple, Name + Subtitle + Keywords'ü
**tek bir indeks havuzunda** birleştirir; tekrarlanan kelime boşa gider.
Yeni altyazı `kilo`, `verme`, `öğün`, `takibi` terimlerini havuza ekliyor.

**Alternatifler:**
| Aday | Uzunluk |
|---|---|
| `AI Asistan, Öğün ve Su Takibi` | 29 |
| `Kişiye Özel Plan, Öğün Takibi` | 29 |
| `Yapay Zekâ ile Kilo Verme` | 25 |

---

### Keywords — 90/100 ✅
```
zayıflama,beslenme,yemek,tarif,su,spor,egzersiz,fit,sağlıklı,plan,liste,program,vücut,ölçü
```

**Kurallar (uyuldu):**
- Name ve Subtitle'daki hiçbir kelime tekrar edilmedi (`diyet`, `kalori`, `kilo`,
  `öğün`, `takip`, `ai`, `uzman` burada **yok** — zaten indeksliler).
- Virgülden sonra **boşluk yok** (boşluk karakter yakar).
- Apple kelimeleri kendisi kombinler — `diyet planı`, `kalori takibi` gibi
  birleşik ifadeler yazmaya gerek yok.
- Rakip marka adı yok (`fatsecret`, `yazio`, `diyetkolik`… → reddedilme sebebi).
- `uygulama` / `app` gibi kelimeler yok.

Kalan 10 karakteri `,yapay` (+6) ile doldurabilirsin → 96/100.
`zeka` da eklemek 101 yapıyor, sığmıyor; onun yerine `program`ı çıkarabilirsin.

---

### Promotional Text — 151/170 ✅ *(bunu bugün girebilirsin)*
```
Sana özel diyet planı, günlük kalori hedefi ve öğün takibi. Tabağının fotoğrafını çek, yapay zekâ hesaplasın; aklına takılan her şeyi istediğin an sor.
```

Açıklamanın **üstünde** görünür ve aramada indekslenmez — sürüm gerektirmediği
için kampanya/duyuru metni olarak kullan.

**Alternatif (169/170):**
```
Bilgilerini gir, sana özel haftalık diyet planın ve günlük kalori hedefin hazır olsun. Tabağının fotoğrafını çek, yapay zekâ ne yediğini hesaplasın. Aklına takılanı sor.
```

---

### Kategori
| | Şu an | 1.2'de |
|---|---|---|
| Primary | Lifestyle | **Health & Fitness** |
| Secondary | Health & Fitness | **Lifestyle** *(veya Food & Drink)* |

Rakiplerin neredeyse tamamı Health & Fitness'ta: Diyetkolik, Diyet Talk, DiyetAI,
Heltia, Lifie, DairyFit… Lifestyle'da kalmak, kategori sıralamalarında (Top Free
Health & Fitness) hiç görünmemek demek.

---

### What's New (Release Notes)
1.1'de **boş bırakılmış** (`releaseNotes: null`). 1.2'de doldur:
```
• Uygulama adı ve kategorisi güncellendi
• Performans iyileştirmeleri ve hata düzeltmeleri
```

---

## 3. Description — yeniden yazıldı

### ⚠️ Bulunan sorun

Canlı listelemeyi çektiğimde ortaya çıkan şey, "uyarı yanlış yerde"den daha
ciddiydi: **açıklamanın tamamı sadece sağlık uyarısı.** 788 karakter, 15 satır,
başka hiçbir şey yok. Uygulamanın ne yaptığını anlatan tek bir cümle bile
bulunmuyor.

`APP_STORE_YENIDEN_GONDERIM.md` uyarıyı *"metnin sonuna"* eklemeyi söylüyordu;
uygulanırken metnin **yerine** geçmiş. App Store ürün sayfasında açıklamanın
yalnızca ilk 2-3 satırı görünür — yani şu an uygulamayı ilk kez gören kişi,
ne işe yaradığını değil, hukuki bir uyarı duvarını okuyor.

### Yeni metin — 2.345/4.000 karakter ✅

```
Yapay zekâ destekli kişisel diyet asistanın. Birkaç soruya cevap ver; sana özel haftalık beslenme programın, günlük kalori hedefin ve hedefe tahmini ulaşma süren dakikalar içinde hazır olsun.

NASIL ÇALIŞIR

1. Yaşını, boyunu, kilonu, hareket düzeyini ve hedefini gir.
2. Asistan sana özel programı oluşturur — günlük kalori hedefi ve tahmini süreyle birlikte.
3. Öğünlerini uygulama içinden takip et.
4. Aklına takılanı sor, değiştirmek istediğini söyle; program yeniden hesaplanır.

ÖNE ÇIKANLAR

• Kişiye özel program — Alerjilerini, sevmediklerini ve hareket düzeyini dikkate alan haftalık öğün planı.
• Tabak fotoğrafı analizi — Yemeğinin fotoğrafını çek, asistan tabaktakileri okusun ve kaloriyi hesaplasın. Yanlış okursa düzelt, hesap anında güncellensin.
• Öğün değiştirme — "Kahvaltıda peynir yerine omlet olur mu?" diye sor. Uygunsa onaylanır, kalori hesabın buna göre yenilenir.
• Sohbetle danışma — Beslenmeyle ilgili sorularını istediğin an yaz, yanıtını hemen al.
• Kalori ve öğün takibi — Günlük hedefine ne kadar yaklaştığını tek ekranda gör.
• Su takibi ve hatırlatıcılar — Öğün ve su hatırlatmalarını kendine göre ayarla.
• İlerleme grafikleri — Kilo ve ölçü değişimini zaman içinde takip et.
• Spor programı — Beslenme planını destekleyen egzersiz rehberi.
• Diyetisyen bul — Uzman diyetisyenleri incele, uygun saate randevu al, süreci birlikte yürüt.

KİMLER İÇİN

Kilo vermek, kilo almak veya mevcut kilosunu korumak isteyen; ne yediğini düzenli takip etmek ve beslenmesiyle ilgili sorularına anında yanıt bulmak isteyen herkes için.

ÖNEMLİ SAĞLIK UYARISI

UzmanDiyet bir sağlık hizmeti değildir. Uygulama tıbbi teşhis koymaz, hastalık tedavi etmez ve tıbbi tavsiye vermez. Sunulan beslenme önerileri, kalori hesaplamaları ve yapay zekâ yanıtları yalnızca genel bilgilendirme amaçlıdır.

Herhangi bir diyete başlamadan, beslenme düzeninizde değişiklik yapmadan ve sağlığınızla ilgili herhangi bir karar vermeden önce mutlaka doktorunuza veya kayıtlı bir diyetisyene danışın. Uygulamayı doktorunuzun tavsiyelerinin yerine değil, onlara ek olarak kullanın.

Hamilelik, emzirme, kronik hastalık (diyabet, kalp, böbrek, karaciğer rahatsızlıkları vb.), yeme bozukluğu öyküsü veya düzenli ilaç kullanımı durumunda uygulamayı hekim onayı almadan kullanmayın. Acil bir sağlık sorununuz varsa derhal bir sağlık kuruluşuna başvurun.
```

### Neye dikkat edildi

- **İlk 3 satır satış yapıyor.** "daha fazla"nın önünde kalan kısım artık
  ne olduğunu, ne verdiğini ve ne kadar sürdüğünü söylüyor.
- **Uyarı metni birebir korundu** — onaydan geçmiş hukuki metin; tek değişiklik
  satır sonlarının açılması. Eski hali ~78 karakterde sert sarılmıştı ve
  telefonda tırtıklı görünüyordu; App Store satır sonlarını olduğu gibi basar.
- **Fiyat, abonelik, premium geçmiyor.** iOS'ta IAP yok; açıklamada satın alınabilir
  bir şeyden bahsetmek Guideline 2.1(b)'nin tekrarı olurdu.
- **uzmandiyet.com'a yönlendirme yok.** Anti-steering (3.1.1) — 1.0'daki redlerden
  biri buydu.
- **Tıbbi iddia yok.** "tedavi", "hastalık çözümü", "diyetisyen yerine geçer" gibi
  ifadeler kullanılmadı (Guideline 1.4.1).
- **Sadece gerçekten var olan özellikler yazıldı.** Alt menüden doğrulandı
  (`src/components/app/bottom-nav.tsx`): Plan, Spor, Sohbet, İlerleme, Hatırlatıcı;
  ana ekrandaki iki giriş (`home-choices.tsx`): "AI Asistanla Diyete Başla" ve
  "Diyetisyen Bul". Olmayan özellik iddiası 2.3.1 (yanıltıcı metadata) demek.
- Eski taslakta duran *"Öğün fotoğrafı analizi (yakında)"* artık canlı, "yakında"
  ibaresi kaldırıldı.

> **Not:** Randevu/diyetisyen görüşmesi gerçek kişiden alınan bir hizmet olduğu
> için IAP zorunluluğunun dışında (Guideline 3.1.3(e)). Açıklamada yer alması
> sorun değil — fiyat yazılmadığı sürece.

---

## 4. App Store Connect'te uygulama sırası

1. **Bugün:** App Store → sol menü → *(mevcut sürüm)* → **Promotional Text** → yapıştır → **Save**
2. Sol üst → **`+ Version or Platform`** → **iOS** → sürüm numarası `1.2` → Create
3. Artık kilitli alanlar açılır:
   - **App Information** → Name, Subtitle, Primary/Secondary Category
   - **1.2 Prepare for Submission** → Description, Keywords, What's New
4. Ekran görüntüleri değişmeyecekse dokunma (1.1'dekiler taşınır).
5. Yeni bir build **gerekmez** — sadece metadata değiştiriyorsan mevcut build'i seçip
   gönderebilirsin. Yine de Xcode'da `Build` numarasını artırıp yeni bir yükleme
   yaparsan `1.2 (19)` gibi temiz bir eşleşme olur.
6. **Add for Review** → Submit. Sadece metadata değişikliği genelde 24 saatten kısa sürer.

---

## 5. Gönderim öncesi kontrol listesi

- [ ] Name ASC tarafından kabul edildi (benzersizlik)
- [ ] Subtitle ile Name arasında tekrarlanan kelime yok
- [ ] Keywords'te Name/Subtitle kelimeleri yok, virgül sonrası boşluk yok
- [ ] Keywords'te rakip marka adı yok
- [ ] Description bölüm 3'teki yeni metinle değiştirildi (uyarı **en sonda**)
- [ ] Description'da fiyat / abonelik / premium geçmiyor, uzmandiyet.com'a yönlendirme yok
- [ ] What's New dolu
- [ ] Primary Category = Health & Fitness
- [ ] Copyright alanı dolu (`© 2026 Ramazan Malaz`)
- [ ] Cihazdaki ad (`UzmanDiyet`) ile mağaza adı tutarlı
