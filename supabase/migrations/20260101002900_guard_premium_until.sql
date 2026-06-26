-- GÜVENLİK DÜZELTMESİ: premium_until ayrıcalık yükseltmesini engelle.
--
-- profiles_update_self politikası kullanıcının kendi profil satırını
-- güncellemesine izin veriyor; eski guard_profile_update tetikleyicisi yalnızca
-- `role` değişimini engelliyordu. Bu yüzden giriş yapmış herhangi bir kullanıcı
-- (anon anahtar + kendi oturumu) doğrudan `profiles.premium_until` alanını ileri
-- bir tarihe çekip bedavaya sınırsız premium elde edebiliyordu.
--
-- Çözüm: premium_until yalnızca personel (diyetisyen/admin) veya ödeme
-- callback'i (service-role; auth.uid() null) tarafından değiştirilebilir.
-- Normal kullanıcı kendi premium_until'ini değiştiremez.

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Rol değişimini yalnızca personel yapabilir.
  if new.role is distinct from old.role and not public.is_staff(auth.uid()) then
    raise exception 'Yetkisiz rol değişikliği';
  end if;

  -- premium_until değişimini yalnızca personel ya da service-role (callback;
  -- auth.uid() null) yapabilir. Sıradan kullanıcı kendine premium veremez.
  if new.premium_until is distinct from old.premium_until
     and auth.uid() is not null
     and not public.is_staff(auth.uid()) then
    raise exception 'Yetkisiz premium değişikliği';
  end if;

  new.updated_at = now();
  return new;
end;
$$;
