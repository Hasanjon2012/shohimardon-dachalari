-- Restrict storage uploads to image file extensions
DROP POLICY IF EXISTS "Hotel images admin upload" ON storage.objects;

CREATE POLICY "Hotel images admin upload"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'hotel-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND lower(name) ~ '\.(jpg|jpeg|png|webp|gif)$'
  AND (
    has_role(auth.uid(), 'super_owner'::app_role)
    OR (
      has_role(auth.uid(), 'hotel_admin'::app_role)
      AND EXISTS (SELECT 1 FROM public.hotels h WHERE h.owner_id = auth.uid())
    )
  )
);