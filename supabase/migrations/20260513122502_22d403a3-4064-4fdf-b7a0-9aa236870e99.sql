
-- 1) Tighten bookings INSERT policy: also reject if the hotel owner is blocked
DROP POLICY IF EXISTS "Bookings: user insert" ON public.bookings;

CREATE POLICY "Bookings: user insert"
ON public.bookings
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND NOT public.is_blocked(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.hotels h
    WHERE h.id = bookings.hotel_id
      AND h.published = true
      AND NOT public.is_blocked(h.owner_id)
  )
  AND (
    room_id IS NULL OR EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = bookings.room_id
        AND r.hotel_id = bookings.hotel_id
        AND r.available = true
    )
  )
  AND check_out > check_in
);

-- 2) Enforce image extension on storage.objects UPDATE for hotel-images bucket
DROP POLICY IF EXISTS "Hotel images owner update" ON storage.objects;
DROP POLICY IF EXISTS "Hotel images admin update" ON storage.objects;

CREATE POLICY "Hotel images admin update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'hotel-images'
  AND (
    public.has_role(auth.uid(), 'super_owner'::app_role)
    OR public.has_role(auth.uid(), 'hotel_admin'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'hotel-images'
  AND lower(name) ~ '\.(jpg|jpeg|png|webp|gif)$'
  AND (
    public.has_role(auth.uid(), 'super_owner'::app_role)
    OR public.has_role(auth.uid(), 'hotel_admin'::app_role)
  )
);
