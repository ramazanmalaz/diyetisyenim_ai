-- DiyetChat — tüm şema (migration'ların birleşimi). Supabase SQL Editor'e yapıştırın.


-- ============================================================
-- 20260101000000_init_profiles.sql
-- ============================================================
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


-- ============================================================
-- 20260101000100_ai_rules.sql
-- ============================================================
-- Aşama 3 — AI yanıt sistemi
-- Diyetisyenin AI asistanına verdiği davranış kuralları.

create table public.ai_rules (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  content text not null default '',
  is_active boolean not null default true,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.ai_rules enable row level security;

-- Yalnızca personel (diyetisyen/admin) okur ve yönetir.
-- Danışanlar bu tabloyu doğrudan okuyamaz; AI yanıtı üretilirken kurallar
-- sunucuda service-role istemcisiyle okunur (RLS atlanır).
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

-- Varsayılan ana kural satırı.
insert into public.ai_rules (key, content)
values (
  'main',
  'Danışanlara nazik ve sade bir dille yanıt ver. Porsiyon ve öğün önerilerinde Türk mutfağından örnekler kullan.'
);


-- ============================================================
-- 20260101000200_diet_plans.sql
-- ============================================================
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


-- ============================================================
-- 20260101000300_progress.sql
-- ============================================================
-- Aşama 5 — İlerleme takibi
-- progress_entries (kilo/ölçü/su/foto/not) + özel fotoğraf bucket'ı ve politikalar.

create table public.progress_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null default current_date,
  weight_kg numeric(5, 2),
  water_ml integer,
  waist_cm numeric(5, 1),
  hip_cm numeric(5, 1),
  note text,
  -- Storage'daki dosyanın yolu (public URL değil); görüntülerken imzalı URL üretilir.
  photo_path text,
  created_at timestamptz not null default now()
);

create index progress_entries_client_date_idx
  on public.progress_entries (client_id, entry_date);

alter table public.progress_entries enable row level security;

-- Danışan kendi kayıtlarını tam yönetir; personel okuyabilir.
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
-- Storage: özel fotoğraf bucket'ı
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- Kullanıcı yalnızca kendi klasörüne (<uid>/...) yükler ve kendi dosyalarını okur.
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
-- Aşama 2 — Sohbet (grup + birebir)
-- conversations, conversation_members, messages + üyelik tabanlı RLS + Realtime.

create type public.conversation_type as enum ('group', 'direct');
create type public.message_type as enum ('user', 'ai', 'system');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type public.conversation_type not null default 'direct',
  title text,
  -- AI asistanı bu konuşmada kullanıcı mesajlarına otomatik yanıt versin mi?
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
  -- AI/sistem mesajlarında sender_id null olur.
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
-- Yardımcı: kullanıcı bu konuşmanın üyesi mi? (SECURITY DEFINER → RLS atlar,
-- böylece policy'ler arasında özyineleme olmaz)
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

-- Kullanıcı yalnızca üyesi olduğu konuşmaya, kendisi adına, 'user' tipinde yazar.
-- AI/sistem mesajları sunucuda service-role ile eklenir (RLS atlanır).
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
-- Realtime: messages tablosunu yayına ekle
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;


-- ============================================================
-- 20260101000500_appointments_payments.sql
-- ============================================================
-- Aşama 6 — Randevu & Ödeme
-- appointments (randevu) ve payments (iyzico ödeme kayıtları).

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
  -- iyzico Checkout Form token'ı / işlem referansı
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

-- Danışan kendi adına randevu talebi oluşturur.
create policy "appointments_insert_self"
  on public.appointments for insert
  with check (client_id = auth.uid() and status = 'requested');

-- Durum güncellemesi (onay/iptal/tamamlandı) yalnızca personel.
create policy "appointments_update_staff"
  on public.appointments for update
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- Danışan kendi talebini silebilir (iptal); personel tümünü silebilir.
create policy "appointments_delete"
  on public.appointments for delete
  using (client_id = auth.uid() or public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- payments RLS
-- ---------------------------------------------------------------------------
create policy "payments_select"
  on public.payments for select
  using (client_id = auth.uid() or public.is_staff(auth.uid()));

-- Danışan kendi 'pending' ödeme kaydını oluşturur (checkout başlatırken).
create policy "payments_insert_self"
  on public.payments for insert
  with check (client_id = auth.uid() and status = 'pending');

-- Ödeme sonucu güncellemesi yalnızca personel (callback service-role ile yapar).
create policy "payments_update_staff"
  on public.payments for update
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));


-- ============================================================
-- 20260101000600_ai_diet.sql
-- ============================================================
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


-- ============================================================
-- 20260101000700_message_image.sql
-- ============================================================
-- Faz 3 — Sohbette fotoğraf: mesaja görsel yolu (Storage) eklenir.
alter table public.messages add column if not exists image_path text;


-- ============================================================
-- 20260101000800_foods.sql
-- ============================================================
-- Besin veritabanı + yapılandırılmış öğün öğeleri
-- foods: ad + birim + birim başına kalori. meals: food_id + quantity (kalori otomatik).

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit_label text not null, -- adet, dilim, kase, porsiyon, bardak, yemek kaşığı, 100 g...
  kcal_per_unit integer not null,
  created_at timestamptz not null default now()
);

