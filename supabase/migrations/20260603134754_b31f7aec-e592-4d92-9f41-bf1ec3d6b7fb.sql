-- 1) Revoke anon access to hotels.phone (keep authenticated access for booking flow)
REVOKE SELECT ON public.hotels FROM anon;
GRANT SELECT (id, owner_id, name, slug, description, price_per_night, rating, amenities, cover_image, published, created_at, updated_at, lat, lng, location, deposit_percent) ON public.hotels TO anon;

-- 2) Tighten profiles self-update: prevent users from changing protected columns via policy
DROP POLICY IF EXISTS "Profiles: self update" ON public.profiles;
CREATE POLICY "Profiles: self update"
ON public.profiles
FOR UPDATE
USING ((auth.uid() = id) OR has_role(auth.uid(), 'super_owner'::app_role))
WITH CHECK (
  has_role(auth.uid(), 'super_owner'::app_role)
  OR (
    auth.uid() = id
    AND blocked   = (SELECT p.blocked   FROM public.profiles p WHERE p.id = auth.uid())
    AND trust_score = (SELECT p.trust_score FROM public.profiles p WHERE p.id = auth.uid())
    AND no_show_count = (SELECT p.no_show_count FROM public.profiles p WHERE p.id = auth.uid())
  )
);

-- 3) Tighten bookings update: users may only change a narrow set of columns; payment/status fields stay owner/super only
DROP POLICY IF EXISTS "Bookings: owner+user update" ON public.bookings;
CREATE POLICY "Bookings: owner+user update"
ON public.bookings
FOR UPDATE
USING ((user_id = auth.uid()) OR is_hotel_owner(auth.uid(), hotel_id) OR has_role(auth.uid(), 'super_owner'::app_role))
WITH CHECK (
  is_hotel_owner(auth.uid(), hotel_id)
  OR has_role(auth.uid(), 'super_owner'::app_role)
  OR (
    user_id = auth.uid()
    AND payment_status = (SELECT b.payment_status FROM public.bookings b WHERE b.id = bookings.id)
    AND paid_at        IS NOT DISTINCT FROM (SELECT b.paid_at FROM public.bookings b WHERE b.id = bookings.id)
    AND payment_method IS NOT DISTINCT FROM (SELECT b.payment_method FROM public.bookings b WHERE b.id = bookings.id)
    AND deposit_amount = (SELECT b.deposit_amount FROM public.bookings b WHERE b.id = bookings.id)
    AND deposit_percent = (SELECT b.deposit_percent FROM public.bookings b WHERE b.id = bookings.id)
    AND total_price    = (SELECT b.total_price FROM public.bookings b WHERE b.id = bookings.id)
    AND payment_expires_at IS NOT DISTINCT FROM (SELECT b.payment_expires_at FROM public.bookings b WHERE b.id = bookings.id)
    AND refund_eligible = (SELECT b.refund_eligible FROM public.bookings b WHERE b.id = bookings.id)
    AND check_in  = (SELECT b.check_in  FROM public.bookings b WHERE b.id = bookings.id)
    AND check_out = (SELECT b.check_out FROM public.bookings b WHERE b.id = bookings.id)
    AND room_id   IS NOT DISTINCT FROM (SELECT b.room_id FROM public.bookings b WHERE b.id = bookings.id)
    AND hotel_id  = (SELECT b.hotel_id FROM public.bookings b WHERE b.id = bookings.id)
  )
);