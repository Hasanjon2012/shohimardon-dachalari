CREATE OR REPLACE FUNCTION public.profiles_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _bypass text := current_setting('app.bypass_profile_guard', true);
BEGIN
  IF _bypass = 'on' THEN
    RETURN NEW;
  END IF;
  IF NOT public.has_role(auth.uid(), 'super_owner'::app_role) THEN
    IF NEW.blocked IS DISTINCT FROM OLD.blocked THEN
      RAISE EXCEPTION 'Not allowed to change blocked status';
    END IF;
    IF NEW.trust_score IS DISTINCT FROM OLD.trust_score THEN
      RAISE EXCEPTION 'Not allowed to change trust_score';
    END IF;
    IF NEW.no_show_count IS DISTINCT FROM OLD.no_show_count THEN
      RAISE EXCEPTION 'Not allowed to change no_show_count';
    END IF;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.mark_booking_no_show(_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _b record;
  _is_super boolean := public.has_role(auth.uid(), 'super_owner'::app_role);
BEGIN
  SELECT * INTO _b FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF NOT (_is_super OR public.is_hotel_owner(auth.uid(), _b.hotel_id)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _b.user_id IS NOT NULL THEN
    PERFORM set_config('app.bypass_profile_guard', 'on', true);
    UPDATE public.profiles
       SET no_show_count = COALESCE(no_show_count, 0) + 1,
           trust_score   = GREATEST(0, COALESCE(trust_score, 100) - 20)
     WHERE id = _b.user_id;
    PERFORM set_config('app.bypass_profile_guard', 'off', true);
  END IF;
  DELETE FROM public.bookings WHERE id = _booking_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.adjust_user_trust_score(_user_id uuid, _delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _new integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_owner'::app_role) THEN
    RAISE EXCEPTION 'Only super owners can adjust trust score';
  END IF;
  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
     SET trust_score = GREATEST(0, LEAST(100, COALESCE(trust_score, 100) + _delta))
   WHERE id = _user_id
  RETURNING trust_score INTO _new;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);
  RETURN _new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reset_all_trust_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_owner'::app_role) THEN
    RAISE EXCEPTION 'Only super owners can reset trust scores';
  END IF;
  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles SET trust_score = 100, no_show_count = 0;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);
END;
$function$;

-- Also fix bookings trigger which decrements trust_score on no_show status change
CREATE OR REPLACE FUNCTION public.bookings_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _is_service boolean := auth.role() = 'service_role';
  _is_super boolean := public.has_role(auth.uid(), 'super_owner'::app_role);
  _is_owner boolean := public.is_hotel_owner(auth.uid(), OLD.hotel_id);
  _is_user  boolean := (OLD.user_id = auth.uid());
  _days_until integer;
BEGIN
  IF NOT (_is_service OR _is_super) THEN
    IF NEW.user_id     IS DISTINCT FROM OLD.user_id     THEN RAISE EXCEPTION 'user_id is immutable'; END IF;
    IF NEW.hotel_id    IS DISTINCT FROM OLD.hotel_id    THEN RAISE EXCEPTION 'hotel_id is immutable'; END IF;
    IF NEW.room_id     IS DISTINCT FROM OLD.room_id     THEN RAISE EXCEPTION 'room_id is immutable'; END IF;
    IF NEW.total_price IS DISTINCT FROM OLD.total_price THEN RAISE EXCEPTION 'total_price is immutable'; END IF;
    IF NEW.deposit_amount IS DISTINCT FROM OLD.deposit_amount THEN RAISE EXCEPTION 'deposit_amount is immutable'; END IF;
    IF NEW.check_in    IS DISTINCT FROM OLD.check_in    THEN RAISE EXCEPTION 'check_in is immutable'; END IF;
    IF NEW.check_out   IS DISTINCT FROM OLD.check_out   THEN RAISE EXCEPTION 'check_out is immutable'; END IF;
  END IF;

  IF NOT (_is_service OR _is_super OR _is_owner) THEN
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN RAISE EXCEPTION 'payment_status can only be changed server-side'; END IF;
    IF NEW.payment_method IS DISTINCT FROM OLD.payment_method THEN RAISE EXCEPTION 'payment_method can only be changed server-side'; END IF;
    IF NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN RAISE EXCEPTION 'paid_at can only be changed server-side'; END IF;
    IF NEW.payment_expires_at IS DISTINCT FROM OLD.payment_expires_at THEN RAISE EXCEPTION 'payment_expires_at is immutable'; END IF;
    IF NEW.deposit_percent IS DISTINCT FROM OLD.deposit_percent THEN RAISE EXCEPTION 'deposit_percent is immutable'; END IF;
    IF NEW.refund_eligible IS DISTINCT FROM OLD.refund_eligible THEN RAISE EXCEPTION 'refund_eligible can only be changed server-side'; END IF;
    IF NEW.guest_name IS DISTINCT FROM OLD.guest_name THEN RAISE EXCEPTION 'guest_name is immutable after booking'; END IF;
    IF NEW.guest_phone IS DISTINCT FROM OLD.guest_phone THEN RAISE EXCEPTION 'guest_phone is immutable after booking'; END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF _is_service OR _is_super OR _is_owner THEN
      NULL;
    ELSIF _is_user THEN
      IF NEW.status::text = 'cancelled' THEN NULL;
      ELSE RAISE EXCEPTION 'Users may only cancel their bookings'; END IF;
    ELSIF auth.uid() IS NULL THEN NULL;
    ELSE RAISE EXCEPTION 'Not allowed to update this booking';
    END IF;
  END IF;

  IF NEW.status::text = 'cancelled' AND OLD.status::text <> 'cancelled' THEN
    NEW.cancelled_at := now();
    _days_until := (OLD.check_in - CURRENT_DATE);
    IF OLD.payment_status = 'paid' AND _days_until >= 3 THEN
      NEW.refund_eligible := true;
    ELSE
      NEW.refund_eligible := false;
    END IF;
  END IF;

  IF NEW.payment_status = 'paid' AND OLD.payment_status <> 'paid' THEN
    NEW.paid_at := COALESCE(NEW.paid_at, now());
  END IF;

  IF NEW.status::text = 'no_show' AND OLD.status::text <> 'no_show' THEN
    PERFORM set_config('app.bypass_profile_guard', 'on', true);
    UPDATE public.profiles
       SET no_show_count = no_show_count + 1,
           trust_score = GREATEST(0, trust_score - 20)
     WHERE id = OLD.user_id;
    PERFORM set_config('app.bypass_profile_guard', 'off', true);
  END IF;

  RETURN NEW;
END $function$;