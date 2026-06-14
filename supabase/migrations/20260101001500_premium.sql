-- Freemium: premium erişim süresi + günlük AI kullanım sayaçları.

-- Premium erişim bitiş anı (null/geçmiş = ücretsiz kullanıcı).
-- Ödeme "paid" olunca webhook bunu now()+30 güne çeker (varsa uzatır).
alter table public.profiles
  add column if not exists premium_until timestamptz;

-- Günlük AI kullanımı (kullanıcı + gün başına). Ücretsiz kullanıcıya:
-- chat_count <= 5/gün, vision_count <= 1/gün. Premium sınırsız.
create table if not exists public.ai_usage (
  client_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  chat_count integer not null default 0 check (chat_count >= 0),
  vision_count integer not null default 0 check (vision_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (client_id, day)
);

alter table public.ai_usage enable row level security;

-- Kullanıcı kendi kullanımını görebilir (yazma sunucuda service-role ile yapılır).
create policy "ai_usage_select_self"
  on public.ai_usage for select
  using (client_id = auth.uid());
