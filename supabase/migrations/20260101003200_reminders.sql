-- Hatırlatıcılar (Apple Reminders tarzı): kullanıcı listeleri + hatırlatıcı öğeleri.
-- Akıllı listeler (Bugün/Planlı/Tümü/Bayraklı) sorgu ile türetilir; tablo tutulmaz.

create table if not exists public.reminder_lists (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default 'blue',   -- renk anahtarı (UI paleti)
  icon text not null default 'list',     -- ikon anahtarı (UI)
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users (id) on delete cascade,
  list_id uuid references public.reminder_lists (id) on delete cascade,
  title text not null,
  notes text,
  url text,
  due_at timestamptz,          -- tarih (+ opsiyonel saat)
  has_time boolean not null default false,
  flagged boolean not null default false,
  priority smallint not null default 0,  -- 0=yok,1=düşük,2=orta,3=yüksek
  completed boolean not null default false,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists reminder_lists_client_idx on public.reminder_lists (client_id, sort_order);
create index if not exists reminders_client_idx on public.reminders (client_id, completed);
create index if not exists reminders_list_idx on public.reminders (list_id);
create index if not exists reminders_due_idx on public.reminders (client_id, due_at);

alter table public.reminder_lists enable row level security;
alter table public.reminders enable row level security;

drop policy if exists "reminder_lists_self" on public.reminder_lists;
create policy "reminder_lists_self" on public.reminder_lists
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());

drop policy if exists "reminders_self" on public.reminders;
create policy "reminders_self" on public.reminders
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());
