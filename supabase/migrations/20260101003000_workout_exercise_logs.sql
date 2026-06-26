-- Antrenman kayıtları artık EGZERSİZ bazlı (her egzersize ayrı tik).
-- Önce gün bazlıydı (client_id, day_index, log_date). exercise_index eklenir ve
-- benzersizlik egzersizi de kapsar. Eski satırlar exercise_index=0 alır
-- (yeni özellik, küçük artı; göz ardı edilebilir).
alter table public.workout_logs
  add column if not exists exercise_index smallint not null default 0;

-- Eski gün-bazlı benzersizlik kısıtını kaldır (varsa).
alter table public.workout_logs
  drop constraint if exists workout_logs_client_id_day_index_log_date_key;

-- Yeni: egzersiz bazlı benzersizlik.
create unique index if not exists workout_logs_unique_exercise
  on public.workout_logs (client_id, day_index, exercise_index, log_date);
