-- Gerçek diyetisyenler + slot bazlı randevu.
-- dietitians: bağımsız katalog (auth'a bağlı değil) — admin yönetir.
-- dietitian_slots: diyetisyenin tanımladığı müsait saatler; danışan seçer.
-- appointments: dietitian_ref + slot_id alanları eklenir.

create table if not exists public.dietitians (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  title text not null default 'Diyetisyen',
  bio text,
  specialties text[] not null default '{}',
  city text,
  photo_url text,
  years_experience integer,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  -- İletişim bilgisi yalnızca personel içindir; danışana gösterilmez (RLS ile).
  contact_phone text,
  contact_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.dietitian_slots (
  id uuid primary key default gen_random_uuid(),
  dietitian_id uuid not null references public.dietitians (id) on delete cascade,
  start_at timestamptz not null,
  duration_min integer not null default 40,
  status text not null default 'open' check (status in ('open', 'booked', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists dietitian_slots_idx
  on public.dietitian_slots (dietitian_id, start_at);

alter table public.appointments
  add column if not exists dietitian_ref uuid references public.dietitians (id) on delete set null,
  add column if not exists slot_id uuid references public.dietitian_slots (id) on delete set null;

alter table public.dietitians enable row level security;
alter table public.dietitian_slots enable row level security;

-- ---------------------------------------------------------------------------
-- RLS: dietitians — danışan yalnızca aktifleri görür; personel hepsini yönetir.
-- NOT: contact_phone/contact_email kolonları client sorgularında SEÇİLMEZ
-- (uygulama bunları danışana hiç göndermez). Hassas alanlar yalnızca personel
-- ekranlarında okunur.
-- ---------------------------------------------------------------------------
create policy "dietitians_select_active"
  on public.dietitians for select
  using (is_active or public.is_staff(auth.uid()));
create policy "dietitians_write_staff"
  on public.dietitians for all
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- dietitian_slots — herkes (giriş yapmış) görebilir; yalnızca personel yazar.
create policy "slots_select_authenticated"
  on public.dietitian_slots for select
  using (auth.uid() is not null);
create policy "slots_write_staff"
  on public.dietitian_slots for all
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- Seed: Ankara'dan 5 örnek diyetisyen (kurgusal) + önümüzdeki günler için slotlar.
-- Fotoğraflar yer tutucu (DiceBear); admin gerçek foto ile değiştirebilir.
-- İletişim bilgisi danışana gösterilmez.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.dietitians) then
    insert into public.dietitians
      (full_name, title, bio, specialties, city, photo_url, years_experience, sort_order)
    values
      ('Dyt. Elif Yılmaz', 'Uzman Diyetisyen',
       'Kilo yönetimi ve sürdürülebilir beslenme alışkanlıkları üzerine çalışır. Bireye özel, uygulanabilir programlar hazırlar.',
       array['Kilo yönetimi','Sağlıklı beslenme','Davranış değişikliği'], 'Ankara',
       'https://api.dicebear.com/9.x/avataaars/svg?seed=ElifYilmaz', 8, 1),
      ('Dyt. Mert Demir', 'Diyetisyen',
       'Sporcu beslenmesi ve kas kazanımı odaklı programlar. Antrenmanla uyumlu öğün planlaması yapar.',
       array['Sporcu beslenmesi','Kas kazanımı','Performans'], 'Ankara',
       'https://api.dicebear.com/9.x/avataaars/svg?seed=MertDemir', 6, 2),
      ('Dyt. Zeynep Kaya', 'Uzman Diyetisyen',
       'Klinik beslenme; diyabet, insülin direnci ve PCOS yönetiminde deneyimli. Tıbbi beslenme tedavisi uygular.',
       array['Diyabet','İnsulin direnci','PCOS'], 'Ankara',
       'https://api.dicebear.com/9.x/avataaars/svg?seed=ZeynepKaya', 11, 3),
      ('Dyt. Burak Şahin', 'Diyetisyen',
       'Aralıklı oruç ve metabolik sağlık. Yoğun çalışan profesyoneller için pratik beslenme çözümleri sunar.',
       array['Aralıklı oruç','Metabolik sağlık','Pratik beslenme'], 'Ankara',
       'https://api.dicebear.com/9.x/avataaars/svg?seed=BurakSahin', 5, 4),
      ('Dyt. Aslı Çetin', 'Uzman Diyetisyen',
       'Çocuk ve adölesan beslenmesi, hamilelik ve emzirme dönemi beslenmesinde uzman.',
       array['Çocuk beslenmesi','Gebelik','Emzirme'], 'Ankara',
       'https://api.dicebear.com/9.x/avataaars/svg?seed=AsliCetin', 9, 5);

    -- Her diyetisyen için önümüzdeki 1–5. günlerde 10:00, 13:00, 16:00 slotları.
    insert into public.dietitian_slots (dietitian_id, start_at, duration_min)
    select d.id, day + h.val, 40
    from public.dietitians d
    cross join generate_series(
      date_trunc('day', now()) + interval '1 day',
      date_trunc('day', now()) + interval '5 day',
      interval '1 day'
    ) as day
    cross join (values (interval '10 hour'), (interval '13 hour'), (interval '16 hour')) as h(val);
  end if;
end $$;
