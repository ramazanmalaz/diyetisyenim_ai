-- Öğün öğelerine "tiklendi/yenildi" durumu + besin listesini genişletme.

alter table public.meals
  add column if not exists checked boolean not null default false;

-- foods.name benzersiz olsun ki tekrar eklemeler çakışmasın (idempotent seed).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'foods_name_unique'
  ) then
    alter table public.foods add constraint foods_name_unique unique (name);
  end if;
end $$;

insert into public.foods (name, unit_label, kcal_per_unit) values
  ('Sucuk', 'dilim', 35),
  ('Kavurma', 'yemek kaşığı', 60),
  ('Sahanda yumurta', 'adet', 100),
  ('Omlet', 'porsiyon', 220),
  ('Simit', 'adet', 270),
  ('Poğaça', 'adet', 250),
  ('Tereyağı', 'tatlı kaşığı', 35),
  ('Reçel', 'tatlı kaşığı', 30),
  ('Pekmez', 'tatlı kaşığı', 35),
  ('Labne', 'yemek kaşığı', 40),
  ('Tulum peyniri', 'dilim', 100),
  ('Hellim peyniri', 'dilim', 90),
  ('Çökelek', 'yemek kaşığı', 25),
  ('Çilek', 'kase', 50),
  ('Karpuz', 'dilim', 85),
  ('Kavun', 'dilim', 60),
  ('Üzüm', 'küçük salkım', 90),
  ('Armut', 'adet', 90),
  ('Şeftali', 'adet', 60),
  ('Kayısı', 'adet', 17),
  ('Kiraz', '10 adet', 50),
  ('İncir', 'adet', 47),
  ('Nar', 'adet', 105),
  ('Avokado', 'adet', 240),
  ('Kuru kayısı', 'adet', 20),
  ('Kuru üzüm', 'yemek kaşığı', 30),
  ('Hurma', 'adet', 20),
  ('Antep fıstığı', 'adet', 4),
  ('Kaju', 'adet', 9),
  ('Yer fıstığı', 'adet', 6),
  ('Ay çekirdeği', 'avuç', 160),
  ('Kuru fasulye', 'porsiyon', 230),
  ('Etli nohut', 'porsiyon', 260),
  ('Mercimek yemeği', 'porsiyon', 190),
  ('Sebze türlü', 'porsiyon', 150),
  ('İmam bayıldı', 'porsiyon', 200),
  ('Karnıyarık', 'adet', 250),
  ('Yaprak sarma', 'adet', 35),
  ('İçli köfte', 'adet', 180),
  ('Mantı', 'porsiyon', 350),
  ('Lahmacun', 'adet', 250),
  ('Kıymalı pide', 'dilim', 200),
  ('Tavuk döner', 'porsiyon', 350),
  ('Tavuk but', 'adet', 220),
  ('Dana eti', '100 g', 250),
  ('Kuzu eti', '100 g', 290),
  ('Köfte', 'adet', 60),
  ('Somon', '100 g', 200),
  ('Ton balığı', 'kutu', 130),
  ('Çoban salata', 'kase', 60),
  ('Roka salatası', 'porsiyon', 15),
  ('Patates haşlama', 'adet', 90),
  ('Patates kızartması', 'porsiyon', 310),
  ('Ezogelin çorbası', 'kase', 160),
  ('Domates çorbası', 'kase', 120),
  ('Tavuk suyu çorba', 'kase', 110),
  ('Türk kahvesi', 'fincan', 5),
  ('Filtre kahve', 'bardak', 5),
  ('Meyve suyu', 'bardak', 110),
  ('Limonata', 'bardak', 100),
  ('Kefir', 'bardak', 100),
  ('Bitki çayı', 'bardak', 2),
  ('Yulaf ezmesi', 'kase', 150),
  ('Granola', 'porsiyon', 200),
  ('Müsli', 'kase', 180),
  ('Bitter çikolata', 'kare', 50),
  ('Sütlaç', 'kase', 200),
  ('Baklava', 'dilim', 200),
  ('Protein bar', 'adet', 200),
  ('Protein tozu', 'ölçek', 120)
on conflict (name) do nothing;
