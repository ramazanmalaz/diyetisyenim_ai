-- Spor asistanı: AI üretimi antrenman programı. Program günleri + egzersizler
-- JSONB olarak tutulur (v1: görüntüleme; ileride satır-bazlı takip eklenebilir).
create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('bodyweight', 'gym')),
  level text,
  goal text,
  days_per_week smallint not null default 3 check (days_per_week between 1 and 7),
  equipment text[] not null default '{}',
  program jsonb not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

create index if not exists workout_plans_client_idx
  on public.workout_plans (client_id, status);

alter table public.workout_plans enable row level security;

drop policy if exists "workout_plans_self" on public.workout_plans;
create policy "workout_plans_self" on public.workout_plans
  for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());
