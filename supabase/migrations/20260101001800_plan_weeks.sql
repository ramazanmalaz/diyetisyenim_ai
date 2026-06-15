-- Çok-haftalık program: her öğün hangi haftaya ait (0 tabanlı). Tek haftalık
-- planlar için 0 kalır. Plan, hedef süre boyunca bu haftaları döngüyle yayar.
alter table public.meals
  add column if not exists week_index smallint not null default 0;

create index if not exists meals_plan_week_idx
  on public.meals (plan_id, week_index, day_of_week);
