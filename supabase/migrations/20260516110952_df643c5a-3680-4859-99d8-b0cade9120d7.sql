
-- 1. Booking toggle config
INSERT INTO public.app_config(key, value) VALUES ('bookings_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Public read for this specific key only
DROP POLICY IF EXISTS "Config: public read bookings_enabled" ON public.app_config;
CREATE POLICY "Config: public read bookings_enabled"
ON public.app_config FOR SELECT
USING (key = 'bookings_enabled');

CREATE OR REPLACE FUNCTION public.bookings_enabled()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT value FROM public.app_config WHERE key = 'bookings_enabled'), 'true') = 'true';
$$;

-- 2. Tighten bookings insert policy
DROP POLICY IF EXISTS "Bookings: user insert" ON public.bookings;
CREATE POLICY "Bookings: user insert"
ON public.bookings FOR INSERT
WITH CHECK (
  public.bookings_enabled()
  AND (user_id = auth.uid())
  AND (NOT is_blocked(auth.uid()))
  AND (EXISTS (SELECT 1 FROM public.hotels h
               WHERE h.id = bookings.hotel_id AND h.published = true AND NOT is_blocked(h.owner_id)))
  AND ((room_id IS NULL) OR (EXISTS (SELECT 1 FROM public.rooms r
                                     WHERE r.id = bookings.room_id AND r.hotel_id = bookings.hotel_id AND r.available = true)))
  AND (check_out > check_in)
);

-- 3. Admin requests table
CREATE TABLE IF NOT EXISTS public.admin_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "AdminReq: self or super read" ON public.admin_requests;
CREATE POLICY "AdminReq: self or super read"
ON public.admin_requests FOR SELECT
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_owner'::app_role));

DROP POLICY IF EXISTS "AdminReq: super write" ON public.admin_requests;
CREATE POLICY "AdminReq: super write"
ON public.admin_requests FOR ALL
USING (public.has_role(auth.uid(), 'super_owner'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_owner'::app_role));

-- 4. Update handle_new_user: hotel_admin signup creates pending request, role stays 'user'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _requested TEXT;
  _role app_role;
  _super_email TEXT;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );

  SELECT value INTO _super_email FROM public.app_config WHERE key = 'super_owner_email';
  _requested := NEW.raw_user_meta_data->>'role';

  IF _super_email IS NOT NULL AND _super_email <> '' AND lower(NEW.email) = lower(_super_email) THEN
    _role := 'super_owner';
  ELSE
    -- Always default to 'user'. Hotel-admin requests need owner approval.
    _role := 'user';
    IF _requested = 'hotel_admin' THEN
      INSERT INTO public.admin_requests (user_id, status)
      VALUES (NEW.id, 'pending')
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END $function$;
