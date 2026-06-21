-- Kişiselleştirilebilir su hatırlatıcısı: saat aralığı + sıklık + bardak miktarı.
-- Önceden cron'da sabitti (10–20, 2 saatte bir, 200 ml).
alter table public.profiles
  add column if not exists water_start_hour smallint not null default 10,
  add column if not exists water_end_hour smallint not null default 20,
  add column if not exists water_interval_hours smallint not null default 2,
  add column if not exists water_amount_ml smallint not null default 200;
