-- 1) Restrict hotels.phone to authenticated users only (column-level)
REVOKE SELECT (phone) ON public.hotels FROM anon;
GRANT SELECT (phone) ON public.hotels TO authenticated;

-- 2) Profiles insert: enforce blocked=false on self-insert
DROP POLICY IF EXISTS "Profiles: self insert" ON public.profiles;
CREATE POLICY "Profiles: self insert"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id AND blocked = false);

-- 3) Bookings update column hardening is enforced by bookings_guard_update trigger.
-- Re-affirm trigger exists.
DROP TRIGGER IF EXISTS bookings_guard_update_trg ON public.bookings;
CREATE TRIGGER bookings_guard_update_trg
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_guard_update();