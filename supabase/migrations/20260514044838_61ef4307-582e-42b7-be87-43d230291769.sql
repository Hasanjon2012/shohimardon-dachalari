-- 1) Add new enum values
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'no_show';

-- 2) Hotels: deposit_percent (20-30)
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS deposit_percent integer NOT NULL DEFAULT 25
    CHECK (deposit_percent BETWEEN 10 AND 50);

-- 3) Profiles: trust score & no-show count
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS no_show_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_score integer NOT NULL DEFAULT 100;

-- 4) Bookings: payment columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS deposit_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_percent integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_eligible boolean NOT NULL DEFAULT false;

-- 5) Update set_total_price trigger to also set deposit + expiry, and use pending_payment
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
  -- Force fresh bookings to start as pending_payment regardless of client input
  NEW.status := 'pending_payment'::booking_status;
  NEW.payment_status := 'unpaid';
  NEW.payment_expires_at := now() + interval '30 minutes';
  NEW.paid_at := NULL;
  NEW.cancelled_at := NULL;
  RETURN NEW;
END $function$;

-- 6) Overlap prevention: ignore expired pending_payment as well
CREATE OR REPLACE FUNCTION public.bookings_prevent_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _ranges text;
BEGIN
  IF NEW.status::text IN ('cancelled', 'no_show') THEN
    RETURN NEW;
  END IF;

  IF NEW.room_id IS NOT NULL THEN
    SELECT string_agg(check_in::text || ' → ' || check_out::text, ', ')
      INTO _ranges
    FROM public.bookings
    WHERE hotel_id = NEW.hotel_id
      AND room_id = NEW.room_id
      AND status::text NOT IN ('cancelled', 'no_show')
      AND NOT (status::text = 'pending_payment' AND payment_expires_at < now())
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND check_in < NEW.check_out
      AND check_out > NEW.check_in;
  ELSE
    SELECT string_agg(check_in::text || ' → ' || check_out::text, ', ')
      INTO _ranges
    FROM public.bookings
    WHERE hotel_id = NEW.hotel_id
      AND room_id IS NULL
      AND status::text NOT IN ('cancelled', 'no_show')
      AND NOT (status::text = 'pending_payment' AND payment_expires_at < now())
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND check_in < NEW.check_out
      AND check_out > NEW.check_in;
  END IF;

  IF _ranges IS NOT NULL THEN
    RAISE EXCEPTION 'Bu xona tanlangan kunlarda allaqachon band. Band kunlar: %', _ranges
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $function$;

-- 7) Update guard trigger: allow user to set payment fields & cancel; allow no_show by owner/super
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
  -- Immutable fields for everyone except super_owner
  IF NOT _is_super THEN
    IF NEW.user_id     IS DISTINCT FROM OLD.user_id     THEN RAISE EXCEPTION 'user_id is immutable'; END IF;
    IF NEW.hotel_id    IS DISTINCT FROM OLD.hotel_id    THEN RAISE EXCEPTION 'hotel_id is immutable'; END IF;
    IF NEW.room_id     IS DISTINCT FROM OLD.room_id     THEN RAISE EXCEPTION 'room_id is immutable'; END IF;
    IF NEW.total_price IS DISTINCT FROM OLD.total_price THEN RAISE EXCEPTION 'total_price is immutable'; END IF;
    IF NEW.deposit_amount IS DISTINCT FROM OLD.deposit_amount THEN RAISE EXCEPTION 'deposit_amount is immutable'; END IF;
    IF NEW.check_in    IS DISTINCT FROM OLD.check_in    THEN RAISE EXCEPTION 'check_in is immutable'; END IF;
    IF NEW.check_out   IS DISTINCT FROM OLD.check_out   THEN RAISE EXCEPTION 'check_out is immutable'; END IF;
  END IF;

  -- Status transitions
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF _is_super OR _is_owner THEN
      NULL; -- any transition allowed
    ELSIF _is_user THEN
      -- Regular user can: cancel, OR pay (pending_payment -> confirmed via paid)
      IF NEW.status::text = 'cancelled' THEN
        NULL;
      ELSIF OLD.status::text = 'pending_payment'
            AND NEW.status::text = 'confirmed'
            AND NEW.payment_status = 'paid' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'Users may only cancel their bookings';
      END IF;
    ELSE
      RAISE EXCEPTION 'Not allowed to update this booking';
    END IF;
  END IF;

  -- On cancellation: compute refund eligibility & timestamp
  IF NEW.status::text = 'cancelled' AND OLD.status::text <> 'cancelled' THEN
    NEW.cancelled_at := now();
    _days_until := (OLD.check_in - CURRENT_DATE);
    IF OLD.payment_status = 'paid' AND _days_until >= 3 THEN
      NEW.refund_eligible := true;
    ELSE
      NEW.refund_eligible := false;
    END IF;
  END IF;

  -- On marking paid
  IF NEW.payment_status = 'paid' AND OLD.payment_status <> 'paid' THEN
    NEW.paid_at := COALESCE(NEW.paid_at, now());
  END IF;

  -- On no_show: track count + decrease trust score
  IF NEW.status::text = 'no_show' AND OLD.status::text <> 'no_show' THEN
    UPDATE public.profiles
       SET no_show_count = no_show_count + 1,
           trust_score = GREATEST(0, trust_score - 20)
     WHERE id = OLD.user_id;
  END IF;

  RETURN NEW;
END $function$;