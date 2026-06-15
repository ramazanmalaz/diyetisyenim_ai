-- Web Push abonelikleri (cihaz başına) + sunucu tarafı su hatırlatıcı tercihi.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  client_id uuid not null references public.profiles (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_client_idx
  on public.push_subscriptions (client_id);

alter table public.push_subscriptions enable row level security;

-- Kullanıcı kendi aboneliklerini yönetebilir (yazma çoğunlukla service-role ile).
create policy "push_select_self"
  on public.push_subscriptions for select
  using (client_id = auth.uid());
create policy "push_insert_self"
  on public.push_subscriptions for insert
  with check (client_id = auth.uid());
create policy "push_delete_self"
  on public.push_subscriptions for delete
  using (client_id = auth.uid());

-- Su hatırlatıcısı tercihi (sunucu cron'u bunu okur).
alter table public.profiles
  add column if not exists water_reminder_enabled boolean not null default true;
