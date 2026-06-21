-- Öğün detayı: makro besin değerleri (protein/karbonhidrat/yağ, gram) + kısa
-- hazırlanış (tarif) ve ipucu. İlk kez "detay" açıldığında AI ile üretilip bu
-- alanlara yazılır (cache); sonraki açılışlar anında ve ücretsiz gelir.
alter table public.meals
  add column if not exists protein_g numeric(6, 1),
  add column if not exists carb_g numeric(6, 1),
  add column if not exists fat_g numeric(6, 1),
  add column if not exists recipe text,
  add column if not exists tip text;