alter table public.foods enable row level security;

-- Besin listesi tüm giriş yapmış kullanıcılarca okunabilir; yalnızca personel yazar.
create policy "foods_select_authenticated"
  on public.foods for select
  using (auth.uid() is not null);
create policy "foods_write_staff"
  on public.foods for all
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- meals: yapılandırılmış öğe alanları
alter table public.meals
  add column if not exists food_id uuid references public.foods (id) on delete set null,
  add column if not exists quantity numeric(6, 2);

-- ---------------------------------------------------------------------------
-- Seed: yaygın besinler (yaklaşık kaloriler)
-- ---------------------------------------------------------------------------
insert into public.foods (name, unit_label, kcal_per_unit) values
  ('Haşlanmış yumurta', 'adet', 70),
  ('Menemen', 'porsiyon', 230),
  ('Beyaz peynir', 'dilim', 75),
  ('Kaşar peyniri', 'dilim', 110),
  ('Lor peyniri', 'yemek kaşığı', 30),
  ('Tam buğday ekmeği', 'dilim', 70),
  ('Beyaz ekmek', 'dilim', 80),
  ('Siyah zeytin', 'adet', 7),
  ('Yeşil zeytin', 'adet', 6),
  ('Domates', 'adet', 20),
  ('Salatalık', 'adet', 15),
  ('Yeşil biber', 'adet', 10),
  ('Elma', 'adet (orta)', 80),
  ('Muz', 'adet (orta)', 90),
  ('Mandalina', 'adet', 40),
  ('Portakal', 'adet', 60),
  ('Fındık', 'adet', 7),
  ('Badem', 'adet', 7),
  ('Ceviz içi', 'yarım', 13),
  ('Yağsız sade yoğurt', 'kase (150 g)', 85),
  ('Tam yağlı yoğurt', 'kase (150 g)', 150),
  ('Süt', 'bardak', 120),
  ('Ayran', 'bardak', 60),
  ('Mercimek çorbası', 'kase', 180),
  ('Yoğurt çorbası', 'kase', 150),
  ('Zeytinyağlı nohut', 'porsiyon', 210),
  ('Pirinç pilavı', 'kase', 250),
  ('Bulgur pilavı', 'kase', 180),
  ('Makarna', 'porsiyon', 220),
  ('Izgara tavuk göğsü', '100 g', 165),
  ('Izgara köfte', '100 g', 250),
  ('Fırında balık', '100 g', 120),
  ('Mevsim salata', 'kase', 60),
  ('Haşlanmış brokoli', 'porsiyon (100 g)', 35),
  ('Buharda ıspanak', 'porsiyon (150 g)', 55),
  ('Zeytinyağı', 'yemek kaşığı', 120),
  ('Bal', 'tatlı kaşığı', 25),
  ('Tahin', 'yemek kaşığı', 90),
  ('Çay', 'bardak', 2)
on conflict do nothing;


-- ============================================================
-- 20260101000900_checked_more_foods.sql
-- ============================================================
-- Öğün öğelerine "tiklendi/yenildi" durumu + besin listesini genişletme.

alter table public.meals
  add column if not exists checked boolean not null default false;

