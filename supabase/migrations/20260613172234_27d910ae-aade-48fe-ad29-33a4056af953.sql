
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phone_clicks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.hotel_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hotel_views_lookup ON public.hotel_views(hotel_id, user_id, viewed_at DESC);

GRANT SELECT, INSERT ON public.hotel_views TO authenticated;
GRANT ALL ON public.hotel_views TO service_role;
ALTER TABLE public.hotel_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own view" ON public.hotel_views
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "users read own views" ON public.hotel_views
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Track view: dedup per user within 1 hour. Anon viewers always count once per call (client dedupes via localStorage).
CREATE OR REPLACE FUNCTION public.track_hotel_view(_hotel_id uuid)
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

CREATE OR REPLACE FUNCTION public.track_hotel_phone_click(_hotel_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.hotels SET phone_clicks = phone_clicks + 1 WHERE id = _hotel_id;
$$;

CREATE OR REPLACE FUNCTION public.set_hotel_featured(_hotel_id uuid, _featured boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_owner'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.hotels SET featured = _featured WHERE id = _hotel_id;
END;
$$;
