-- Öne çıkarma (featured): ücreti karşılığında diyetisyen listede üstte +
-- "Öne çıkan" rozetiyle gösterilir. Yönetim panelinden açılıp kapatılır.
alter table public.dietitians
  add column if not exists featured boolean not null default false;
