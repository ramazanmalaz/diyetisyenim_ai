-- Besin veritabanı + yapılandırılmış öğün öğeleri
-- foods: ad + birim + birim başına kalori. meals: food_id + quantity (kalori otomatik).

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit_label text not null, -- adet, dilim, kase, porsiyon, bardak, yemek kaşığı, 100 g...
  kcal_per_unit integer not null,
  created_at timestamptz not null default now()
);

alter table public.foods enable row level security;

-- Besin listesi tüm giriş yapmış kullanıcılarca okunabilir; yalnızca personel yazar.
create policy "foods_select_authenticated"
  on public.foods for select
  using (auth.uid() is not null);
create policy "foods_write_staff"
  on public.foods for all
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- meals: yapılandırılmış öğe alanları
alter table public.meals
  add column if not exists food_id uuid references public.foods (id) on delete set null,
  add column if not exists quantity numeric(6, 2);

-- ---------------------------------------------------------------------------
-- Seed: yaygın besinler (yaklaşık kaloriler)
-- ---------------------------------------------------------------------------
insert into public.foods (name, unit_label, kcal_per_unit) values
  ('Haşlanmış yumurta', 'adet', 70),
  ('Menemen', 'porsiyon', 230),
  ('Beyaz peynir', 'dilim', 75),
  ('Kaşar peyniri', 'dilim', 110),
  ('Lor peyniri', 'yemek kaşığı', 30),
  ('Tam buğday ekmeği', 'dilim', 70),
  ('Beyaz ekmek', 'dilim', 80),
  ('Siyah zeytin', 'adet', 7),
  ('Yeşil zeytin', 'adet', 6),
  ('Domates', 'adet', 20),
  ('Salatalık', 'adet', 15),
  ('Yeşil biber', 'adet', 10),
  ('Elma', 'adet (orta)', 80),
  ('Muz', 'adet (orta)', 90),
  ('Mandalina', 'adet', 40),
  ('Portakal', 'adet', 60),
  ('Fındık', 'adet', 7),
  ('Badem', 'adet', 7),
  ('Ceviz içi', 'yarım', 13),
  ('Yağsız sade yoğurt', 'kase (150 g)', 85),
  ('Tam yağlı yoğurt', 'kase (150 g)', 150),
  ('Süt', 'bardak', 120),
  ('Ayran', 'bardak', 60),
  ('Mercimek çorbası', 'kase', 180),
  ('Yoğurt çorbası', 'kase', 150),
  ('Zeytinyağlı nohut', 'porsiyon', 210),
  ('Pirinç pilavı', 'kase', 250),
  ('Bulgur pilavı', 'kase', 180),
  ('Makarna', 'porsiyon', 220),
  ('Izgara tavuk göğsü', '100 g', 165),
  ('Izgara köfte', '100 g', 250),
  ('Fırında balık', '100 g', 120),
  ('Mevsim salata', 'kase', 60),
  ('Haşlanmış brokoli', 'porsiyon (100 g)', 35),
  ('Buharda ıspanak', 'porsiyon (150 g)', 55),
  ('Zeytinyağı', 'yemek kaşığı', 120),
  ('Bal', 'tatlı kaşığı', 25),
  ('Tahin', 'yemek kaşığı', 90),
  ('Çay', 'bardak', 2)
on conflict do nothing;
