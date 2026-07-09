# LinkedIn Yazısı — UzmanDiyet

---

Sıfırdan bir AI diyet uygulaması inşa ettim ve App Store'a gönderdim. İşte 3 aylık yolculuk 👇

Bir gün "yapay zeka gerçekten kişisel diyetisyen gibi davranabilir mi?" diye sordum kendime. Cevabı test etmek yerine, inşa etmeye karar verdim.

Sonuç: **UzmanDiyet** — yapay zekâ destekli kişisel diyet asistanı.

---

**🏗️ Teknik yığın**

Tek bir teknoloji seçmek zorunda değilken, her katman için en doğru aracı seçmeye çalıştım:

→ **Next.js 16 (App Router)** — Server Components + Server Actions ile veritabanı sorgularını istemciye hiç sızdırmadan çalıştıran bir mimari. Gereksiz API route yazmak yok.

→ **Supabase** — Auth, PostgreSQL, Realtime ve Storage tek çatı altında. Row Level Security ile her kullanıcı yalnızca kendi verisini görüyor; hiçbir satır politikasız bırakılmadı.

→ **Claude API (Anthropic)** — Diyet planı üretimi, ikame sorguları, sağlık guardrail'leri. Yapılandırılmış JSON çıktısıyla AI'ın ürettiği plan doğrudan veritabanına yazılıyor; serbest metin değil.

→ **Capacitor 8 (SPM)** — Aynı Next.js codebase'den iOS native uygulama. CocoaPods değil Swift Package Manager; daha temiz bağımlılık yönetimi.

→ **GitHub Actions** — Tag push'ta otomatik tetiklenen CI/CD. Sertifika yönetimi, Xcode archive, IPA export ve App Store Connect'e yükleme tek pipeline'da.

---

**🤖 Uygulamayı farklı kılan ne?**

Klasik diyet uygulamaları sizi form doldurmaya zorlar. UzmanDiyet'te **tek bir giriş noktası var: sohbet penceresi.**

Kullanıcı bir diyetisyenle konuşur gibi ilerliyor:

**1. Tanışma** — AI soru soruyor: yaş, kilo, boy, hareket düzeyi, hedef ("kaç haftada kaç kilo?"). Çoktan seçmeli sorularla yapılandırılmış veri toplama.

**2. Kişisel plan** — Yanıtlardan otomatik haftalık diyet programı üretiliyor. Her öğünün kalori değeri hesaplanıyor, günlük hedef belirleniyor.

**3. Gerçek zamanlı danışma** — "Kahvaltıda omlet peynir yerine geçer mi?" → AI kaloriye etkisini hesaplayıp onaylıyor ya da reddediyor. Kullanıcı programı değiştiriyor, kalori anında güncelleniyor.

**4. Güvenlik guardrail'leri** — AI tıbbi teşhis koymuyor. Hamilelik, kronik hastalık veya aşırı düşük kalori taleplerinde kullanıcıyı doktora yönlendiriyor. Bu kurallar kod içine sabit gömülü değil; yönetim panelinden yönetilebiliyor.

---

**📱 Web → iOS yolculuğu**

Beni en çok zorlayan kısım buydu.

Capacitor ile web uygulamasını iOS'a taşıdım. Ama her şey teoride basit görünüyor; pratikte:

- Node.js sürüm uyumsuzluğu
- SPM vs CocoaPods karmaşası
- Apple provisioning profile hataları
- iOS SDK sürümü ile runner uyumsuzluğu
- iPad multitasking validation hatası

6 farklı hata, 6 farklı tag, 6 farklı düzeltme. v1.0.6'da ilk yeşil build geldi. O anın tadı tarif edilemez. 🟢

---

**🛠️ Geliştirme sürecinde kullandığım diğer araçlar**

- **Claude Code** — Kod yazarken AI ile pair programming. Özellikle Supabase migration'ları ve karmaşık TypeScript tiplerinde.
- **Puppeteer** — App Store ekran görüntülerini (15 farklı boyut) otomatik üretmek için.
- **Playwright** — E2E testleri ve UI koordinat ölçümleri.
- **Vitest** — Birim testleri.

---

**💡 Öğrendiklerim**

Bir şeyin "teknik olarak mümkün" olması ile "gerçek kullanıcıya değer üretmesi" arasındaki mesafe, çoğu zaman tasarım kararlarında gizli.

UzmanDiyet'te beni en çok zorlayan soru şuydu: **"Kullanıcı uygulamayı açtığında ne görmeli?"**

Cevap bir form değil, bir sohbet oldu. Bu karar her şeyi değiştirdi.

---

Şu an App Store inceleme aşamasında. Yakında yayında olacak.

Siz bir ürün geliştirirken hangi teknik kararın en büyük farkı yarattığını düşünüyorsunuz? Yorumlarda buluşalım. 👇

#AI #iOS #NextJS #Supabase #IndieHacker #AppDevelopment #HealthTech #ClaudeAPI #MobileApp #Capacitor
