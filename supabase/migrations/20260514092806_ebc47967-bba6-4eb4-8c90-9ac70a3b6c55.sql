CREATE OR REPLACE FUNCTION public.bookings_guard_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _is_super boolean := public.has_role(auth.uid(), 'super_owner'::app_role);
  _is_owner boolean := public.is_hotel_owner(auth.uid(), OLD.hotel_id);
  _is_user  boolean := (OLD.user_id = auth.uid());
  _days_until integer;
BEGIN
  IF NOT _is_super THEN
    IF NEW.user_id     IS DISTINCT FROM OLD.user_id     THEN RAISE EXCEPTION 'user_id is immutable'; END IF;
    IF NEW.hotel_id    IS DISTINCT FROM OLD.hotel_id    THEN RAISE EXCEPTION 'hotel_id is immutable'; END IF;
    IF NEW.room_id     IS DISTINCT FROM OLD.room_id     THEN RAISE EXCEPTION 'room_id is immutable'; END IF;
    IF NEW.total_price IS DISTINCT FROM OLD.total_price THEN RAISE EXCEPTION 'total_price is immutable'; END IF;
    IF NEW.deposit_amount IS DISTINCT FROM OLD.deposit_amount THEN RAISE EXCEPTION 'deposit_amount is immutable'; END IF;
    IF NEW.check_in    IS DISTINCT FROM OLD.check_in    THEN RAISE EXCEPTION 'check_in is immutable'; END IF;
    IF NEW.check_out   IS DISTINCT FROM OLD.check_out   THEN RAISE EXCEPTION 'check_out is immutable'; END IF;
  END IF;

  -- Only super_owner / hotel owner may touch payment fields. Regular users
  -- must go through the server-side payment confirmation function (which uses
  -- the service role and bypasses this trigger). This prevents users from
  -- self-marking a booking as paid.
  IF NOT (_is_super OR _is_owner) THEN
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      RAISE EXCEPTION 'payment_status can only be changed server-side';
    END IF;
    IF NEW.payment_method IS DISTINCT FROM OLD.payment_method THEN
      RAISE EXCEPTION 'payment_method can only be changed server-side';
    END IF;
    IF NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN
      RAISE EXCEPTION 'paid_at can only be changed server-side';
    END IF;
    IF NEW.payment_expires_at IS DISTINCT FROM OLD.payment_expires_at THEN
      RAISE EXCEPTION 'payment_expires_at is immutable';
    END IF;
    IF NEW.deposit_percent IS DISTINCT FROM OLD.deposit_percent THEN
      RAISE EXCEPTION 'deposit_percent is immutable';
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF _is_super OR _is_owner THEN
      NULL;
    ELSIF _is_user THEN
      -- Regular users may only cancel. Confirmation after payment is performed
      -- by the server-side function using the service role (which is _is_super=false
      -- but bypasses RLS and triggers run with auth.uid() = NULL → handled below).
      IF NEW.status::text = 'cancelled' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'Users may only cancel their bookings';
      END IF;
    ELSIF auth.uid() IS NULL THEN
      -- Service role context (no JWT). Allow.
      NULL;
    ELSE
      RAISE EXCEPTION 'Not allowed to update this booking';
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
    UPDATE public.profiles
       SET no_show_count = no_show_count + 1,
           trust_score = GREATEST(0, trust_score - 20)
     WHERE id = OLD.user_id;
  END IF;

  RETURN NEW;
END $function$;