-- Diyetisyen profilini zenginleştiren alanlar: slogan, hizmet alanları,
-- çalışma saatleri, açık adres ve halka açık iletişim (Instagram / WhatsApp).
-- Not: contact_phone/contact_email gizli kalır (yalnızca yönetim); aşağıdaki
-- whatsapp/instagram/address alanları diyetisyenin yayımlamayı seçtiği
-- HALKA AÇIK bilgilerdir ve profilde gösterilir.

alter table public.dietitians
  add column if not exists slogan text,
  add column if not exists services text[] not null default '{}',
  add column if not exists working_hours jsonb,
  add column if not exists address text,
  add column if not exists instagram text,
  add column if not exists whatsapp text;

-- ---------------------------------------------------------------------------
-- Seed: Diyetisyen Nur ALAN TOPALOĞLU profili (varsa günceller, yoksa ekler).
-- Kaynak: bursa-diyetisyen tanıtım sitesi.
-- ---------------------------------------------------------------------------
do $$
declare
  did uuid;
begin
  select id into did
  from public.dietitians
  where full_name ilike '%nur%alan%topalo%'
  limit 1;

  if did is null then
    insert into public.dietitians (full_name, title, is_active, sort_order)
    values ('Dyt. Nur Alan Topaloğlu', 'Diyetisyen', true, 0)
    returning id into did;
  end if;

  update public.dietitians set
    title = 'Diyetisyen',
    is_active = true,
    city = 'Bursa',
    slogan = 'Önce Kendinize, Sonra Diyetisyeninize Güvenin',
    bio = 'Sağlık öykünüze, kan tahlillerinize, günlük alışkanlıklarınıza, işinize ve hedefinize uygun beslenme planını birlikte oluşturuyoruz. Yıllardır edindiğim deneyimle; sağlıklı beslenme, kilo verme/alma, sporcu beslenmesi, okul çağı ve adölesan dönemi, hamilelik ve emzirme dönemi ile hastalıklarda beslenme tedavisi alanlarında sizlere hizmet vermeye devam ediyorum.',
    specialties = array[
      'Kilo Yönetimi',
      'Sporcu Beslenmesi',
      'Gebelik & Emzirme',
      'Hastalıklarda Beslenme'
    ],
    services = array[
      'Sağlıklı Beslenme',
      'Sağlıklı Kilo Verme ve Alma Programları',
      'Sporcularda Beslenme Programları',
      'Okul Çağı ve Adölesan Döneminde Beslenme',
      'Hamilelik ve Emzirme Döneminde Beslenme',
      'Hastalıklarda Beslenme Tedavisi'
    ],
    working_hours = jsonb_build_object(
      'mon', '10:00–17:00',
      'tue', '10:00–17:00',
      'wed', '10:00–17:00',
      'thu', '10:00–17:00',
      'fri', '10:00–17:00',
      'sat', 'Kapalı',
      'sun', 'Kapalı'
    ),
    address = '2. Okul Caddesi No:11, 16150 Osmangazi/Bursa',
    instagram = 'diyetisyen_nur_alan',
    whatsapp = '905462420243'
  where id = did;
end $$;
