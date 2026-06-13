-- Kullanıcının kendi (mevcut) diyet planını girerken yüklediği referans
-- görsellerin Storage yolları. progress-photos bucket'ında <uid>/plans/... altında tutulur.
-- (diet_plans.source zaten 'ai' | 'manual' değerlerini alıyor; varsayılan 'manual'.)
alter table public.diet_plans
  add column if not exists photo_paths text[];