-- foods.name benzersiz olsun ki tekrar eklemeler çakışmasın (idempotent seed).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'foods_name_unique'
  ) then
    alter table public.foods add constraint foods_name_unique unique (name);
  end if;
end $$;

insert into public.foods (name, unit_label, kcal_per_unit) values
  ('Sucuk', 'dilim', 35),
  ('Kavurma', 'yemek kaşığı', 60),
  ('Sahanda yumurta', 'adet', 100),
  ('Omlet', 'porsiyon', 220),
  ('Simit', 'adet', 270),
  ('Poğaça', 'adet', 250),
  ('Tereyağı', 'tatlı kaşığı', 35),
  ('Reçel', 'tatlı kaşığı', 30),
  ('Pekmez', 'tatlı kaşığı', 35),
  ('Labne', 'yemek kaşığı', 40),
  ('Tulum peyniri', 'dilim', 100),
  ('Hellim peyniri', 'dilim', 90),
  ('Çökelek', 'yemek kaşığı', 25),
  ('Çilek', 'kase', 50),
  ('Karpuz', 'dilim', 85),
  ('Kavun', 'dilim', 60),
  ('Üzüm', 'küçük salkım', 90),
  ('Armut', 'adet', 90),
  ('Şeftali', 'adet', 60),
  ('Kayısı', 'adet', 17),
  ('Kiraz', '10 adet', 50),
  ('İncir', 'adet', 47),
  ('Nar', 'adet', 105),
  ('Avokado', 'adet', 240),
  ('Kuru kayısı', 'adet', 20),
  ('Kuru üzüm', 'yemek kaşığı', 30),
  ('Hurma', 'adet', 20),
  ('Antep fıstığı', 'adet', 4),
  ('Kaju', 'adet', 9),
  ('Yer fıstığı', 'adet', 6),
  ('Ay çekirdeği', 'avuç', 160),
  ('Kuru fasulye', 'porsiyon', 230),
  ('Etli nohut', 'porsiyon', 260),
  ('Mercimek yemeği', 'porsiyon', 190),
  ('Sebze türlü', 'porsiyon', 150),
  ('İmam bayıldı', 'porsiyon', 200),
  ('Karnıyarık', 'adet', 250),
  ('Yaprak sarma', 'adet', 35),
  ('İçli köfte', 'adet', 180),
  ('Mantı', 'porsiyon', 350),
  ('Lahmacun', 'adet', 250),
  ('Kıymalı pide', 'dilim', 200),
  ('Tavuk döner', 'porsiyon', 350),
  ('Tavuk but', 'adet', 220),
  ('Dana eti', '100 g', 250),
  ('Kuzu eti', '100 g', 290),
  ('Köfte', 'adet', 60),
  ('Somon', '100 g', 200),
  ('Ton balığı', 'kutu', 130),
  ('Çoban salata', 'kase', 60),
  ('Roka salatası', 'porsiyon', 15),
  ('Patates haşlama', 'adet', 90),
  ('Patates kızartması', 'porsiyon', 310),
  ('Ezogelin çorbası', 'kase', 160),
  ('Domates çorbası', 'kase', 120),
  ('Tavuk suyu çorba', 'kase', 110),
  ('Türk kahvesi', 'fincan', 5),
  ('Filtre kahve', 'bardak', 5),
  ('Meyve suyu', 'bardak', 110),
  ('Limonata', 'bardak', 100),
  ('Kefir', 'bardak', 100),
  ('Bitki çayı', 'bardak', 2),
  ('Yulaf ezmesi', 'kase', 150),
  ('Granola', 'porsiyon', 200),
  ('Müsli', 'kase', 180),
  ('Bitter çikolata', 'kare', 50),
  ('Sütlaç', 'kase', 200),
  ('Baklava', 'dilim', 200),
  ('Protein bar', 'adet', 200),
  ('Protein tozu', 'ölçek', 120)
on conflict (name) do nothing;


-- ============================================================
-- 20260101001000_foods_big_catalog.sql
-- ============================================================
-- Besin kataloğunu kapsamlı şekilde genişlet: kahvaltılıklar, meyveler,
-- kuruyemiş/atıştırmalık, sebze yemekleri, ana yemekler, çorbalar, salata/mezeler,
-- süt ürünleri, tatlılar, içecekler, baklagil/tahıl, fast-food.
-- Idempotent: foods.name benzersiz; tekrar çalıştırma çakışmaz.

