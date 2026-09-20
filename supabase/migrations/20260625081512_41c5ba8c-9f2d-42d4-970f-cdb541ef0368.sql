
-- Tighten storage DELETE on hotel-images: require hotel_admin or super_owner
DROP POLICY IF EXISTS "Hotel images owner delete" ON storage.objects;
CREATE POLICY "Hotel images owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'hotel-images'
  AND (
    public.has_role(auth.uid(), 'super_owner'::public.app_role)
    OR (
      public.has_role(auth.uid(), 'hotel_admin'::public.app_role)
      AND (storage.foldername(name))[1] = (auth.uid())::text
    )
  )
);

-- Re-assert column-level revoke on hotels.phone; access only via public.hotel_phone() RPC
REVOKE SELECT (phone) ON public.hotels FROM anon, authenticated, PUBLIC;
REVOKE INSERT (phone), UPDATE (phone) ON public.hotels FROM anon;
-- Hotel admins/owners need to write phone on their hotels; keep insert/update for authenticated
GRANT INSERT (phone), UPDATE (phone) ON public.hotels TO authenticated;
