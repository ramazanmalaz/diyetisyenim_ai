-- Aşama 1 — Kimlik & Roller
-- profiles tablosu, rol sistemi, RLS politikaları ve tetikleyiciler.

-- Roller
create type public.user_role as enum ('client', 'dietitian', 'admin');

-- Profiller (auth.users ile birebir)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'client',
  full_name text,
  avatar_url text,
  -- Danışanın bağlı olduğu diyetisyen (yalnızca client rolü için anlamlı)
  dietitian_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_dietitian_id_idx on public.profiles (dietitian_id);

alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- Yardımcı fonksiyon: kullanıcı personel mi (diyetisyen/admin)?
-- SECURITY DEFINER + tablo sahibi olduğu için RLS'i atlar; böylece profiles
-- üzerindeki politika içinde profiles sorgulanırken sonsuz özyineleme olmaz.
-- ---------------------------------------------------------------------------
create or replace function public.is_staff(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role in ('dietitian', 'admin')
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS Politikaları
-- ---------------------------------------------------------------------------
-- Okuma: kullanıcı kendi profilini görebilir
create policy "profiles_select_self"
  on public.profiles for select
  using (auth.uid() = id);

-- Okuma: personel tüm profilleri görebilir
create policy "profiles_select_staff"
  on public.profiles for select
  using (public.is_staff(auth.uid()));

-- Güncelleme: kullanıcı kendi profilini güncelleyebilir
create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Güncelleme: personel tüm profilleri güncelleyebilir
create policy "profiles_update_staff"
  on public.profiles for update
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- INSERT yok: profil, kayıt anında tetikleyiciyle (SECURITY DEFINER) oluşturulur.

-- ---------------------------------------------------------------------------
-- Tetikleyici: rol yükseltmesini engelle + updated_at güncelle
-- Bir danışan kendi rolünü değiştiremez; yalnızca personel rol atayabilir.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_staff(auth.uid()) then
    raise exception 'Yetkisiz rol değişikliği';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------------
-- Tetikleyici: yeni auth.users kaydında otomatik profil oluştur
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
