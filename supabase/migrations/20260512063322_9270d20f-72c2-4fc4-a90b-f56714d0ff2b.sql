
-- Helper: is the user blocked?
CREATE OR REPLACE FUNCTION public.is_blocked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT blocked FROM public.profiles WHERE id = _user_id), false);
$$;
REVOKE EXECUTE ON FUNCTION public.is_blocked(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_blocked(uuid) TO authenticated;

-- Trigger: prevent users from flipping their own blocked flag
CREATE OR REPLACE FUNCTION public.profiles_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.blocked IS DISTINCT FROM OLD.blocked
     AND NOT public.has_role(auth.uid(), 'super_owner'::app_role) THEN
    RAISE EXCEPTION 'Not allowed to change blocked status';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.profiles_guard_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_guard_update_trg ON public.profiles;
CREATE TRIGGER profiles_guard_update_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_update();

-- Tighten INSERT policies so blocked users cannot create rows
DROP POLICY IF EXISTS "Bookings: user insert" ON public.bookings;
CREATE POLICY "Bookings: user insert"
  ON public.bookings FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND NOT public.is_blocked(auth.uid())
  );

DROP POLICY IF EXISTS "Hotels: owner insert" ON public.hotels;
CREATE POLICY "Hotels: owner insert"
  ON public.hotels FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND NOT public.is_blocked(auth.uid())
    AND (
      public.has_role(auth.uid(), 'hotel_admin'::app_role)
      OR public.has_role(auth.uid(), 'super_owner'::app_role)
    )
  );
