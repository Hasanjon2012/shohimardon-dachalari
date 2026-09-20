CREATE OR REPLACE FUNCTION public.bookings_set_total_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _nights integer;
  _unit_price numeric;
  _deposit_pct integer;
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

  SELECT deposit_percent INTO _deposit_pct FROM public.hotels WHERE id = NEW.hotel_id;
  IF _deposit_pct IS NULL THEN _deposit_pct := 25; END IF;

  NEW.total_price := _unit_price * _nights;
  NEW.deposit_percent := _deposit_pct;
  NEW.deposit_amount := ROUND(NEW.total_price * _deposit_pct / 100.0);
  NEW.status := 'pending_payment'::booking_status;
  NEW.payment_status := 'unpaid';
  NEW.payment_method := NULL;
  NEW.refund_eligible := false;
  NEW.payment_expires_at := now() + interval '30 minutes';
  NEW.paid_at := NULL;
  NEW.cancelled_at := NULL;
  RETURN NEW;
END $function$;