insert into public.foods (name, unit_label, kcal_per_unit) values
  -- Kahvaltılıklar
  ('Kaymak', 'yemek kaşığı', 55),
  ('Krem peynir', 'yemek kaşığı', 50),
  ('Dil peyniri', 'dilim', 80),
  ('Örgü peyniri', 'dilim', 80),
  ('Mihaliç peyniri', 'dilim', 95),
  ('Ezine peyniri', 'dilim', 80),
  ('Süzme peynir (cottage)', 'porsiyon', 100),
  ('Pastırma', 'dilim', 30),
  ('Salam', 'dilim', 35),
  ('Sosis', 'adet', 120),
  ('Jambon', 'dilim', 30),
  ('Yumurta beyazı', 'adet', 17),
  ('Yumurta sarısı', 'adet', 55),
  ('Sucuklu yumurta', 'porsiyon', 320),
  ('Pastırmalı yumurta', 'porsiyon', 280),
  ('Menemen (sucuklu)', 'porsiyon', 350),
  ('Çılbır', 'porsiyon', 250),
  ('Mıhlama (kuymak)', 'porsiyon', 400),
  ('Kaygana', 'porsiyon', 200),
  ('Gözleme (peynirli)', 'adet', 300),
  ('Gözleme (patatesli)', 'adet', 320),
  ('Peynirli börek', 'dilim', 250),
  ('Su böreği', 'dilim', 280),
  ('Sigara böreği', 'adet', 90),
  ('Açma', 'adet', 230),
  ('Bazlama', 'adet', 180),
  ('Yufka ekmeği', 'adet', 100),
  ('Lavaş', 'adet', 120),
  ('Tost ekmeği', 'dilim', 70),
  ('Kepekli ekmek', 'dilim', 65),
  ('Çavdar ekmeği', 'dilim', 65),
  ('Mısır ekmeği', 'dilim', 75),
  ('Kruvasan', 'adet', 230),
  ('Krep', 'adet', 150),
  ('Pankek', 'adet', 90),
  ('Waffle', 'adet', 250),
  ('Fıstık ezmesi', 'yemek kaşığı', 95),
  ('Çikolatalı fındık kreması', 'yemek kaşığı', 100),
  ('Yumurtalı ekmek', 'dilim', 130),
  ('Zeytin ezmesi', 'yemek kaşığı', 45),
  ('Közlenmiş biber', 'porsiyon', 40),
  ('Acılı ezme (acuka)', 'yemek kaşığı', 30),

  -- Meyveler
  ('Greyfurt', 'adet', 80),
  ('Ananas', 'dilim', 50),
  ('Kivi', 'adet', 45),
  ('Mango', 'adet', 200),
  ('Erik', 'adet', 30),
  ('Vişne', 'kase', 80),
  ('Böğürtlen', 'kase', 60),
  ('Ahududu', 'kase', 60),
  ('Yaban mersini', 'kase', 80),
  ('Dut', 'kase', 60),
  ('Trabzon hurması', 'adet', 120),
  ('Ayva', 'adet', 60),
  ('Nektarin', 'adet', 60),
  ('Limon', 'adet', 20),
  ('Hindistan cevizi', 'dilim', 100),
  ('Kuru incir', 'adet', 47),
  ('Kuru erik', 'adet', 20),
  ('Pestil', 'dilim', 90),

  -- Kuruyemiş & atıştırmalık
  ('Leblebi', 'avuç', 130),
  ('Kabak çekirdeği', 'avuç', 150),
  ('Çam fıstığı', 'yemek kaşığı', 60),
  ('Karışık kuruyemiş', 'avuç', 170),
  ('Fındık ezmesi', 'yemek kaşığı', 95),
  ('Patates cipsi', 'paket', 150),
  ('Mısır cipsi', 'avuç', 140),
  ('Kraker', 'adet', 15),
  ('Galeta', 'adet', 30),
  ('Grissini', 'adet', 20),
  ('Mısır patlağı (popcorn)', 'kase', 120),

  -- Zeytinyağlı & sebze yemekleri
  ('Zeytinyağlı taze fasulye', 'porsiyon', 120),
  ('Zeytinyağlı barbunya', 'porsiyon', 180),
  ('Zeytinyağlı enginar', 'adet', 120),
  ('Zeytinyağlı pırasa', 'porsiyon', 130),
  ('Zeytinyağlı kereviz', 'porsiyon', 110),
  ('Zeytinyağlı bamya', 'porsiyon', 120),
  ('Kabak yemeği', 'porsiyon', 120),
  ('Patlıcan yemeği', 'porsiyon', 160),
  ('Mücver', 'adet', 80),
  ('Musakka', 'porsiyon', 230),
  ('Biber dolması (zeytinyağlı)', 'adet', 90),
  ('Lahana sarma', 'adet', 40),
  ('Kabak dolması', 'adet', 100),
  ('Etli biber dolması', 'adet', 120),

  -- Ana yemekler (et / tavuk)
  ('Tavuk şiş', 'porsiyon', 250),
  ('Tavuk pirzola', 'adet', 200),
  ('Tavuk kanat', 'adet', 100),
  ('Tavuk sote', 'porsiyon', 250),
  ('Adana kebap', 'porsiyon', 400),
  ('Urfa kebap', 'porsiyon', 380),
  ('Beyti kebap', 'porsiyon', 450),
  ('İskender', 'porsiyon', 600),
  ('Kuzu pirzola', 'adet', 150),
  ('Et sote', 'porsiyon', 300),
  ('Tas kebabı', 'porsiyon', 320),
  ('Et güveç', 'porsiyon', 300),
  ('Hünkar beğendi', 'porsiyon', 380),
  ('İzmir köfte', 'porsiyon', 300),
  ('Şiş köfte', 'porsiyon', 350),
  ('Çiğ köfte (etsiz)', 'porsiyon', 150),
  ('Etli pilav', 'porsiyon', 420),
  ('Tavuklu pilav', 'porsiyon', 400),
  ('Nohutlu pilav', 'porsiyon', 350),
  ('Şehriyeli pilav', 'kase', 230),
  ('İç pilav', 'porsiyon', 280),

  -- Makarna & hamur
  ('Spagetti', 'porsiyon', 250),
  ('Fırın makarna', 'porsiyon', 350),
  ('Penne arabiata', 'porsiyon', 320),
  ('Lazanya', 'porsiyon', 400),

  -- Fast food / sokak lezzetleri
  ('Pizza', 'dilim', 280),
  ('Hamburger', 'adet', 500),
  ('Çizburger', 'adet', 550),
  ('Tavuk burger', 'adet', 450),
  ('Tavuk nugget', 'adet', 50),
  ('Kumpir', 'adet', 500),
  ('Kaşarlı tost', 'adet', 300),
  ('Ayvalık tostu', 'adet', 450),
  ('Tavuklu sandviç', 'adet', 350),
  ('Tavuk dürüm', 'adet', 400),
  ('Et döner', 'porsiyon', 400),
  ('Tantuni', 'porsiyon', 350),
  ('Köfte ekmek', 'adet', 400),
  ('Balık ekmek', 'adet', 350),

  -- Deniz ürünleri
  ('Midye dolma', 'adet', 25),
  ('Kalamar tava', 'porsiyon', 250),
  ('Karides güveç', 'porsiyon', 200),
  ('Hamsi tava', 'porsiyon', 280),
  ('Levrek ızgara', 'porsiyon', 180),
  ('Çipura ızgara', 'porsiyon', 200),
  ('Alabalık', 'porsiyon', 180),
  ('Uskumru ızgara', 'porsiyon', 250),

  -- Çorbalar
  ('Tarhana çorbası', 'kase', 130),
  ('Yayla çorbası', 'kase', 140),
  ('İşkembe çorbası', 'kase', 180),
  ('Mantar çorbası', 'kase', 130),
  ('Brokoli çorbası', 'kase', 120),
  ('Balık çorbası', 'kase', 150),
  ('Düğün çorbası', 'kase', 180),

  -- Salata & mezeler
  ('Yeşil salata', 'kase', 40),
  ('Gavurdağı salatası', 'porsiyon', 120),
  ('Patates salatası', 'porsiyon', 200),
  ('Rus salatası', 'porsiyon', 250),
  ('Cacık', 'kase', 80),
  ('Haydari', 'yemek kaşığı', 40),
  ('Humus', 'yemek kaşığı', 50),
  ('Şakşuka', 'porsiyon', 150),
  ('Közlenmiş patlıcan salatası', 'porsiyon', 120),
  ('Fava', 'porsiyon', 130),
  ('Piyaz', 'porsiyon', 180),
  ('Kısır', 'porsiyon', 180),
  ('Babagannuş', 'yemek kaşığı', 40),
  ('Deniz börülcesi', 'porsiyon', 60),
  ('Turşu', 'porsiyon', 20),

  -- Süt ürünleri
  ('Süzme yoğurt', 'kase (150 g)', 120),
  ('Light yoğurt', 'kase (150 g)', 70),
  ('Yarım yağlı süt', 'bardak', 90),
  ('Yağsız süt', 'bardak', 70),
  ('Çikolatalı süt', 'bardak', 180),
  ('Badem sütü', 'bardak', 40),
  ('Soya sütü', 'bardak', 80),
  ('Yulaf sütü', 'bardak', 90),
  ('Mozzarella', 'dilim', 80),
  ('Cheddar peyniri', 'dilim', 110),
  ('Parmesan', 'yemek kaşığı', 25),

  -- Baklagil & tahıl
  ('Yeşil mercimek yemeği', 'porsiyon', 200),
  ('Barbunya pilaki', 'porsiyon', 180),
  ('Kinoa', 'porsiyon', 180),
  ('Karabuğday', 'porsiyon', 170),
  ('Kuskus', 'porsiyon', 180),
  ('Haşlanmış mısır', 'adet', 100),
  ('Bezelye yemeği', 'porsiyon', 120),
  ('Bakla yemeği', 'porsiyon', 110),
  ('Edamame', 'porsiyon', 120),
  ('Tofu', '100 g', 80),
  ('Falafel', 'adet', 60),

  -- Tatlılar
  ('Künefe', 'porsiyon', 350),
  ('Kazandibi', 'kase', 220),
  ('Tavuk göğsü tatlısı', 'kase', 200),
  ('Profiterol', 'porsiyon', 350),
  ('Tiramisu', 'porsiyon', 300),
  ('Cheesecake', 'dilim', 350),
  ('Magnolia', 'kase', 250),
  ('Dondurma', 'top', 80),
  ('Aşure', 'kase', 250),
  ('Güllaç', 'porsiyon', 200),
  ('Revani', 'dilim', 250),
  ('Şekerpare', 'adet', 120),
  ('Tulumba', 'adet', 80),
  ('Lokma', 'adet', 40),
  ('Helva', 'dilim', 250),
  ('İrmik helvası', 'porsiyon', 280),
  ('Brownie', 'adet', 250),
  ('Kurabiye', 'adet', 80),
  ('Bisküvi', 'adet', 45),
  ('Çikolatalı gofret', 'adet', 130),
  ('Sütlü çikolata', 'kare', 55),
  ('Lokum', 'adet', 50),
  ('Sade kek', 'dilim', 200),
  ('Kakaolu kek', 'dilim', 230),

  -- İçecekler
  ('Su', 'bardak', 0),
  ('Maden suyu', 'şişe', 0),
  ('Meyveli soda', 'şişe', 60),
  ('Kola', 'kutu', 140),
  ('Kola (light)', 'kutu', 1),
  ('Gazoz', 'şişe', 120),
  ('Enerji içeceği', 'kutu', 110),
  ('Buzlu çay', 'bardak', 90),
  ('Sıcak çikolata', 'bardak', 190),
  ('Salep', 'bardak', 200),
  ('Latte', 'bardak', 120),
  ('Cappuccino', 'bardak', 110),
  ('Espresso', 'fincan', 5),
  ('Americano', 'bardak', 10),
  ('Smoothie', 'bardak', 180),
  ('Taze portakal suyu', 'bardak', 110),
  ('Şalgam suyu', 'bardak', 30),
  ('Boza', 'bardak', 200)
