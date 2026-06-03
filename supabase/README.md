# Supabase Kurulumu

Bu klasör veritabanı şemasını (migration'lar) içerir. Kod, Supabase olmadan da
derlenir; ancak çalıştırmak/test etmek için bir Supabase projesi gerekir.

## Bulut (cloud) ile bağlama

1. https://supabase.com adresinde ücretsiz bir proje oluştur.
2. **Project Settings → API**'den şu değerleri `.env.local`'e yaz:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Supabase CLI'yi bağla ve migration'ları uygula:
   ```bash
   npx supabase login
   npx supabase link --project-ref <PROJE_REF>
   npx supabase db push
   ```
4. DB tiplerini gerçek şemadan yeniden üret (elle yazılan tipin yerine geçer):
   ```bash
   npx supabase gen types typescript --linked > src/types/database.ts
   ```

## Yerel (Docker) ile çalıştırma

```bash
npx supabase init      # mevcut migrations korunur
npx supabase start     # Docker gerektirir
npx supabase gen types typescript --local > src/types/database.ts
```

## Bir kullanıcıyı diyetisyen/admin yapma

Henüz rol atama arayüzü yok. İlk diyetisyeni SQL ile yükselt
(Supabase Studio → SQL Editor):

```sql
update public.profiles
set role = 'dietitian'
where id = (select id from auth.users where email = 'diyetisyen@example.com');
```

Giriş yaptığında `client` rolündeki kullanıcılar `/panel`'e, `dietitian`/`admin`
rolündekiler `/yonetim`'e yönlendirilir.

## E-posta onayı

Geliştirmede e-posta onayını kapatmak istersen: **Authentication → Providers →
Email → "Confirm email"** seçeneğini kapat. Açık bırakırsan kayıt sonrası gelen
bağlantı `/auth/confirm` route'una düşer ve oturumu açar.
