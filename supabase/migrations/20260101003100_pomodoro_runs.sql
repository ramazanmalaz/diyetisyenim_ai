-- Canlı pomodoro timer'ının yaklaşan faz sınırları — uygulama kapalıyken push için.
--
-- Timer başlayınca/devam edince, gelecek faz geçişlerinin MUTLAK anını (IST gün-içi
-- dakikası) buraya yazar; cron o dakikada "sıradaki faz" bildirimi gönderir.
-- Duraklat/sıfırla/yeni config'te temizlenir. Böylece push, canlı timer'ın gerçek
-- fazlarıyla birebir aynı olur (cron kendi başına hesaplamaz).
--
-- (Eski public.pomodoro_plans tablosu/akışı hiç beslenmiyordu; bu tablo onun
-- yerine geçer.)
create table if not exists public.pomodoro_runs (
  client_id uuid not null references public.profiles (id) on delete cascade,
  run_date date not null,
  -- [{ at: <IST gün-içi dakika 0..1439>, mode: 'focus'|'short'|'long'|'lunch', pomodoro: int }]
  phases jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (client_id, run_date)
);

alter table public.pomodoro_runs enable row level security;

drop policy if exists "pomodoro_runs_self" on public.pomodoro_runs;
create policy "pomodoro_runs_self" on public.pomodoro_runs
  for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());
