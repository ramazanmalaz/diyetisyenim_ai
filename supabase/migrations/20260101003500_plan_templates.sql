-- Diyet planı ŞABLONLARI.
--
-- Diyetisyen tekrar tekrar kullanacağı programları "şablon" olarak saklar,
-- danışana atarken şablonun KOPYASI oluşur (şablon tükenmez, danışanın kopyası
-- bağımsız düzenlenebilir).
--
-- Model: ayrı tablo yerine diet_plans üzerinde `is_template` + nullable
-- client_id. Böylece mevcut `meals` tablosu, plan editörü ve tüm plan akışı
-- olduğu gibi yeniden kullanılır.

alter table public.diet_plans alter column client_id drop not null;

alter table public.diet_plans
  add column if not exists is_template boolean not null default false;

create index if not exists diet_plans_template_idx
  on public.diet_plans (created_by)
  where is_template;

-- Şablonun sahibi yoktur (client_id null) → can_access_client çalışmaz.
-- Erişim: şablonu oluşturan diyetisyen ya da admin.
create or replace function public.can_access_plan(plan uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.diet_plans dp
    where dp.id = plan
      and (
        (dp.client_id is not null and public.can_access_client(dp.client_id))
        or (dp.client_id is null
            and (dp.created_by = auth.uid() or public.is_admin(auth.uid())))
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- diet_plans RLS — şablonları (client_id null) sahibine aç
-- ---------------------------------------------------------------------------
drop policy if exists "diet_plans_select" on public.diet_plans;
create policy "diet_plans_select"
  on public.diet_plans for select
  using (
    (client_id is not null and public.can_access_client(client_id))
    or (client_id is null
        and (created_by = auth.uid() or public.is_admin(auth.uid())))
  );

drop policy if exists "diet_plans_insert_staff" on public.diet_plans;
create policy "diet_plans_insert_staff"
  on public.diet_plans for insert
  with check (
    (client_id is not null and public.can_access_client(client_id))
    or (client_id is null and created_by = auth.uid())
  );

drop policy if exists "diet_plans_update_staff" on public.diet_plans;
create policy "diet_plans_update_staff"
  on public.diet_plans for update
  using (
    (client_id is not null and public.can_access_client(client_id))
    or (client_id is null
        and (created_by = auth.uid() or public.is_admin(auth.uid())))
  )
  with check (
    (client_id is not null and public.can_access_client(client_id))
    or (client_id is null
        and (created_by = auth.uid() or public.is_admin(auth.uid())))
  );

drop policy if exists "diet_plans_delete_staff" on public.diet_plans;
create policy "diet_plans_delete_staff"
  on public.diet_plans for delete
  using (
    (client_id is not null and public.can_access_client(client_id))
    or (client_id is null
        and (created_by = auth.uid() or public.is_admin(auth.uid())))
  );

-- ---------------------------------------------------------------------------
-- meals RLS — plan üzerinden (şablon öğünleri dahil)
-- ---------------------------------------------------------------------------
drop policy if exists "meals_select" on public.meals;
create policy "meals_select"
  on public.meals for select
  using (public.can_access_plan(plan_id));

drop policy if exists "meals_insert_staff" on public.meals;
create policy "meals_insert_staff"
  on public.meals for insert
  with check (public.can_access_plan(plan_id));

drop policy if exists "meals_update_staff" on public.meals;
create policy "meals_update_staff"
  on public.meals for update
  using (public.can_access_plan(plan_id))
  with check (public.can_access_plan(plan_id));

drop policy if exists "meals_delete_staff" on public.meals;
create policy "meals_delete_staff"
  on public.meals for delete
  using (public.can_access_plan(plan_id));
