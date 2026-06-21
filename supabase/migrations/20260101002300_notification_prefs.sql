-- Merkezi bildirim tercihleri. water_reminder_enabled zaten vardı (migration 1900).
-- Öğün hatırlatıcıları (kahvaltı/öğle/akşam, kullanıcı saati) + pomodoro ana anahtarı.
alter table public.profiles
  add column if not exists meal_reminders_enabled boolean not null default false,
  add column if not exists breakfast_time text not null default '08:00',
  add column if not exists lunch_time text not null default '13:00',
  add column if not exists dinner_time text not null default '19:00',
  add column if not exists pomodoro_reminders_enabled boolean not null default true;
