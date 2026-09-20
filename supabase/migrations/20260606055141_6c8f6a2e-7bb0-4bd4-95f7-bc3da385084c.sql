
-- 1. Fix storage upload policy: allow hotel_admin to upload BEFORE creating any hotel
DROP POLICY IF EXISTS "Hotel images admin upload" ON storage.objects;
CREATE POLICY "Hotel images admin upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'hotel-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND lower(name) ~ '\.(jpg|jpeg|png|webp|gif)$'
  AND (
    has_role(auth.uid(), 'super_owner'::app_role)
    OR has_role(auth.uid(), 'hotel_admin'::app_role)
  )
);

-- 2. Fix hotels UPDATE check: allow owner to toggle 'published' on their own hotel
DROP POLICY IF EXISTS "Hotels: owner update" ON public.hotels;
CREATE POLICY "Hotels: owner update" ON public.hotels
FOR UPDATE
USING ((auth.uid() = owner_id) OR has_role(auth.uid(), 'super_owner'::app_role))
WITH CHECK (
  has_role(auth.uid(), 'super_owner'::app_role)
  OR (
    (auth.uid() = owner_id)
    AND (owner_id = (SELECT h.owner_id FROM hotels h WHERE h.id = hotels.id))
    AND (NOT (rating IS DISTINCT FROM (SELECT h.rating FROM hotels h WHERE h.id = hotels.id)))
    AND (NOT (deposit_percent IS DISTINCT FROM (SELECT h.deposit_percent FROM hotels h WHERE h.id = hotels.id)))
    AND (NOT (slug IS DISTINCT FROM (SELECT h.slug FROM hotels h WHERE h.id = hotels.id)))
  )
);
