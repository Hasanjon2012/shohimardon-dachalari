
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS contact_clicks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manual_order integer;

CREATE INDEX IF NOT EXISTS idx_hotels_manual_order ON public.hotels (manual_order);
CREATE INDEX IF NOT EXISTS idx_hotels_contact_clicks ON public.hotels (contact_clicks DESC);

-- RPC: increment contact_clicks for a hotel. Callable by anyone (anon + authenticated).
CREATE OR REPLACE FUNCTION public.increment_hotel_contact(_hotel_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.hotels SET contact_clicks = contact_clicks + 1 WHERE id = _hotel_id;
$$;

REVOKE ALL ON FUNCTION public.increment_hotel_contact(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_hotel_contact(uuid) TO anon, authenticated;

-- RPC: only super_owner can set manual_order
CREATE OR REPLACE FUNCTION public.set_hotel_manual_order(_hotel_id uuid, _order integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_owner'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.hotels SET manual_order = _order WHERE id = _hotel_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_hotel_manual_order(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.set_hotel_manual_order(uuid, integer) TO authenticated;
