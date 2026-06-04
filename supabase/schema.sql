-- DiyetChat — tüm şema (migration'ların birleşimi). Supabase SQL Editor'e yapıştırın.


-- ============================================================
-- 20260101000000_init_profiles.sql
-- ============================================================
-- AÅŸama 1 â€” Kimlik & Roller
-- profiles tablosu, rol sistemi, RLS politikalarÄ± ve tetikleyiciler.

-- Roller
create type public.user_role as enum ('client', 'dietitian', 'admin');

-- Profiller (auth.users ile birebir)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'client',
  full_name text,
  avatar_url text,
  -- DanÄ±ÅŸanÄ±n baÄŸlÄ± olduÄŸu diyetisyen (yalnÄ±zca client rolÃ¼ iÃ§in anlamlÄ±)
  dietitian_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_dietitian_id_idx on public.profiles (dietitian_id);

alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- YardÄ±mcÄ± fonksiyon: kullanÄ±cÄ± personel mi (diyetisyen/admin)?
-- SECURITY DEFINER + tablo sahibi olduÄŸu iÃ§in RLS'i atlar; bÃ¶ylece profiles
-- Ã¼zerindeki politika iÃ§inde profiles sorgulanÄ±rken sonsuz Ã¶zyineleme olmaz.
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
-- RLS PolitikalarÄ±
-- ---------------------------------------------------------------------------
-- Okuma: kullanÄ±cÄ± kendi profilini gÃ¶rebilir
create policy "profiles_select_self"
  on public.profiles for select
  using (auth.uid() = id);

-- Okuma: personel tÃ¼m profilleri gÃ¶rebilir
create policy "profiles_select_staff"
  on public.profiles for select
  using (public.is_staff(auth.uid()));

-- GÃ¼ncelleme: kullanÄ±cÄ± kendi profilini gÃ¼ncelleyebilir
create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- GÃ¼ncelleme: personel tÃ¼m profilleri gÃ¼ncelleyebilir
create policy "profiles_update_staff"
  on public.profiles for update
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- INSERT yok: profil, kayÄ±t anÄ±nda tetikleyiciyle (SECURITY DEFINER) oluÅŸturulur.

-- ---------------------------------------------------------------------------
-- Tetikleyici: rol yÃ¼kseltmesini engelle + updated_at gÃ¼ncelle
-- Bir danÄ±ÅŸan kendi rolÃ¼nÃ¼ deÄŸiÅŸtiremez; yalnÄ±zca personel rol atayabilir.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_staff(auth.uid()) then
    raise exception 'Yetkisiz rol deÄŸiÅŸikliÄŸi';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------------
-- Tetikleyici: yeni auth.users kaydÄ±nda otomatik profil oluÅŸtur
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


-- ============================================================
-- 20260101000100_ai_rules.sql
-- ============================================================
-- AÅŸama 3 â€” AI yanÄ±t sistemi
-- Diyetisyenin AI asistanÄ±na verdiÄŸi davranÄ±ÅŸ kurallarÄ±.

create table public.ai_rules (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  content text not null default '',
  is_active boolean not null default true,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.ai_rules enable row level security;

-- YalnÄ±zca personel (diyetisyen/admin) okur ve yÃ¶netir.
-- DanÄ±ÅŸanlar bu tabloyu doÄŸrudan okuyamaz; AI yanÄ±tÄ± Ã¼retilirken kurallar
-- sunucuda service-role istemcisiyle okunur (RLS atlanÄ±r).
create policy "ai_rules_select_staff"
  on public.ai_rules for select
  using (public.is_staff(auth.uid()));

create policy "ai_rules_insert_staff"
  on public.ai_rules for insert
  with check (public.is_staff(auth.uid()));

create policy "ai_rules_update_staff"
  on public.ai_rules for update
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- VarsayÄ±lan ana kural satÄ±rÄ±.
insert into public.ai_rules (key, content)
values (
  'main',
  'DanÄ±ÅŸanlara nazik ve sade bir dille yanÄ±t ver. Porsiyon ve Ã¶ÄŸÃ¼n Ã¶nerilerinde TÃ¼rk mutfaÄŸÄ±ndan Ã¶rnekler kullan.'
);


-- ============================================================
-- 20260101000200_diet_plans.sql
-- ============================================================
-- AÅŸama 4 â€” Diyet planÄ± yÃ¶netimi
-- diet_plans (kiÅŸiye Ã¶zel plan) ve meals (plan iÃ§indeki Ã¶ÄŸÃ¼nler).

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
-- DanÄ±ÅŸan kendi planlarÄ±nÄ± gÃ¶rÃ¼r; personel tÃ¼mÃ¼nÃ¼ gÃ¶rÃ¼r.
create policy "diet_plans_select"
  on public.diet_plans for select
  using (client_id = auth.uid() or public.is_staff(auth.uid()));

-- YalnÄ±zca personel plan oluÅŸturur/gÃ¼nceller/siler.
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
-- meals RLS â€” sahiplik plana gÃ¶re tÃ¼retilir
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

-- updated_at otomatik gÃ¼ncelle
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


-- ============================================================
-- 20260101000300_progress.sql
-- ============================================================
-- AÅŸama 5 â€” Ä°lerleme takibi
-- progress_entries (kilo/Ã¶lÃ§Ã¼/su/foto/not) + Ã¶zel fotoÄŸraf bucket'Ä± ve politikalar.

create table public.progress_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null default current_date,
  weight_kg numeric(5, 2),
  water_ml integer,
  waist_cm numeric(5, 1),
  hip_cm numeric(5, 1),
  note text,
  -- Storage'daki dosyanÄ±n yolu (public URL deÄŸil); gÃ¶rÃ¼ntÃ¼lerken imzalÄ± URL Ã¼retilir.
  photo_path text,
  created_at timestamptz not null default now()
);

create index progress_entries_client_date_idx
  on public.progress_entries (client_id, entry_date);

alter table public.progress_entries enable row level security;

-- DanÄ±ÅŸan kendi kayÄ±tlarÄ±nÄ± tam yÃ¶netir; personel okuyabilir.
create policy "progress_select"
  on public.progress_entries for select
  using (client_id = auth.uid() or public.is_staff(auth.uid()));

create policy "progress_insert_self"
  on public.progress_entries for insert
  with check (client_id = auth.uid());

create policy "progress_update_self"
  on public.progress_entries for update
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

create policy "progress_delete_self"
  on public.progress_entries for delete
  using (client_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: Ã¶zel fotoÄŸraf bucket'Ä±
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- KullanÄ±cÄ± yalnÄ±zca kendi klasÃ¶rÃ¼ne (<uid>/...) yÃ¼kler ve kendi dosyalarÄ±nÄ± okur.
create policy "progress_photos_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "progress_photos_select_own"
  on storage.objects for select
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "progress_photos_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================
-- 20260101000400_chat.sql
-- ============================================================
-- AÅŸama 2 â€” Sohbet (grup + birebir)
-- conversations, conversation_members, messages + Ã¼yelik tabanlÄ± RLS + Realtime.

create type public.conversation_type as enum ('group', 'direct');
create type public.message_type as enum ('user', 'ai', 'system');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type public.conversation_type not null default 'direct',
  title text,
  -- AI asistanÄ± bu konuÅŸmada kullanÄ±cÄ± mesajlarÄ±na otomatik yanÄ±t versin mi?
  ai_enabled boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_members_user_idx
  on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  -- AI/sistem mesajlarÄ±nda sender_id null olur.
  sender_id uuid references public.profiles (id) on delete set null,
  type public.message_type not null default 'user',
  content text not null,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx
  on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- ---------------------------------------------------------------------------
-- YardÄ±mcÄ±: kullanÄ±cÄ± bu konuÅŸmanÄ±n Ã¼yesi mi? (SECURITY DEFINER â†’ RLS atlar,
-- bÃ¶ylece policy'ler arasÄ±nda Ã¶zyineleme olmaz)
-- ---------------------------------------------------------------------------
create or replace function public.is_conversation_member(conv uuid, uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = conv and m.user_id = uid
  );
$$;

-- ---------------------------------------------------------------------------
-- conversations RLS
-- ---------------------------------------------------------------------------
create policy "conversations_select"
  on public.conversations for select
  using (
    public.is_staff(auth.uid())
    or public.is_conversation_member(id, auth.uid())
  );

create policy "conversations_insert_staff"
  on public.conversations for insert
  with check (public.is_staff(auth.uid()));

create policy "conversations_update_staff"
  on public.conversations for update
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

create policy "conversations_delete_staff"
  on public.conversations for delete
  using (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- conversation_members RLS
-- ---------------------------------------------------------------------------
create policy "members_select"
  on public.conversation_members for select
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

create policy "members_insert_staff"
  on public.conversation_members for insert
  with check (public.is_staff(auth.uid()));

create policy "members_delete_staff"
  on public.conversation_members for delete
  using (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- messages RLS
-- ---------------------------------------------------------------------------
create policy "messages_select"
  on public.messages for select
  using (
    public.is_staff(auth.uid())
    or public.is_conversation_member(conversation_id, auth.uid())
  );

-- KullanÄ±cÄ± yalnÄ±zca Ã¼yesi olduÄŸu konuÅŸmaya, kendisi adÄ±na, 'user' tipinde yazar.
-- AI/sistem mesajlarÄ± sunucuda service-role ile eklenir (RLS atlanÄ±r).
create policy "messages_insert_member"
  on public.messages for insert
  with check (
    type = 'user'
    and sender_id = auth.uid()
    and public.is_conversation_member(conversation_id, auth.uid())
  );

create policy "messages_delete_staff"
  on public.messages for delete
  using (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- Realtime: messages tablosunu yayÄ±na ekle
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;


-- ============================================================
-- 20260101000500_appointments_payments.sql
-- ============================================================
-- AÅŸama 6 â€” Randevu & Ã–deme
-- appointments (randevu) ve payments (iyzico Ã¶deme kayÄ±tlarÄ±).

create type public.appointment_status as enum (
  'requested',
  'confirmed',
  'cancelled',
  'completed'
);
create type public.payment_status as enum (
  'pending',
  'paid',
  'failed',
  'refunded'
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  dietitian_id uuid references public.profiles (id) on delete set null,
  scheduled_at timestamptz not null,
  status public.appointment_status not null default 'requested',
  notes text,
  created_at timestamptz not null default now()
);

create index appointments_client_idx on public.appointments (client_id);
create index appointments_scheduled_idx on public.appointments (scheduled_at);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(10, 2) not null,
  currency text not null default 'TRY',
  provider text not null default 'iyzico',
  -- iyzico Checkout Form token'Ä± / iÅŸlem referansÄ±
  provider_ref text,
  status public.payment_status not null default 'pending',
  description text,
  created_at timestamptz not null default now()
);

create index payments_client_idx on public.payments (client_id);
create index payments_provider_ref_idx on public.payments (provider_ref);

alter table public.appointments enable row level security;
alter table public.payments enable row level security;

-- ---------------------------------------------------------------------------
-- appointments RLS
-- ---------------------------------------------------------------------------
create policy "appointments_select"
  on public.appointments for select
  using (client_id = auth.uid() or public.is_staff(auth.uid()));

-- DanÄ±ÅŸan kendi adÄ±na randevu talebi oluÅŸturur.
create policy "appointments_insert_self"
  on public.appointments for insert
  with check (client_id = auth.uid() and status = 'requested');

-- Durum gÃ¼ncellemesi (onay/iptal/tamamlandÄ±) yalnÄ±zca personel.
create policy "appointments_update_staff"
  on public.appointments for update
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- DanÄ±ÅŸan kendi talebini silebilir (iptal); personel tÃ¼mÃ¼nÃ¼ silebilir.
create policy "appointments_delete"
  on public.appointments for delete
  using (client_id = auth.uid() or public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- payments RLS
-- ---------------------------------------------------------------------------
create policy "payments_select"
  on public.payments for select
  using (client_id = auth.uid() or public.is_staff(auth.uid()));

-- DanÄ±ÅŸan kendi 'pending' Ã¶deme kaydÄ±nÄ± oluÅŸturur (checkout baÅŸlatÄ±rken).
create policy "payments_insert_self"
  on public.payments for insert
  with check (client_id = auth.uid() and status = 'pending');

-- Ã–deme sonucu gÃ¼ncellemesi yalnÄ±zca personel (callback service-role ile yapar).
create policy "payments_update_staff"
  on public.payments for update
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

