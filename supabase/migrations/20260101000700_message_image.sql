-- Faz 3 — Sohbette fotoğraf: mesaja görsel yolu (Storage) eklenir.
alter table public.messages add column if not exists image_path text;
