@AGENTS.md

# CLAUDE.md — DiyetChat (Diyet Danışmanlık Platformu)

Bu dosya, projede çalışan herkes (özellikle Claude Code) için **tek doğruluk kaynağıdır**.
Kod yazmadan önce bu dosyadaki kuralları uygula. Next.js'e özel kurallar için yukarıda
import edilen `AGENTS.md` dosyasını da dikkate al (kod yazmadan önce
`node_modules/next/dist/docs/` altındaki ilgili rehberi oku).

---

## 1. Proje Özeti

**DiyetChat**, bir diyetisyen tarafından yönetilen, WhatsApp grubu benzeri sohbet
deneyimi sunan bir web uygulamasıdır. Kullanıcılar:

- Grup ve birebir sohbet edebilir,
- Diyetle ilgili sorularına **yapay zekâ (Claude API)** üzerinden anında yanıt alabilir,
- Diyetisyenin oluşturduğu kişiye özel diyet planlarını görüntüleyebilir,
- Kilo / ölçü / su / öğün takibi yapabilir,
- Online randevu alıp ödeme yapabilir.

Diyetisyen (admin) tüm kullanıcıları, planları, randevuları ve ödemeleri yönetir.

### Roller
- **client** (danışan): Standart kullanıcı. Sohbet eder, planını görür, ilerlemesini girer, randevu/ödeme yapar.
- **dietitian / admin**: Tüm danışanları, planları, randevuları, ödemeleri ve AI davranış kurallarını yönetir.

---

## 2. Teknoloji Yığını

| Katman | Teknoloji | Not |
|---|---|---|
| Framework | **Next.js 16 (App Router)** | React 19, Server Components, Server Actions, Turbopack. ⚠️ Eğitim verisinden yeni — kod yazmadan önce `node_modules/next/dist/docs/` oku |
| Dil | **TypeScript** (strict) | `any` kullanma |
| UI | **Tailwind CSS** + **shadcn/ui** | Tutarlı, erişilebilir bileşenler |
| Backend / DB | **Supabase** (Postgres) | Auth, Realtime, Storage, RLS |
| Kimlik Doğrulama | **Supabase Auth** | Email/şifre + magic link |
| Gerçek Zamanlı | **Supabase Realtime** | Sohbet mesajları, presence |
| Dosya Depolama | **Supabase Storage** | Öğün fotoğrafları, plan PDF'leri |
| Yapay Zekâ | **Claude API** (`@anthropic-ai/sdk`) | Diyet sorularına yanıt. Varsayılan model: `claude-sonnet-4-6` (maliyet/kalite dengesi) |
| Ödeme | **iyzico** (TR) | Abonelik + tek seferlik. Stripe alternatif. |
| Form / Validasyon | **react-hook-form** + **zod** | Tüm formlarda zod şeması zorunlu |
| State (client) | **Zustand** (gerekirse) | Önce RSC/URL state tercih et |
| Test | **Vitest** + **Playwright** | Birim + E2E |
| Lint / Format | **ESLint** + **Prettier** | Commit öncesi temiz olmalı |
| Deploy | **Vercel** (frontend) + Supabase (cloud) | |

> Bu yığın değişmeden önce kullanıcıya sor. Yeni bir bağımlılık eklemeden önce
> mevcut bağımlılıklarla çözülüp çözülemeyeceğini değerlendir.

---

## 3. Mimari ve Klasör Yapısı

```
src/
  app/
    (auth)/              # giriş, kayıt, şifre sıfırlama
    (app)/               # giriş yapmış kullanıcı alanı
      chat/              # grup + birebir sohbet
      plan/              # diyet planı görüntüleme
      progress/          # ilerleme takibi
      appointments/      # randevu
      billing/           # ödeme / abonelik
    (admin)/             # sadece dietitian/admin
      clients/
      plans/
      ai-rules/          # AI davranış kuralları yönetimi
    api/
      ai/                # Claude API ile sohbet endpoint'i (streaming)
      webhooks/iyzico/   # ödeme webhook'ları
  components/            # paylaşılan UI bileşenleri (shadcn + özel)
  lib/
    supabase/            # server & client istemcileri
    ai/                  # Claude istemcisi, prompt şablonları, guardrail
    validations/         # zod şemaları
  hooks/
  types/                 # paylaşılan TS tipleri (DB tipleri dahil)
supabase/
  migrations/            # SQL migration dosyaları
  seed.sql
```

