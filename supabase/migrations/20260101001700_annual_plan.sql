-- Yıllık premium paketi (app_settings) + ödeme başına tanınan premium gün sayısı.

-- Yıllık tarife varsayılanları (panelden düzenlenebilir).
insert into public.app_settings (key, value) values
  ('annual_price', '1990.00'),
  ('annual_title', 'Premium (Yıllık)'),
  ('annual_days', '365')
on conflict (key) do nothing;

-- Her ödeme, satın alınan pakete göre kaç gün premium tanımladığını taşır.
-- Webhook ödeme onaylanınca bu değeri kullanır (callback anındaki fiyattan bağımsız).
alter table public.payments
  add column if not exists premium_days integer;
