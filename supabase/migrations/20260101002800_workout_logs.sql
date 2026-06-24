-- Spor antrenman günü "yapıldı" kayıtları (tarih-bazlı). Bir program günü
-- (day_index) belirli bir tarihte tamamlandı olarak işaretlenir. Seri/istatistik
-- bu kayıtlardan hesaplanır.
create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users (id) on delete cascade,
  day_index smallint not null,
  log_date date not null,
  created_at timestamptz not null default now(),
  unique (client_id, day_index, log_date)
);

create index if not exists workout_logs_client_date_idx
  on public.workout_logs (client_id, log_date);

alter table public.workout_logs enable row level security;

drop policy if exists "workout_logs_self" on public.workout_logs;
create policy "workout_logs_self" on public.workout_logs
  for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());
