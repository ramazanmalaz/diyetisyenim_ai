-- RevenueCat webhook için premium uzatma fonksiyonu.
-- Mevcut premium_until'den büyükse günceller; daha küçükse korur.
-- Bu idempotency sağlar: aynı webhook tekrar gelirse premium kısaltılmaz.

create or replace function extend_premium_until(
  p_user_id uuid,
  p_until    timestamptz
)
returns void
language plpgsql
security definer
as $$
begin
  update profiles
  set premium_until = p_until
  where id = p_user_id
    and (premium_until is null or premium_until < p_until);
end;
$$;