### Veri Modeli (özet)
- `profiles` (id→auth.users, role, full_name, avatar_url, dietitian_id)
- `conversations` (id, type: 'group' | 'direct', title)
- `conversation_members` (conversation_id, user_id)
- `messages` (id, conversation_id, sender_id, content, type: 'user'|'ai'|'system', created_at)
- `diet_plans` (id, client_id, created_by, title, status, valid_from, valid_to)
- `meals` (id, plan_id, day_of_week, meal_type, items_json)
- `progress_entries` (id, client_id, date, weight, measurements_json, water_ml, photo_url, note)
- `appointments` (id, client_id, dietitian_id, scheduled_at, status, notes)
- `payments` (id, client_id, amount, currency, provider, provider_ref, status)
- `ai_rules` (id, key, content) — diyetisyenin AI'a verdiği davranış kuralları

---

## 4. Güvenlik Kuralları (KRİTİK)

1. **RLS (Row Level Security) her tabloda açık olacak.** Yeni tablo = yeni RLS politikası. Politikasız tablo merge edilmez.
2. Bir danışan **yalnızca** kendi verisini ve üyesi olduğu konuşmaları görebilir. Diyetisyen kendi danışanlarını görebilir.
3. **Service role key yalnızca sunucuda** (API route / Server Action) kullanılır, asla client'a sızdırılmaz.
4. **Sırlar `.env.local` içinde**, repoya commit edilmez. `.env.example` güncel tutulur.
5. Tüm kullanıcı girdisi **zod ile** sunucu tarafında doğrulanır. Client validasyonu yeterli değildir.
6. Webhook'lar imza doğrulaması yapılmadan işlenmez.
7. Dosya yüklemelerinde tip/boyut sınırı + Storage RLS uygulanır.

---

## 5. Yapay Zekâ (Claude API) Kuralları

- AI yanıtları `src/lib/ai/` altından, **streaming** olarak verilir.
- **Sistem promptu** `ai_rules` tablosundan + sabit guardrail'lerden derlenir. Diyetisyen kuralları DB'den okunur.
- **Sağlık güvenliği guardrail'i (zorunlu):**
  - AI tıbbi teşhis koymaz, ilaç önermez.
  - Hamilelik, kronik hastalık, yeme bozukluğu, ciddi semptom sinyallerinde kullanıcıyı **diyetisyene/doktora yönlendirir**.
  - Aşırı düşük kalori veya tehlikeli diyet taleplerini reddeder.
- Her AI mesajı `messages` tablosuna `type='ai'` olarak kaydedilir (denetlenebilirlik).
- Maliyet kontrolü: uzun bağlam için **prompt caching** kullan; gereksiz geçmişi gönderme.
- API anahtarı yalnızca sunucuda (`ANTHROPIC_API_KEY`).

---

## 6. Kodlama Standartları

- **TypeScript strict**, `any` yasak — gerekiyorsa `unknown` + daraltma.
- Veri çekme **Server Components / Server Actions** ile; gereksiz `'use client'` ekleme.
- Bileşenler küçük ve tek sorumlu. İş mantığı `lib/` ve hook'larda, JSX'te değil.
- DB erişimi `lib/supabase` üzerinden; ham fetch dağıtma.
- Hata yönetimi: kullanıcıya anlamlı mesaj, sunucuda log. Sessizce yutma.
- Dosya/komponent isimleri açık ve İngilizce; kullanıcıya görünen metinler **Türkçe**.
- Mevcut koddaki stile uy: aynı isimlendirme, aynı desenler.
- Yorum yalnızca "neden" için; bariz olanı açıklama.

---

## 7. Komutlar

```bash
npm run dev          # geliştirme sunucusu (Turbopack)
npm run build        # production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest (birim)
npm run test:e2e     # Playwright
npx supabase start   # yerel Supabase
npx supabase db push # migration uygula
npx supabase gen types typescript --local > src/types/database.ts  # DB tiplerini üret
```

> Bir özelliği "bitti" demeden önce: `lint`, `typecheck` ve ilgili testler **geçmeli**.

---

## 8. Çalışma Akışı (Claude için)

1. Değişiklikten önce ilgili dosyaları oku, mevcut deseni anla.
2. DB değişikliği → önce `supabase/migrations` altında migration yaz, sonra tipleri yeniden üret.
3. Yeni tablo → RLS politikalarını **aynı PR'da** ekle.
4. Kullanıcıya görünen her metin Türkçe.
5. Büyük/geri alınması zor işlemlerde (şema silme, ödeme akışı değişikliği) önce onay iste.
6. İş bittiğinde ne yaptığını kısaca özetle; sahte "tamamlandı" deme — test/çıktı ile doğrula.

---

## 9. Ortam Değişkenleri (`.env.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # yalnızca sunucu
ANTHROPIC_API_KEY=                # yalnızca sunucu
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
IYZICO_BASE_URL=
NEXT_PUBLIC_APP_URL=
```
