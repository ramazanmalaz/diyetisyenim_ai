-- Kullanıcının günlük toplam su hedefi (su sayacında gösterilir). Önceden
-- WaterTracker'da sabit 2500 ml idi.
alter table public.profiles
  add column if not exists water_goal_ml smallint not null default 2500;
