CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

-- Private SECURITY DEFINER implementations live outside the exposed public API schema.
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION private.is_hotel_owner(_user_id uuid, _hotel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.hotels WHERE id = _hotel_id AND owner_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION private.is_blocked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT blocked FROM public.profiles WHERE id = _user_id), false);
$$;

CREATE OR REPLACE FUNCTION private.bookings_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT value FROM public.app_config WHERE key = 'bookings_enabled'), 'true') = 'true';
$$;

CREATE OR REPLACE FUNCTION private.hotel_phone(_hotel_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone FROM public.hotels WHERE id = _hotel_id AND published = true;
$$;

CREATE OR REPLACE FUNCTION private.track_hotel_phone_click(_hotel_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.hotels SET phone_clicks = phone_clicks + 1 WHERE id = _hotel_id;
$$;

CREATE OR REPLACE FUNCTION private.increment_hotel_contact(_hotel_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.hotels SET contact_clicks = contact_clicks + 1 WHERE id = _hotel_id;
$$;

CREATE OR REPLACE FUNCTION private.track_hotel_view(_hotel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _recent boolean := false;
BEGIN
  IF _uid IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.hotel_views
      WHERE hotel_id = _hotel_id
        AND user_id = _uid
        AND viewed_at > now() - interval '1 hour'
    ) INTO _recent;
    IF _recent THEN RETURN; END IF;
    INSERT INTO public.hotel_views(hotel_id, user_id) VALUES (_hotel_id, _uid);
  END IF;
  UPDATE public.hotels SET view_count = view_count + 1 WHERE id = _hotel_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.hotel_owner_bookings()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  hotel_id uuid,
  room_id uuid,
  check_in date,
  check_out date,
  guests integer,
  total_price numeric,
  deposit_amount numeric,
  deposit_percent integer,
  status public.booking_status,
  payment_status text,
  payment_method text,
  payment_expires_at timestamp with time zone,
  paid_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  refund_eligible boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  guest_name text,
  guest_phone text,
  hotel_name text,
  hotel_slug text,
  room_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id, b.user_id, b.hotel_id, b.room_id, b.check_in, b.check_out, b.guests,
    b.total_price, b.deposit_amount, b.deposit_percent, b.status,
    b.payment_status, b.payment_method, b.payment_expires_at, b.paid_at,
    b.cancelled_at, b.refund_eligible, b.created_at, b.updated_at,
    CASE WHEN b.payment_status = 'paid' THEN b.guest_name ELSE NULL END,
    CASE WHEN b.payment_status = 'paid' THEN b.guest_phone ELSE NULL END,
    h.name, h.slug, r.name
  FROM public.bookings b
  JOIN public.hotels h ON h.id = b.hotel_id
  LEFT JOIN public.rooms r ON r.id = b.room_id
  WHERE (
    h.owner_id = auth.uid()
    OR private.has_role(auth.uid(), 'super_owner'::public.app_role)
  )
  AND b.status <> 'no_show'
  ORDER BY b.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION private.mark_booking_no_show(_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _b record;
  _is_super boolean := private.has_role(auth.uid(), 'super_owner'::public.app_role);
BEGIN
  SELECT * INTO _b FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF NOT (_is_super OR private.is_hotel_owner(auth.uid(), _b.hotel_id)) THEN
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
$$;

CREATE OR REPLACE FUNCTION private.update_hotel_phone(_hotel_id uuid, _phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.hotels h
    WHERE h.id = _hotel_id
      AND (
        h.owner_id = auth.uid()
        OR private.has_role(auth.uid(), 'super_owner'::public.app_role)
      )
  ) THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.hotels SET phone = _phone WHERE id = _hotel_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.set_hotel_featured(_hotel_id uuid, _featured boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'super_owner'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.hotels SET featured = _featured WHERE id = _hotel_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.set_hotel_manual_order(_hotel_id uuid, _order integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'super_owner'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.hotels SET manual_order = _order WHERE id = _hotel_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.adjust_user_trust_score(_user_id uuid, _delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _new integer;
BEGIN
  IF NOT private.has_role(auth.uid(), 'super_owner'::public.app_role) THEN
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
$$;

CREATE OR REPLACE FUNCTION private.reset_all_trust_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'super_owner'::public.app_role) THEN
    RAISE EXCEPTION 'Only super owners can reset trust scores';
  END IF;
  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles SET trust_score = 100, no_show_count = 0 WHERE id IS NOT NULL;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);
END;
$$;

-- Public API functions remain callable, but are no longer SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.has_role(_user_id, _role);
$$;

CREATE OR REPLACE FUNCTION public.is_hotel_owner(_user_id uuid, _hotel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.is_hotel_owner(_user_id, _hotel_id);
$$;

CREATE OR REPLACE FUNCTION public.is_blocked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.is_blocked(_user_id);
$$;

CREATE OR REPLACE FUNCTION public.bookings_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.bookings_enabled();
$$;

CREATE OR REPLACE FUNCTION public.hotel_phone(_hotel_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.hotel_phone(_hotel_id);
$$;

CREATE OR REPLACE FUNCTION public.track_hotel_phone_click(_hotel_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.track_hotel_phone_click(_hotel_id);
$$;

CREATE OR REPLACE FUNCTION public.increment_hotel_contact(_hotel_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.increment_hotel_contact(_hotel_id);
$$;

CREATE OR REPLACE FUNCTION public.track_hotel_view(_hotel_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.track_hotel_view(_hotel_id);
$$;

CREATE OR REPLACE FUNCTION public.hotel_owner_bookings()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  hotel_id uuid,
  room_id uuid,
  check_in date,
  check_out date,
  guests integer,
  total_price numeric,
  deposit_amount numeric,
  deposit_percent integer,
  status public.booking_status,
  payment_status text,
  payment_method text,
  payment_expires_at timestamp with time zone,
  paid_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  refund_eligible boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  guest_name text,
  guest_phone text,
  hotel_name text,
  hotel_slug text,
  room_name text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM private.hotel_owner_bookings();
$$;

CREATE OR REPLACE FUNCTION public.mark_booking_no_show(_booking_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.mark_booking_no_show(_booking_id);
$$;

CREATE OR REPLACE FUNCTION public.update_hotel_phone(_hotel_id uuid, _phone text)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.update_hotel_phone(_hotel_id, _phone);
$$;

CREATE OR REPLACE FUNCTION public.set_hotel_featured(_hotel_id uuid, _featured boolean)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.set_hotel_featured(_hotel_id, _featured);
$$;

CREATE OR REPLACE FUNCTION public.set_hotel_manual_order(_hotel_id uuid, _order integer)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.set_hotel_manual_order(_hotel_id, _order);
$$;

CREATE OR REPLACE FUNCTION public.adjust_user_trust_score(_user_id uuid, _delta integer)
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.adjust_user_trust_score(_user_id, _delta);
$$;

CREATE OR REPLACE FUNCTION public.reset_all_trust_scores()
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.reset_all_trust_scores();
$$;

-- Lock function execution down to the app roles that need each function.
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION private.is_hotel_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_hotel_owner(uuid, uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_hotel_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_hotel_owner(uuid, uuid) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION private.is_blocked(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_blocked(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_blocked(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_blocked(uuid) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION private.bookings_enabled() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.bookings_enabled() TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.bookings_enabled() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bookings_enabled() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION private.hotel_phone(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.hotel_phone(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.hotel_phone(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hotel_phone(uuid) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION private.track_hotel_phone_click(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.track_hotel_phone_click(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.track_hotel_phone_click(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_hotel_phone_click(uuid) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION private.increment_hotel_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.increment_hotel_contact(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.increment_hotel_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_hotel_contact(uuid) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION private.track_hotel_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.track_hotel_view(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.track_hotel_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_hotel_view(uuid) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION private.hotel_owner_bookings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.hotel_owner_bookings() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.hotel_owner_bookings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hotel_owner_bookings() TO authenticated, service_role;

REVOKE ALL ON FUNCTION private.mark_booking_no_show(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.mark_booking_no_show(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.mark_booking_no_show(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_booking_no_show(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION private.update_hotel_phone(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.update_hotel_phone(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_hotel_phone(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_hotel_phone(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION private.set_hotel_featured(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.set_hotel_featured(uuid, boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_hotel_featured(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_hotel_featured(uuid, boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION private.set_hotel_manual_order(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.set_hotel_manual_order(uuid, integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_hotel_manual_order(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_hotel_manual_order(uuid, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION private.adjust_user_trust_score(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.adjust_user_trust_score(uuid, integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.adjust_user_trust_score(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_user_trust_score(uuid, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION private.reset_all_trust_scores() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.reset_all_trust_scores() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.reset_all_trust_scores() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_all_trust_scores() TO authenticated, service_role;