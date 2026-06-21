-- Tarih-bazlı öğün günlüğü: kullanıcının belirli bir GÜNDE bir öğünü yiyip
-- yemediğini kaydeder. Eski model (meals.checked) şablon satırında tutuyordu →
-- her hafta aynı güne taşınıyor, "bugün gerçekleşen" tarih-doğru olmuyordu.
-- Bu tablo (client_id, meal_id, log_date) bazında 'eaten'/'skipped' tutar;
-- böylece günlük özet doğru, her gün otomatik temiz başlar ve geçmiş saklanır
-- (ileride seri/istatistik için).

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users (id) on delete cascade,
  meal_id uuid not null references public.meals (id) on delete cascade,
  log_date date not null,
  status text not null default 'eaten' check (status in ('eaten', 'skipped')),
  created_at timestamptz not null default now(),
  unique (client_id, meal_id, log_date)
);

create index if not exists meal_logs_client_date_idx
  on public.meal_logs (client_id, log_date);

alter table public.meal_logs enable row level security;

-- Danışan yalnızca kendi günlüğünü görür/yazar.
drop policy if exists "meal_logs_self" on public.meal_logs;
create policy "meal_logs_self" on public.meal_logs
  for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());
