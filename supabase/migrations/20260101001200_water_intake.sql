-- Günlük su takibi (kullanıcı başına gün başına toplam ml).
create table if not exists public.water_intake (
  client_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  total_ml integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (client_id, day)
);

alter table public.water_intake enable row level security;

create policy "water_select_self"
  on public.water_intake for select
  using (client_id = auth.uid());
create policy "water_insert_self"
  on public.water_intake for insert
  with check (client_id = auth.uid());
create policy "water_update_self"
  on public.water_intake for update
  using (client_id = auth.uid())
  with check (client_id = auth.uid());
create policy "water_delete_self"
  on public.water_intake for delete
  using (client_id = auth.uid());
