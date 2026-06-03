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
