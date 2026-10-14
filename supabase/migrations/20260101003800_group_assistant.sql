-- Grup diyet asistanı — AI'nin bir danışan grubunu gerçek bir diyetisyen gibi
-- yönetmesi: soruları cevaplar, tabakları yorumlar, su/tartı bildirimlerini
-- kaydeder, günlük yoklama ve haftalık tartı töreni yapar, riskli mesajları
-- personele bildirir.
--
-- Idempotent yazıldı (create ... if not exists + drop policy if exists).

-- ---------------------------------------------------------------------------
-- 1. Grup ayarları
-- ---------------------------------------------------------------------------
alter table public.client_groups
  add column if not exists assistant_enabled boolean not null default false,
  -- 0=Pazar ... 6=Cumartesi (JS getDay ile aynı). Varsayılan Salı.
  add column if not exists weigh_in_dow smallint not null default 2
    check (weigh_in_dow between 0 and 6),
  -- Tartı sıralamasında "programın başından toplam kayıp" bu tarihten sayılır.
  add column if not exists program_started_on date;

-- ---------------------------------------------------------------------------
-- 2. Haftalık liste (admin yükler, asistan okur ve gruba duyurur)
-- ---------------------------------------------------------------------------
create table if not exists public.group_programs (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.client_groups (id) on delete cascade,
  title        text not null,
  -- Asistanın cevaplarında kullandığı metin. Yükleme sonrası AI çıkarır,
  -- admin yayınlamadan önce düzeltebilir.
  content      text not null,
  -- progress-photos bucket'ında orijinal dosya (PDF/görsel).
  file_path    text,
  status       text not null default 'draft'
               check (status in ('draft', 'active', 'archived')),
  published_at timestamptz,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists group_programs_group_idx
  on public.group_programs (group_id, status);

-- Bir grupta aynı anda tek aktif liste.
create unique index if not exists group_programs_one_active
  on public.group_programs (group_id) where status = 'active';

alter table public.group_programs enable row level security;

drop policy if exists "group_programs_select" on public.group_programs;
create policy "group_programs_select"
  on public.group_programs for select
  using (
    public.owns_client_group(group_id)
    or (status = 'active' and public.is_client_group_member(group_id, auth.uid()))
  );

drop policy if exists "group_programs_write_owner" on public.group_programs;
create policy "group_programs_write_owner"
  on public.group_programs for all
  using (public.owns_client_group(group_id))
  with check (public.owns_client_group(group_id));

-- ---------------------------------------------------------------------------
-- 3. Günlük uyum kaydı (kontrol mekanizması)
-- Asistan grup mesajlarından çıkarır: su, paylaşılan öğün sayısı, tartı, durum
-- etiketleri (regl, kabızlık, kaçamak...). Yazma yalnızca service-role.
-- ---------------------------------------------------------------------------
create table if not exists public.group_member_days (
  group_id         uuid not null references public.client_groups (id) on delete cascade,
  client_id        uuid not null references public.profiles (id) on delete cascade,
  day              date not null,
  water_ml         integer,
  meals_shared     smallint not null default 0,
  weight_kg        numeric(5, 2),
  flags            text[] not null default '{}',
  last_activity_at timestamptz not null default now(),
  primary key (group_id, client_id, day)
);

create index if not exists group_member_days_day_idx
  on public.group_member_days (group_id, day);

alter table public.group_member_days enable row level security;

drop policy if exists "group_member_days_select" on public.group_member_days;
create policy "group_member_days_select"
  on public.group_member_days for select
  using (client_id = auth.uid() or public.owns_client_group(group_id));

-- ---------------------------------------------------------------------------
-- 4. Zamanlanmış asistan mesajları — aynı gün ikinci kez atılmasın
-- ---------------------------------------------------------------------------
create table if not exists public.group_assistant_runs (
  group_id   uuid not null references public.client_groups (id) on delete cascade,
  kind       text not null,
  run_date   date not null,
  created_at timestamptz not null default now(),
  primary key (group_id, kind, run_date)
);

alter table public.group_assistant_runs enable row level security;

drop policy if exists "group_assistant_runs_select" on public.group_assistant_runs;
create policy "group_assistant_runs_select"
  on public.group_assistant_runs for select
  using (public.owns_client_group(group_id));

-- ---------------------------------------------------------------------------
-- 5. Uyarılar — titreme/bayılma, aç kalma, kronik hastalık vb. personele gider
-- ---------------------------------------------------------------------------
create table if not exists public.group_alerts (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.client_groups (id) on delete cascade,
  client_id   uuid references public.profiles (id) on delete set null,
  message_id  uuid references public.messages (id) on delete set null,
  severity    text not null check (severity in ('high', 'medium')),
  reason      text not null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists group_alerts_open_idx
  on public.group_alerts (group_id, created_at desc) where resolved_at is null;

alter table public.group_alerts enable row level security;

drop policy if exists "group_alerts_select_owner" on public.group_alerts;
create policy "group_alerts_select_owner"
  on public.group_alerts for select
  using (public.owns_client_group(group_id));

drop policy if exists "group_alerts_update_owner" on public.group_alerts;
create policy "group_alerts_update_owner"
  on public.group_alerts for update
  using (public.owns_client_group(group_id))
  with check (public.owns_client_group(group_id));

-- ---------------------------------------------------------------------------
-- 6. Grup sohbetinde fotoğraflar diğer üyelere de görünsün
-- Önceki politika yalnızca dosya sahibine okuma veriyordu → gruptaki diğer
-- danışanlar ve diyetisyen paylaşılan tabak fotoğraflarını göremiyordu.
-- ---------------------------------------------------------------------------
create index if not exists messages_image_path_idx
  on public.messages (image_path) where image_path is not null;

drop policy if exists "chat_photos_select_member" on storage.objects;
create policy "chat_photos_select_member"
  on storage.objects for select
  using (
    bucket_id = 'progress-photos'
    and exists (
      select 1
      from public.messages m
      join public.conversation_members cm
        on cm.conversation_id = m.conversation_id
      where m.image_path = storage.objects.name
        and cm.user_id = auth.uid()
    )
  );
