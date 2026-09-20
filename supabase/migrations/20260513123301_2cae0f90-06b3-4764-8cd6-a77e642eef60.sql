
DROP POLICY IF EXISTS "Hotel images admin update" ON storage.objects;

CREATE POLICY "Hotel images admin update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'hotel-images'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'super_owner'::app_role)
  )
  AND (
    has_role(auth.uid(), 'hotel_admin'::app_role)
    OR has_role(auth.uid(), 'super_owner'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'hotel-images'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'super_owner'::app_role)
  )
  AND (
    has_role(auth.uid(), 'hotel_admin'::app_role)
    OR has_role(auth.uid(), 'super_owner'::app_role)
  )
  AND name ~* '\.(jpg|jpeg|png|webp|gif)$'
);
