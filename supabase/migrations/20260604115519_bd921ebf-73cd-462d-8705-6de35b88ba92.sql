
-- 1) Reviews: require a real booking
DROP POLICY IF EXISTS "Reviews: user insert own" ON public.reviews;
CREATE POLICY "Reviews: user insert own" ON public.reviews
FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND NOT public.is_blocked(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.hotels h ON h.id = r.hotel_id
    WHERE r.id = reviews.room_id
      AND r.hotel_id = reviews.hotel_id
      AND h.published = true
  )
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.user_id = auth.uid()
      AND b.room_id = reviews.room_id
      AND b.hotel_id = reviews.hotel_id
      AND b.status IN ('confirmed'::booking_status, 'no_show'::booking_status)
  )
);

-- 2) Reviews: hide user_id from anonymous readers via column-level grants
REVOKE SELECT ON public.reviews FROM anon;
GRANT SELECT (id, hotel_id, room_id, rating, comment, created_at, updated_at) ON public.reviews TO anon;
GRANT SELECT ON public.reviews TO authenticated;

-- 3) Hotels: restrict owner update to non-system-managed fields
DROP POLICY IF EXISTS "Hotels: owner update" ON public.hotels;
CREATE POLICY "Hotels: owner update" ON public.hotels
FOR UPDATE
USING ((auth.uid() = owner_id) OR public.has_role(auth.uid(), 'super_owner'::app_role))
WITH CHECK (
  public.has_role(auth.uid(), 'super_owner'::app_role)
  OR (
    auth.uid() = owner_id
    AND owner_id = (SELECT h.owner_id FROM public.hotels h WHERE h.id = hotels.id)
    AND rating IS NOT DISTINCT FROM (SELECT h.rating FROM public.hotels h WHERE h.id = hotels.id)
    AND published IS NOT DISTINCT FROM (SELECT h.published FROM public.hotels h WHERE h.id = hotels.id)
    AND deposit_percent IS NOT DISTINCT FROM (SELECT h.deposit_percent FROM public.hotels h WHERE h.id = hotels.id)
    AND slug IS NOT DISTINCT FROM (SELECT h.slug FROM public.hotels h WHERE h.id = hotels.id)
  )
);

-- 4) Remove email-match auto-elevation in handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _requested TEXT;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );

  _requested := NEW.raw_user_meta_data->>'role';

  -- Always default to 'user'. Super_owner must be assigned manually out-of-band.
  -- Hotel-admin requests require owner approval.
  IF _requested = 'hotel_admin' THEN
    INSERT INTO public.admin_requests (user_id, status)
    VALUES (NEW.id, 'pending')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user'::app_role);
  RETURN NEW;
END $function$;
