-- Pomodoro odak planı (kullanıcı başına gün başına tek plan).
-- Kullanıcı o günkü çalışma penceresini (başlangıç/bitiş dakikası) ve
-- çalışma/mola sürelerini belirler; uygulama pencereyi otomatik seanslara böler.
-- start_min/end_min: gece yarısından itibaren dakika (0..1439).
-- muted: sesli uyarının kapalı olup olmadığı (cihazlar arası senkron).
-- completed_sessions: tamamlanan çalışma seansı sayısı (ilerleme).
create table if not exists public.pomodoro_plans (
  client_id uuid not null references public.profiles (id) on delete cascade,
  plan_date date not null,
  start_min smallint not null check (start_min between 0 and 1439),
  end_min smallint not null check (end_min between 0 and 1440),
  work_min smallint not null check (work_min between 1 and 600),
  break_min smallint not null default 0 check (break_min between 0 and 240),
  muted boolean not null default false,
  completed_sessions smallint not null default 0 check (completed_sessions >= 0),
  updated_at timestamptz not null default now(),
  primary key (client_id, plan_date),
  check (end_min > start_min)
);

alter table public.pomodoro_plans enable row level security;

create policy "pomodoro_select_self"
  on public.pomodoro_plans for select
  using (client_id = auth.uid());
create policy "pomodoro_insert_self"
  on public.pomodoro_plans for insert
  with check (client_id = auth.uid());
create policy "pomodoro_update_self"
  on public.pomodoro_plans for update
  using (client_id = auth.uid())
  with check (client_id = auth.uid());
create policy "pomodoro_delete_self"
  on public.pomodoro_plans for delete
  using (client_id = auth.uid());
