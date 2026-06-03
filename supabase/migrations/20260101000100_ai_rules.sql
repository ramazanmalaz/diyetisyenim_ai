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
