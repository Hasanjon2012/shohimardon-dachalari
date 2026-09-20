
-- 1) Attach booking triggers (functions exist but aren't attached)
DROP TRIGGER IF EXISTS bookings_set_total_price_tr ON public.bookings;
CREATE TRIGGER bookings_set_total_price_tr
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_set_total_price();

DROP TRIGGER IF EXISTS bookings_guard_update_tr ON public.bookings;
CREATE TRIGGER bookings_guard_update_tr
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_guard_update();

-- Also add a WITH CHECK to the update policy so user_id can't be reassigned away
DROP POLICY IF EXISTS "Bookings: owner+user update" ON public.bookings;
CREATE POLICY "Bookings: owner+user update"
ON public.bookings
FOR UPDATE
USING (
  (user_id = auth.uid())
  OR public.is_hotel_owner(auth.uid(), hotel_id)
  OR public.has_role(auth.uid(), 'super_owner'::app_role)
)
WITH CHECK (
  (user_id = auth.uid())
  OR public.is_hotel_owner(auth.uid(), hotel_id)
  OR public.has_role(auth.uid(), 'super_owner'::app_role)
);

-- 2) Explicit INSERT policy on profiles
DROP POLICY IF EXISTS "Profiles: self insert" ON public.profiles;
CREATE POLICY "Profiles: self insert"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 3) Tighten storage upload: require an owned hotel exists
DROP POLICY IF EXISTS "Hotel images admin upload" ON storage.objects;
CREATE POLICY "Hotel images admin upload"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'hotel-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND (
    public.has_role(auth.uid(), 'super_owner'::app_role)
    OR (
      public.has_role(auth.uid(), 'hotel_admin'::app_role)
      AND EXISTS (SELECT 1 FROM public.hotels h WHERE h.owner_id = auth.uid())
    )
  )
);
