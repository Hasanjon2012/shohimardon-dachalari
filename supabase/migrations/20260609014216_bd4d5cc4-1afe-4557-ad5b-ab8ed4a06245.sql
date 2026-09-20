
-- Fix 1: hotels.phone leak — table-level grant overrides column REVOKE
REVOKE SELECT ON public.hotels FROM anon, authenticated;
GRANT SELECT (
  id, owner_id, name, slug, description, location, price_per_night,
  rating, amenities, cover_image, published, created_at, updated_at,
  lat, lng, deposit_percent, contact_clicks, manual_order
) ON public.hotels TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hotels TO authenticated;

-- Fix 2: storage delete policy — files are stored under {owner_id}/...,
-- so checking the first path segment against auth.uid() correctly scopes
-- deletion to the owner's own files. Remove the buggy hotel-id branch and
-- the over-permissive covers branch.
DROP POLICY IF EXISTS "Hotel images owner delete" ON storage.objects;
CREATE POLICY "Hotel images owner delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'hotel-images'
  AND (
    has_role(auth.uid(), 'super_owner'::app_role)
    OR (storage.foldername(name))[1] = (auth.uid())::text
  )
);
