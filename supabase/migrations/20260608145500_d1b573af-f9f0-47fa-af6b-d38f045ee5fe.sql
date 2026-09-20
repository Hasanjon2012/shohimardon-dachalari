
-- 1) Hide hotels.phone from public Data API; access via hotel_phone() RPC only
REVOKE SELECT (phone) ON public.hotels FROM anon, authenticated;

-- 2) Fix storage delete policy: use storage object's name, not h.name
DROP POLICY IF EXISTS "Hotel images owner delete" ON storage.objects;
CREATE POLICY "Hotel images owner delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'hotel-images'
  AND (
    public.has_role(auth.uid(), 'super_owner'::public.app_role)
    OR (
      (storage.foldername(name))[1] = auth.uid()::text
      AND (
        EXISTS (
          SELECT 1 FROM public.hotels h
          WHERE h.owner_id = auth.uid()
            AND h.id::text = (storage.foldername(name))[2]
        )
        OR (
          (storage.foldername(name))[2] = 'covers'
          AND EXISTS (SELECT 1 FROM public.hotels h WHERE h.owner_id = auth.uid())
        )
      )
    )
  )
);
