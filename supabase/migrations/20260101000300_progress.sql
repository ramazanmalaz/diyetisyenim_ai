-- Aşama 5 — İlerleme takibi
-- progress_entries (kilo/ölçü/su/foto/not) + özel fotoğraf bucket'ı ve politikalar.

create table public.progress_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null default current_date,
  weight_kg numeric(5, 2),
  water_ml integer,
  waist_cm numeric(5, 1),
  hip_cm numeric(5, 1),
  note text,
  -- Storage'daki dosyanın yolu (public URL değil); görüntülerken imzalı URL üretilir.
  photo_path text,
  created_at timestamptz not null default now()
);

create index progress_entries_client_date_idx
  on public.progress_entries (client_id, entry_date);

alter table public.progress_entries enable row level security;

-- Danışan kendi kayıtlarını tam yönetir; personel okuyabilir.
create policy "progress_select"
  on public.progress_entries for select
  using (client_id = auth.uid() or public.is_staff(auth.uid()));

create policy "progress_insert_self"
  on public.progress_entries for insert
  with check (client_id = auth.uid());

create policy "progress_update_self"
  on public.progress_entries for update
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

create policy "progress_delete_self"
  on public.progress_entries for delete
  using (client_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: özel fotoğraf bucket'ı
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- Kullanıcı yalnızca kendi klasörüne (<uid>/...) yükler ve kendi dosyalarını okur.
create policy "progress_photos_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "progress_photos_select_own"
  on storage.objects for select
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "progress_photos_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
