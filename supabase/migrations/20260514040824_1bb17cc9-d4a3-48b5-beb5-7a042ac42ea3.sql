CREATE OR REPLACE FUNCTION public.bookings_prevent_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ranges text;
BEGIN
  IF NEW.status = 'cancelled'::booking_status THEN
    RETURN NEW;
  END IF;

  IF NEW.room_id IS NOT NULL THEN
    SELECT string_agg(check_in::text || ' → ' || check_out::text, ', ')
      INTO _ranges
    FROM public.bookings
    WHERE hotel_id = NEW.hotel_id
      AND room_id = NEW.room_id
      AND status <> 'cancelled'::booking_status
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND check_in < NEW.check_out
      AND check_out > NEW.check_in;
  ELSE
    SELECT string_agg(check_in::text || ' → ' || check_out::text, ', ')
      INTO _ranges
    FROM public.bookings
    WHERE hotel_id = NEW.hotel_id
      AND room_id IS NULL
      AND status <> 'cancelled'::booking_status
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND check_in < NEW.check_out
      AND check_out > NEW.check_in;
  END IF;

  IF _ranges IS NOT NULL THEN
    RAISE EXCEPTION 'Bu xona tanlangan kunlarda allaqachon band. Band kunlar: %', _ranges
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS bookings_prevent_overlap_trg ON public.bookings;
CREATE TRIGGER bookings_prevent_overlap_trg
BEFORE INSERT OR UPDATE OF check_in, check_out, room_id, status
ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.bookings_prevent_overlap();