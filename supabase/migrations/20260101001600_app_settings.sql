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
