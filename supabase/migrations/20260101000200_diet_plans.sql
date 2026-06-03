-- Aşama 4 — Diyet planı yönetimi
-- diet_plans (kişiye özel plan) ve meals (plan içindeki öğünler).

create type public.plan_status as enum ('draft', 'active', 'archived');
create type public.meal_type as enum (
  'breakfast',
  'snack_morning',
  'lunch',
  'snack_afternoon',
  'dinner'
);

create table public.diet_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  title text not null,
  status public.plan_status not null default 'draft',
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index diet_plans_client_id_idx on public.diet_plans (client_id);
create index diet_plans_status_idx on public.diet_plans (status);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.diet_plans (id) on delete cascade,
  -- 0=Pazartesi ... 6=Pazar
  day_of_week smallint not null check (day_of_week between 0 and 6),
  meal_type public.meal_type not null,
  content text not null default '',
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index meals_plan_id_idx on public.meals (plan_id);

alter table public.diet_plans enable row level security;
alter table public.meals enable row level security;

-- ---------------------------------------------------------------------------
-- diet_plans RLS
-- ---------------------------------------------------------------------------
-- Danışan kendi planlarını görür; personel tümünü görür.
create policy "diet_plans_select"
  on public.diet_plans for select
  using (client_id = auth.uid() or public.is_staff(auth.uid()));

-- Yalnızca personel plan oluşturur/günceller/siler.
create policy "diet_plans_insert_staff"
  on public.diet_plans for insert
  with check (public.is_staff(auth.uid()));

create policy "diet_plans_update_staff"
  on public.diet_plans for update
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

create policy "diet_plans_delete_staff"
  on public.diet_plans for delete
  using (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- meals RLS — sahiplik plana göre türetilir
-- ---------------------------------------------------------------------------
create policy "meals_select"
  on public.meals for select
  using (
    public.is_staff(auth.uid())
    or exists (
      select 1 from public.diet_plans p
      where p.id = meals.plan_id and p.client_id = auth.uid()
    )
  );

create policy "meals_insert_staff"
  on public.meals for insert
  with check (public.is_staff(auth.uid()));

create policy "meals_update_staff"
  on public.meals for update
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

create policy "meals_delete_staff"
  on public.meals for delete
  using (public.is_staff(auth.uid()));

-- updated_at otomatik güncelle
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger diet_plans_touch
  before update on public.diet_plans
  for each row execute function public.touch_updated_at();
