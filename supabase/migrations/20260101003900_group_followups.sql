-- Grup asistanı kişi kişi takip: akşam tabağı yoklaması için son öğün paylaşım
-- zamanı (meals_shared sayısı hangi öğün olduğunu söylemiyor).
alter table public.group_member_days
  add column if not exists last_meal_at timestamptz;
