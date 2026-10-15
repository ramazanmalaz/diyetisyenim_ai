-- Android native push (Firebase Cloud Messaging) cihaz token'ları.
-- apns_tokens'ın Android karşılığı; aynı desen (bkz. 20260101003700_apns.sql).
create table if not exists public.fcm_tokens (
  token        text primary key,
  client_id    uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists fcm_tokens_client_idx on public.fcm_tokens (client_id);

alter table public.fcm_tokens enable row level security;

-- Kullanıcı yalnızca kendi cihazlarını görebilir/silebilir; yazma service-role ile.
drop policy if exists "fcm_select_self" on public.fcm_tokens;
create policy "fcm_select_self" on public.fcm_tokens
  for select using (client_id = auth.uid());

drop policy if exists "fcm_insert_self" on public.fcm_tokens;
create policy "fcm_insert_self" on public.fcm_tokens
  for insert with check (client_id = auth.uid());

drop policy if exists "fcm_delete_self" on public.fcm_tokens;
create policy "fcm_delete_self" on public.fcm_tokens
  for delete using (client_id = auth.uid());
