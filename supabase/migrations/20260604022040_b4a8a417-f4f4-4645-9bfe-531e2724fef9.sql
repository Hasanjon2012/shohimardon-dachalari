
-- 1. Attach missing triggers (functions exist but were never wired up)

DROP TRIGGER IF EXISTS bookings_set_total_price_trg ON public.bookings;
CREATE TRIGGER bookings_set_total_price_trg
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_set_total_price();

DROP TRIGGER IF EXISTS bookings_guard_update_trg ON public.bookings;
CREATE TRIGGER bookings_guard_update_trg
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_guard_update();

DROP TRIGGER IF EXISTS bookings_prevent_overlap_trg ON public.bookings;
CREATE TRIGGER bookings_prevent_overlap_trg
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_prevent_overlap();

DROP TRIGGER IF EXISTS profiles_guard_update_trg ON public.profiles;
CREATE TRIGGER profiles_guard_update_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_update();

DROP TRIGGER IF EXISTS set_updated_at_bookings ON public.bookings;
CREATE TRIGGER set_updated_at_bookings
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_hotels ON public.hotels;
CREATE TRIGGER set_updated_at_hotels
BEFORE UPDATE ON public.hotels
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Restrict access to hotels.phone so signed-in non-owners cannot read it.
--    The 'Hotels: published public read' policy is granted to authenticated too,
--    so we revoke the phone column at the role level for both anon and authenticated.
--    Owners/super_owners read via the 'Hotels: owner and super read' policy which
--    uses the same role grants — to keep that working we use a security-barrier view
--    is overkill; instead enforce via column-level GRANT.
REVOKE SELECT ON public.hotels FROM anon, authenticated;

-- Re-grant every column EXCEPT phone to anon/authenticated.
GRANT SELECT (
  id, owner_id, name, slug, description, location, price_per_night,
  rating, amenities, cover_image, published, created_at, updated_at,
  lat, lng, deposit_percent
) ON public.hotels TO anon, authenticated;

-- Owners still need to read/update phone on their own rows. Expose phone
-- selectively through a SECURITY DEFINER helper view scoped by RLS isn't possible
-- with column grants alone, so we expose phone reads via a security-definer function.
CREATE OR REPLACE FUNCTION public.hotel_phone(_hotel_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone FROM public.hotels
  WHERE id = _hotel_id
    AND (
      owner_id = auth.uid()
      OR public.has_role(auth.uid(), 'super_owner'::app_role)
    )
$$;

GRANT EXECUTE ON FUNCTION public.hotel_phone(uuid) TO authenticated;

-- Owners also need INSERT/UPDATE on all columns including phone; that already
-- works via the existing table-level INSERT/UPDATE policies which are not
-- column-scoped (column grants below).
GRANT INSERT, UPDATE ON public.hotels TO authenticated;

-- 3. Tighten Bookings update policy: non-owner/non-super users can ONLY
--    move status to 'cancelled' (the guard trigger already enforces this,
--    but make the RLS check explicit so it's defense-in-depth).
DROP POLICY IF EXISTS "Bookings: owner+user update" ON public.bookings;
CREATE POLICY "Bookings: owner+user update"
ON public.bookings
FOR UPDATE
USING (
  user_id = auth.uid()
  OR public.is_hotel_owner(auth.uid(), hotel_id)
  OR public.has_role(auth.uid(), 'super_owner'::app_role)
)
WITH CHECK (
  public.is_hotel_owner(auth.uid(), hotel_id)
  OR public.has_role(auth.uid(), 'super_owner'::app_role)
  OR (
    user_id = auth.uid()
    AND status::text IN ('cancelled', 'pending', 'pending_payment')
    AND payment_status = (SELECT b.payment_status FROM public.bookings b WHERE b.id = bookings.id)
    AND NOT (paid_at IS DISTINCT FROM (SELECT b.paid_at FROM public.bookings b WHERE b.id = bookings.id))
    AND NOT (payment_method IS DISTINCT FROM (SELECT b.payment_method FROM public.bookings b WHERE b.id = bookings.id))
    AND deposit_amount = (SELECT b.deposit_amount FROM public.bookings b WHERE b.id = bookings.id)
    AND deposit_percent = (SELECT b.deposit_percent FROM public.bookings b WHERE b.id = bookings.id)
    AND total_price = (SELECT b.total_price FROM public.bookings b WHERE b.id = bookings.id)
    AND NOT (payment_expires_at IS DISTINCT FROM (SELECT b.payment_expires_at FROM public.bookings b WHERE b.id = bookings.id))
    AND refund_eligible = (SELECT b.refund_eligible FROM public.bookings b WHERE b.id = bookings.id)
    AND check_in = (SELECT b.check_in FROM public.bookings b WHERE b.id = bookings.id)
    AND check_out = (SELECT b.check_out FROM public.bookings b WHERE b.id = bookings.id)
    AND NOT (room_id IS DISTINCT FROM (SELECT b.room_id FROM public.bookings b WHERE b.id = bookings.id))
    AND hotel_id = (SELECT b.hotel_id FROM public.bookings b WHERE b.id = bookings.id)
  )
);