on conflict (name) do nothing;


-- ============================================================
-- 20260101001100_dietitians.sql
-- ============================================================
-- Gerçek diyetisyenler + slot bazlı randevu.
-- dietitians: bağımsız katalog (auth'a bağlı değil) — admin yönetir.
-- dietitian_slots: diyetisyenin tanımladığı müsait saatler; danışan seçer.
-- appointments: dietitian_ref + slot_id alanları eklenir.

create table if not exists public.dietitians (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  title text not null default 'Diyetisyen',
  bio text,
  specialties text[] not null default '{}',
  city text,
  photo_url text,
  years_experience integer,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  -- İletişim bilgisi yalnızca personel içindir; danışana gösterilmez (RLS ile).
  contact_phone text,
  contact_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.dietitian_slots (
  id uuid primary key default gen_random_uuid(),
  dietitian_id uuid not null references public.dietitians (id) on delete cascade,
  start_at timestamptz not null,
  duration_min integer not null default 40,
  status text not null default 'open' check (status in ('open', 'booked', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists dietitian_slots_idx
  on public.dietitian_slots (dietitian_id, start_at);

alter table public.appointments
  add column if not exists dietitian_ref uuid references public.dietitians (id) on delete set null,
  add column if not exists slot_id uuid references public.dietitian_slots (id) on delete set null;

alter table public.dietitians enable row level security;
alter table public.dietitian_slots enable row level security;

-- ---------------------------------------------------------------------------
-- RLS: dietitians — danışan yalnızca aktifleri görür; personel hepsini yönetir.
-- NOT: contact_phone/contact_email kolonları client sorgularında SEÇİLMEZ
-- (uygulama bunları danışana hiç göndermez). Hassas alanlar yalnızca personel
-- ekranlarında okunur.
-- ---------------------------------------------------------------------------
create policy "dietitians_select_active"
  on public.dietitians for select
  using (is_active or public.is_staff(auth.uid()));
create policy "dietitians_write_staff"
  on public.dietitians for all
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- dietitian_slots — herkes (giriş yapmış) görebilir; yalnızca personel yazar.
create policy "slots_select_authenticated"
  on public.dietitian_slots for select
  using (auth.uid() is not null);
create policy "slots_write_staff"
  on public.dietitian_slots for all
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- Seed: Ankara'dan 5 örnek diyetisyen (kurgusal) + önümüzdeki günler için slotlar.
-- Fotoğraflar yer tutucu (DiceBear); admin gerçek foto ile değiştirebilir.
-- İletişim bilgisi danışana gösterilmez.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.dietitians) then
    insert into public.dietitians
      (full_name, title, bio, specialties, city, photo_url, years_experience, sort_order)
    values
      ('Dyt. Elif Yılmaz', 'Uzman Diyetisyen',
       'Kilo yönetimi ve sürdürülebilir beslenme alışkanlıkları üzerine çalışır. Bireye özel, uygulanabilir programlar hazırlar.',
       array['Kilo yönetimi','Sağlıklı beslenme','Davranış değişikliği'], 'Ankara',
       'https://api.dicebear.com/9.x/avataaars/svg?seed=ElifYilmaz', 8, 1),
      ('Dyt. Mert Demir', 'Diyetisyen',
       'Sporcu beslenmesi ve kas kazanımı odaklı programlar. Antrenmanla uyumlu öğün planlaması yapar.',
       array['Sporcu beslenmesi','Kas kazanımı','Performans'], 'Ankara',
       'https://api.dicebear.com/9.x/avataaars/svg?seed=MertDemir', 6, 2),
      ('Dyt. Zeynep Kaya', 'Uzman Diyetisyen',
       'Klinik beslenme; diyabet, insülin direnci ve PCOS yönetiminde deneyimli. Tıbbi beslenme tedavisi uygular.',
       array['Diyabet','İnsulin direnci','PCOS'], 'Ankara',
       'https://api.dicebear.com/9.x/avataaars/svg?seed=ZeynepKaya', 11, 3),
      ('Dyt. Burak Şahin', 'Diyetisyen',
       'Aralıklı oruç ve metabolik sağlık. Yoğun çalışan profesyoneller için pratik beslenme çözümleri sunar.',
       array['Aralıklı oruç','Metabolik sağlık','Pratik beslenme'], 'Ankara',
       'https://api.dicebear.com/9.x/avataaars/svg?seed=BurakSahin', 5, 4),
      ('Dyt. Aslı Çetin', 'Uzman Diyetisyen',
       'Çocuk ve adölesan beslenmesi, hamilelik ve emzirme dönemi beslenmesinde uzman.',
       array['Çocuk beslenmesi','Gebelik','Emzirme'], 'Ankara',
       'https://api.dicebear.com/9.x/avataaars/svg?seed=AsliCetin', 9, 5);

    -- Her diyetisyen için önümüzdeki 1–5. günlerde 10:00, 13:00, 16:00 slotları.
    insert into public.dietitian_slots (dietitian_id, start_at, duration_min)
    select d.id, day + h.val, 40
    from public.dietitians d
    cross join generate_series(
      date_trunc('day', now()) + interval '1 day',
      date_trunc('day', now()) + interval '5 day',
      interval '1 day'
    ) as day
    cross join (values (interval '10 hour'), (interval '13 hour'), (interval '16 hour')) as h(val);
  end if;
end $$;


-- ============================================================
-- 20260101001200_water_intake.sql
-- ============================================================
-- Günlük su takibi (kullanıcı başına gün başına toplam ml).
create table if not exists public.water_intake (
  client_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  total_ml integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (client_id, day)
);

alter table public.water_intake enable row level security;

create policy "water_select_self"
  on public.water_intake for select
  using (client_id = auth.uid());
create policy "water_insert_self"
  on public.water_intake for insert
  with check (client_id = auth.uid());
create policy "water_update_self"
  on public.water_intake for update
  using (client_id = auth.uid())
  with check (client_id = auth.uid());
create policy "water_delete_self"
  on public.water_intake for delete
  using (client_id = auth.uid());


-- ============================================================
-- 20260101001300_pomodoro.sql
-- ============================================================
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


-- ============================================================
-- 20260101001400_plan_photos.sql
-- ============================================================
-- Kullanıcının kendi (mevcut) diyet planını girerken yüklediği referans
-- görsellerin Storage yolları. progress-photos bucket'ında <uid>/plans/... altında tutulur.
-- (diet_plans.source zaten 'ai' | 'manual' değerlerini alıyor; varsayılan 'manual'.)
alter table public.diet_plans
  add column if not exists photo_paths text[];


-- ============================================================
-- 20260101001500_premium.sql
-- ============================================================
-- Freemium: premium erişim süresi + günlük AI kullanım sayaçları.

-- Premium erişim bitiş anı (null/geçmiş = ücretsiz kullanıcı).
-- Ödeme "paid" olunca webhook bunu now()+30 güne çeker (varsa uzatır).
alter table public.profiles
  add column if not exists premium_until timestamptz;

-- Günlük AI kullanımı (kullanıcı + gün başına). Ücretsiz kullanıcıya:
-- chat_count <= 5/gün, vision_count <= 1/gün. Premium sınırsız.
create table if not exists public.ai_usage (
  client_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  chat_count integer not null default 0 check (chat_count >= 0),
  vision_count integer not null default 0 check (vision_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (client_id, day)
);

alter table public.ai_usage enable row level security;

-- Kullanıcı kendi kullanımını görebilir (yazma sunucuda service-role ile yapılır).
create policy "ai_usage_select_self"
  on public.ai_usage for select
  using (client_id = auth.uid());


-- ============================================================
-- 20260101001600_app_settings.sql
-- ============================================================
-- Panelden düzenlenebilen genel ayarlar (tarife fiyatı, başlık, premium gün sayısı).
-- Anahtar/değer; değerler metin olarak tutulur, uygulamada parse edilir.
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Fiyat gibi ayarlar danışana da gösterildiği için okuma serbest; yazma personele kısıtlı.
create policy "app_settings_select_all"
  on public.app_settings for select
  using (true);
create policy "app_settings_insert_staff"
  on public.app_settings for insert
  with check (public.is_staff(auth.uid()));
create policy "app_settings_update_staff"
  on public.app_settings for update
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- Varsayılan tarife değerleri.
insert into public.app_settings (key, value) values
  ('subscription_price', '199.00'),
  ('subscription_title', 'Premium (Aylık)'),
  ('premium_days', '30')
on conflict (key) do nothing;
