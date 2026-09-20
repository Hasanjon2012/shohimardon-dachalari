
-- =========================================================
-- 1. STORAGE: hotel-images bucket
-- =========================================================
DROP POLICY IF EXISTS "Hotel images authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Hotel images owner delete" ON storage.objects;
DROP POLICY IF EXISTS "Hotel images owner update" ON storage.objects;
DROP POLICY IF EXISTS "Hotel images public read" ON storage.objects;

CREATE POLICY "Hotel images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hotel-images');

CREATE POLICY "Hotel images admin upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'hotel-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (
      public.has_role(auth.uid(), 'hotel_admin'::app_role)
      OR public.has_role(auth.uid(), 'super_owner'::app_role)
    )
  );

CREATE POLICY "Hotel images owner update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'hotel-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'super_owner'::app_role)
    )
  );

CREATE POLICY "Hotel images owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'hotel-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'super_owner'::app_role)
    )
  );

-- =========================================================
-- 2. HOTELS: hide unpublished from public
-- =========================================================
DROP POLICY IF EXISTS "Hotels: public read" ON public.hotels;

CREATE POLICY "Hotels: public read"
  ON public.hotels FOR SELECT
  USING (
    published = true
    OR auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'super_owner'::app_role)
  );

-- =========================================================
-- 3. BOOKINGS: server-side price + restricted updates
-- =========================================================

-- Trigger: compute total_price authoritatively on INSERT
CREATE OR REPLACE FUNCTION public.bookings_set_total_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _nights integer;
  _unit_price numeric;
BEGIN
  _nights := GREATEST((NEW.check_out - NEW.check_in), 1);

  IF NEW.room_id IS NOT NULL THEN
    SELECT price INTO _unit_price FROM public.rooms
      WHERE id = NEW.room_id AND hotel_id = NEW.hotel_id;
  END IF;

  IF _unit_price IS NULL THEN
    SELECT price_per_night INTO _unit_price FROM public.hotels
      WHERE id = NEW.hotel_id;
  END IF;

  IF _unit_price IS NULL THEN
    RAISE EXCEPTION 'Hotel/room price not found';
  END IF;

  NEW.total_price := _unit_price * _nights;
  -- Force fresh bookings to start as pending regardless of client input
  NEW.status := 'pending'::booking_status;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS bookings_set_total_price_trg ON public.bookings;
CREATE TRIGGER bookings_set_total_price_trg
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_set_total_price();

-- Trigger: enforce allowed updates per role
CREATE OR REPLACE FUNCTION public.bookings_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_super boolean := public.has_role(auth.uid(), 'super_owner'::app_role);
  _is_owner boolean := public.is_hotel_owner(auth.uid(), OLD.hotel_id);
  _is_user  boolean := (OLD.user_id = auth.uid());
BEGIN
  -- Immutable fields for everyone except super_owner
  IF NOT _is_super THEN
    IF NEW.user_id     IS DISTINCT FROM OLD.user_id     THEN RAISE EXCEPTION 'user_id is immutable'; END IF;
    IF NEW.hotel_id    IS DISTINCT FROM OLD.hotel_id    THEN RAISE EXCEPTION 'hotel_id is immutable'; END IF;
    IF NEW.room_id     IS DISTINCT FROM OLD.room_id     THEN RAISE EXCEPTION 'room_id is immutable'; END IF;
    IF NEW.total_price IS DISTINCT FROM OLD.total_price THEN RAISE EXCEPTION 'total_price is immutable'; END IF;
    IF NEW.check_in    IS DISTINCT FROM OLD.check_in    THEN RAISE EXCEPTION 'check_in is immutable'; END IF;
    IF NEW.check_out   IS DISTINCT FROM OLD.check_out   THEN RAISE EXCEPTION 'check_out is immutable'; END IF;
  END IF;

  -- Status transitions
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF _is_super OR _is_owner THEN
      -- allowed: any transition
      NULL;
    ELSIF _is_user THEN
      -- regular user can only cancel their booking
      IF NEW.status <> 'cancelled'::booking_status THEN
        RAISE EXCEPTION 'Users may only cancel their bookings';
      END IF;
    ELSE
      RAISE EXCEPTION 'Not allowed to update this booking';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS bookings_guard_update_trg ON public.bookings;
CREATE TRIGGER bookings_guard_update_trg
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_guard_update();

-- =========================================================
-- 4. Revoke direct execute on internal trigger functions
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_set_total_price() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_guard_update() FROM PUBLIC, anon, authenticated;
