-- Diyetisyen çalışma alanı — danışan grupları + "kendi danışanı" yetki izolasyonu.
--
-- Bu migration'a kadar tüm personel politikaları `public.is_staff(auth.uid())`
-- kullanıyordu; yani HER diyetisyen TÜM danışanların profilini, planını,
-- ilerlemesini ve mesajlarını okuyabiliyordu. Gerçek (birden çok) diyetisyen
-- senaryosunda bu kabul edilemez → politikalar "admin ya da bu danışanın
-- diyetisyeni" şeklinde daraltılıyor.
--
-- Idempotent yazıldı (create ... if not exists + drop policy if exists).

-- ---------------------------------------------------------------------------
-- 1. Yetki yardımcıları (SECURITY DEFINER → policy'ler arasında özyineleme yok)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

-- Geçerli kullanıcı bu danışanın verisine erişebilir mi?
--   • kendi verisi, ya da
--   • admin, ya da
--   • danışanın bağlı olduğu diyetisyen
create or replace function public.can_access_client(client uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    client = auth.uid()
    or public.is_admin(auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = client and p.dietitian_id = auth.uid()
    );
$$;

-- ---------------------------------------------------------------------------
-- 2. Danışan grupları (diyetisyenin kendi segmentleri; her grup bir sohbete bağlı)
-- ---------------------------------------------------------------------------
create table if not exists public.client_groups (
  id uuid primary key default gen_random_uuid(),
  dietitian_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  note text,
  -- Grubun WhatsApp benzeri toplu sohbeti (lazy oluşturulur).
  conversation_id uuid references public.conversations (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists client_groups_dietitian_idx
  on public.client_groups (dietitian_id);

create table if not exists public.client_group_members (
  group_id uuid not null references public.client_groups (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (group_id, client_id)
);

create index if not exists client_group_members_client_idx
  on public.client_group_members (client_id);

alter table public.client_groups enable row level security;
alter table public.client_group_members enable row level security;

-- Grup sahipliği / üyeliği — SECURITY DEFINER, aksi halde iki tablonun
-- politikaları birbirini çağırıp özyinelemeye girer.
create or replace function public.owns_client_group(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.client_groups g
    where g.id = gid
      and (g.dietitian_id = auth.uid() or public.is_admin(auth.uid()))
  );
$$;

create or replace function public.is_client_group_member(gid uuid, uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.client_group_members m
    where m.group_id = gid and m.client_id = uid
  );
$$;

drop policy if exists "client_groups_select" on public.client_groups;
create policy "client_groups_select"
  on public.client_groups for select
  using (
    dietitian_id = auth.uid()
    or public.is_admin(auth.uid())
    or public.is_client_group_member(id, auth.uid())
  );

drop policy if exists "client_groups_write_owner" on public.client_groups;
create policy "client_groups_write_owner"
  on public.client_groups for all
  using (dietitian_id = auth.uid() or public.is_admin(auth.uid()))
  with check (dietitian_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "client_group_members_select" on public.client_group_members;
create policy "client_group_members_select"
  on public.client_group_members for select
  using (client_id = auth.uid() or public.owns_client_group(group_id));

drop policy if exists "client_group_members_write_owner" on public.client_group_members;
create policy "client_group_members_write_owner"
  on public.client_group_members for all
  using (public.owns_client_group(group_id))
  with check (public.owns_client_group(group_id));

-- ---------------------------------------------------------------------------
-- 3. profiles — personel her profili değil, yalnızca kendi danışanlarını görür
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_staff" on public.profiles;
create policy "profiles_select_staff"
  on public.profiles for select
  using (public.is_admin(auth.uid()) or dietitian_id = auth.uid());

drop policy if exists "profiles_update_staff" on public.profiles;
create policy "profiles_update_staff"
  on public.profiles for update
  using (public.is_admin(auth.uid()) or dietitian_id = auth.uid())
  with check (public.is_admin(auth.uid()) or dietitian_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. diet_plans / meals — danışan bazlı
-- ---------------------------------------------------------------------------
drop policy if exists "diet_plans_select" on public.diet_plans;
create policy "diet_plans_select"
  on public.diet_plans for select
  using (public.can_access_client(client_id));

drop policy if exists "diet_plans_insert_staff" on public.diet_plans;
create policy "diet_plans_insert_staff"
  on public.diet_plans for insert
  with check (public.can_access_client(client_id));

drop policy if exists "diet_plans_update_staff" on public.diet_plans;
create policy "diet_plans_update_staff"
  on public.diet_plans for update
  using (public.can_access_client(client_id))
  with check (public.can_access_client(client_id));

drop policy if exists "diet_plans_delete_staff" on public.diet_plans;
create policy "diet_plans_delete_staff"
  on public.diet_plans for delete
  using (public.can_access_client(client_id));

drop policy if exists "meals_select" on public.meals;
create policy "meals_select"
  on public.meals for select
  using (
    exists (
      select 1 from public.diet_plans p
      where p.id = meals.plan_id and public.can_access_client(p.client_id)
    )
  );

drop policy if exists "meals_insert_staff" on public.meals;
create policy "meals_insert_staff"
  on public.meals for insert
  with check (
    exists (
      select 1 from public.diet_plans p
      where p.id = meals.plan_id and public.can_access_client(p.client_id)
    )
  );

drop policy if exists "meals_update_staff" on public.meals;
create policy "meals_update_staff"
  on public.meals for update
  using (
    exists (
      select 1 from public.diet_plans p
      where p.id = meals.plan_id and public.can_access_client(p.client_id)
    )
  )
  with check (
    exists (
      select 1 from public.diet_plans p
      where p.id = meals.plan_id and public.can_access_client(p.client_id)
    )
  );

drop policy if exists "meals_delete_staff" on public.meals;
create policy "meals_delete_staff"
  on public.meals for delete
  using (
    exists (
      select 1 from public.diet_plans p
      where p.id = meals.plan_id and public.can_access_client(p.client_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 5. progress_entries — diyetisyen kendi danışanının ilerlemesini görür
--    (yazma hâlâ yalnızca danışanın kendisinde)
-- ---------------------------------------------------------------------------
drop policy if exists "progress_select" on public.progress_entries;
create policy "progress_select"
  on public.progress_entries for select
  using (public.can_access_client(client_id));

-- ---------------------------------------------------------------------------
-- 6. Sohbet — personel "her konuşmayı" değil, üyesi olduğu konuşmayı görür
-- ---------------------------------------------------------------------------
drop policy if exists "conversations_select" on public.conversations;
create policy "conversations_select"
  on public.conversations for select
  using (
    public.is_admin(auth.uid())
    or public.is_conversation_member(id, auth.uid())
  );

drop policy if exists "messages_select" on public.messages;
create policy "messages_select"
  on public.messages for select
  using (
    public.is_admin(auth.uid())
    or public.is_conversation_member(conversation_id, auth.uid())
  );

drop policy if exists "members_select" on public.conversation_members;
create policy "members_select"
  on public.conversation_members for select
  using (
    user_id = auth.uid()
    or public.is_admin(auth.uid())
    or public.is_conversation_member(conversation_id, auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 7. guard_profile_update düzeltmesi
--
-- Eski hâli rol değişimini `not is_staff(auth.uid())` ile koruyordu. Bu iki
-- soruna yol açıyordu:
--   (a) service-role ile (auth.uid() null) rol atanamıyordu → "Yeni diyetisyen
--       hesabı oluştur" formu "Rol atanamadı." ile başarısız oluyordu.
--   (b) diyetisyen de "staff" sayıldığı için danışanının rolünü değiştirebiliyordu.
-- Düzeltme: rol değişimi yalnızca admin ya da sunucu (service-role) tarafından.
-- premium_until kuralı da aynı şekilde admin'e daraltılıyor (diyetisyen kendi
-- danışanına premium'u yine uygulama katmanından service-role ile veriyor).
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Rol değişimi: yalnızca admin ya da service-role (auth.uid() null).
  -- Anon istek zaten RLS'i geçemediği için auth.uid() null = güvenilen sunucu.
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin(auth.uid()) then
    raise exception 'Yetkisiz rol değişikliği';
  end if;

  -- premium_until: yalnızca personel ya da service-role (ödeme callback'i).
  if new.premium_until is distinct from old.premium_until
     and auth.uid() is not null
     and not public.is_staff(auth.uid()) then
    raise exception 'Yetkisiz premium değişikliği';
  end if;

  new.updated_at = now();
  return new;
end;
$$;
