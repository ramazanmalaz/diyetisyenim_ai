-- iOS native push (APNs) cihaz token'ları.
--
-- Web Push abonelikleri `push_subscriptions` tablosunda kalıyor; bu tablo onun
-- yerine değil yanına geliyor. Ayrı tutulmasının sebebi: push_subscriptions'ın
-- birincil anahtarı `endpoint`, `p256dh`/`auth` ise not null — APNs'te bunların
-- karşılığı yok.
create table if not exists public.apns_tokens (
  token        text primary key,
  client_id    uuid not null references public.profiles (id) on delete cascade,
  -- Xcode'dan kurulan derleme sandbox APNs'e, TestFlight/App Store derlemesi
  -- production'a kaydolur. Yanlış ortama gönderim BadDeviceToken döner ve
  -- bildirim sessizce kaybolur; bu yüzden token hangi ortamdan geldiyse
  -- saklanıyor ve gönderim ona göre yönlendiriliyor.
  environment  text not null default 'production'
               check (environment in ('production', 'sandbox')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists apns_tokens_client_idx
  on public.apns_tokens (client_id);

alter table public.apns_tokens enable row level security;

-- push_subscriptions ile aynı desen: kullanıcı yalnızca kendi cihazlarını
-- görebilir/silebilir. Yazma çoğunlukla service-role ile yapılıyor.
drop policy if exists "apns_select_self" on public.apns_tokens;
create policy "apns_select_self"
  on public.apns_tokens for select
  using (client_id = auth.uid());

drop policy if exists "apns_insert_self" on public.apns_tokens;
create policy "apns_insert_self"
  on public.apns_tokens for insert
  with check (client_id = auth.uid());

drop policy if exists "apns_delete_self" on public.apns_tokens;
create policy "apns_delete_self"
  on public.apns_tokens for delete
  using (client_id = auth.uid());
