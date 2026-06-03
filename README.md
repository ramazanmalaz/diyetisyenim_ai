# DiyetChat

Diyetisyen yönetiminde, **yapay zekâ (Claude) destekli** sohbet ve kişiye özel
diyet takip platformu. Danışanlar grup/birebir sohbet eder, diyet sorularına AI
yanıtı alır, planlarını ve ilerlemelerini takip eder, randevu alıp ödeme yapar.

> Mimari, kurallar ve kararlar için **[CLAUDE.md](./CLAUDE.md)** dosyasına bakın.

## Teknolojiler

- **Next.js 16** (App Router, Turbopack) · React 19 · TypeScript (strict)
- **Tailwind CSS 4** + küçük UI primitive'leri
- **Supabase** — Postgres, Auth, Realtime, Storage, RLS
- **Claude API** (`@anthropic-ai/sdk`) — beslenme asistanı
- **iyzico** — abonelik/ödeme
- **Vitest** (birim) · **Playwright** (E2E)

## Özellikler

| Modül | Danışan | Diyetisyen |
| --- | --- | --- |
| Sohbet | Grup + birebir, canlı (Realtime), AI yanıtı | Grup oluştur, üye yönet |
| Diyet planı | Aktif planı görüntüle | Plan + öğün oluştur/ata |
| İlerleme | Kilo/ölçü/su/foto + grafik | (okuma) |
| Randevu | Talep et / iptal | Onayla / tamamla / iptal |
| Ödeme | Abonelik öde, geçmiş | Tahsilat listesi |
| AI kuralları | — | Asistan davranışını düzenle |

## Kurulum

```bash
npm install
cp .env.example .env.local   # değerleri doldurun
npm run dev
```

### Ortam değişkenleri (`.env.local`)

| Değişken | Açıklama |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase API |
| `SUPABASE_SERVICE_ROLE_KEY` | Yalnızca sunucu (RLS atlar) |
| `ANTHROPIC_API_KEY` | Claude API (yalnızca sunucu) |
| `IYZICO_API_KEY` / `IYZICO_SECRET_KEY` / `IYZICO_BASE_URL` | iyzico |
| `NEXT_PUBLIC_APP_URL` | Uygulama temel URL'i |

### Veritabanı

Migration'lar `supabase/migrations/` altında. Bağlama ve diyetisyen rolü atama
adımları için **[supabase/README.md](./supabase/README.md)**.

```bash
npx supabase link --project-ref <REF>
npx supabase db push
npx supabase gen types typescript --linked > src/types/database.ts
```

## Komutlar

```bash
npm run dev          # geliştirme (Turbopack)
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run test         # Vitest (birim)
npm run test:e2e     # Playwright (önce: npx playwright install)
npm run format       # Prettier
```

## Yayın (Vercel)

1. Repoyu Vercel'e bağlayın (framework otomatik: Next.js).
2. Yukarıdaki tüm ortam değişkenlerini Vercel **Project Settings → Environment
   Variables** altına ekleyin. `NEXT_PUBLIC_APP_URL`'i canlı alan adınız yapın.
3. Supabase Auth → URL Configuration'da canlı alan adınızı **Redirect URLs**'e
   ekleyin (e-posta onayı `/auth/confirm`'e döner).
4. iyzico panelinde callback alan adınızı tanımlayın.
5. Deploy. (Migration'lar Supabase tarafında `db push` ile uygulanır.)

> Not: `iyzipay` paketi `next.config.ts` içinde `serverExternalPackages` ile
> harici tutulur (dinamik `require` nedeniyle).
