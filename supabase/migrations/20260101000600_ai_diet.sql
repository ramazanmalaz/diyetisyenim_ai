-- AI Diyetisyen akışı — onboarding (intakes) + plan kalori/hedef alanları.

create type public.activity_level as enum (
  'sedentary',   -- hareketsiz
  'light',       -- hafif
  'moderate',    -- orta
  'active'       -- aktif
);
create type public.sex as enum ('female', 'male');

-- Onboarding yanıtları
create table public.intakes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  sex public.sex not null,
  age smallint not null check (age between 12 and 100),
  height_cm numeric(5, 1) not null,
  current_weight_kg numeric(5, 1) not null,
  activity_level public.activity_level not null default 'sedentary',
  -- Zorunlu şıklı sorudan: ne kadar sürede kaç kilo
  goal_loss_kg numeric(4, 1) not null,
  goal_weeks smallint not null check (goal_weeks between 1 and 104),
  health_notes text,
  dislikes text,
  created_at timestamptz not null default now()
);

create index intakes_client_idx on public.intakes (client_id, created_at);

alter table public.intakes enable row level security;

create policy "intakes_select"
  on public.intakes for select
  using (client_id = auth.uid() or public.is_staff(auth.uid()));

create policy "intakes_insert_self"
  on public.intakes for insert
  with check (client_id = auth.uid());

-- diet_plans: AI plan meta alanları
alter table public.diet_plans
  add column if not exists daily_calorie_target integer,
  add column if not exists estimated_weeks integer,
  add column if not exists goal_loss_kg numeric(4, 1),
  add column if not exists source text not null default 'manual';

-- meals: öğe başına kalori
alter table public.meals
  add column if not exists calories integer;
