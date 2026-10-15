-- Apple Sağlık entegrasyonu: telefondan (ve Apple Watch'tan) okunan günlük
-- özetler + antrenmanlar. Kilo ayrı tablo değil, progress_entries'e yazılır.

-- Günlük özet (İstanbul gününe göre). Sağlık'tan her senkronda üzerine yazılır.
create table if not exists public.health_daily (
  client_id      uuid not null references public.profiles (id) on delete cascade,
  day            date not null,
  steps          integer check (steps between 0 and 200000),
  active_kcal    integer check (active_kcal between 0 and 20000),
  sleep_minutes  integer check (sleep_minutes between 0 and 1440),
  resting_hr     smallint check (resting_hr between 20 and 250),
  updated_at     timestamptz not null default now(),
  primary key (client_id, day)
);

alter table public.health_daily enable row level security;

drop policy if exists "health_daily_select" on public.health_daily;
create policy "health_daily_select" on public.health_daily
  for select using (client_id = auth.uid() or public.is_staff(auth.uid()));

drop policy if exists "health_daily_write_self" on public.health_daily;
create policy "health_daily_write_self" on public.health_daily
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());

-- Antrenmanlar (Apple Watch / iPhone / üçüncü parti uygulamalar).
create table if not exists public.health_workouts (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.profiles (id) on delete cascade,
  platform_id    text not null,         -- HealthKit UUID; tekrar senkronda çift kayıt olmasın
  workout_type   text not null,
  started_at     timestamptz not null,
  duration_min   numeric(6, 1) not null check (duration_min >= 0),
  kcal           integer check (kcal >= 0),
  distance_m     integer check (distance_m >= 0),
  source         text,
  created_at     timestamptz not null default now(),
  unique (client_id, platform_id)
);

create index if not exists health_workouts_client_idx
  on public.health_workouts (client_id, started_at);

alter table public.health_workouts enable row level security;

drop policy if exists "health_workouts_select" on public.health_workouts;
create policy "health_workouts_select" on public.health_workouts
  for select using (client_id = auth.uid() or public.is_staff(auth.uid()));

drop policy if exists "health_workouts_write_self" on public.health_workouts;
create policy "health_workouts_write_self" on public.health_workouts
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());

-- Bağlantı durumu: ilk bağlanma ve son senkron zamanı.
alter table public.profiles
  add column if not exists health_connected_at timestamptz,
  add column if not exists health_synced_at timestamptz;
