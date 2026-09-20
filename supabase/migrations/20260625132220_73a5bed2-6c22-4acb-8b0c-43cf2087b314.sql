
-- Mark booking as no-show: deduct trust score, increment no_show_count, then delete booking
CREATE OR REPLACE FUNCTION public.mark_booking_no_show(_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    UPDATE public.profiles
       SET no_show_count = COALESCE(no_show_count, 0) + 1,
           trust_score   = GREATEST(0, COALESCE(trust_score, 100) - 20)
     WHERE id = _b.user_id;
  END IF;
  DELETE FROM public.bookings WHERE id = _booking_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_booking_no_show(uuid) TO authenticated;

-- Owner-only: adjust trust score by delta (positive or negative)
CREATE OR REPLACE FUNCTION public.adjust_user_trust_score(_user_id uuid, _delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _new integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_owner'::app_role) THEN
    RAISE EXCEPTION 'Only super owners can adjust trust score';
  END IF;
  UPDATE public.profiles
     SET trust_score = GREATEST(0, LEAST(100, COALESCE(trust_score, 100) + _delta))
   WHERE id = _user_id
  RETURNING trust_score INTO _new;
  RETURN _new;
END;
$$;
GRANT EXECUTE ON FUNCTION public.adjust_user_trust_score(uuid, integer) TO authenticated;

-- Owner-only: reset all trust scores to 100 and clear no_show_count
CREATE OR REPLACE FUNCTION public.reset_all_trust_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_owner'::app_role) THEN
    RAISE EXCEPTION 'Only super owners can reset trust scores';
  END IF;
  UPDATE public.profiles SET trust_score = 100, no_show_count = 0;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reset_all_trust_scores() TO authenticated;
