
-- 1. admin_requests: explicit INSERT policy
CREATE POLICY "AdminReq: user insert own"
ON public.admin_requests FOR INSERT
WITH CHECK (user_id = auth.uid());

-- 2. Storage: tighten hotel-images delete to require active hotel ownership
DROP POLICY IF EXISTS "Hotel images owner delete" ON storage.objects;
CREATE POLICY "Hotel images owner delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'hotel-images'
  AND (
    has_role(auth.uid(), 'super_owner'::app_role)
    OR (
      (storage.foldername(name))[1] = (auth.uid())::text
      AND EXISTS (
        SELECT 1 FROM public.hotels h
        WHERE h.owner_id = auth.uid()
      )
    )
  )
);

-- 3. Revoke EXECUTE on SECURITY DEFINER functions from anon/public
REVOKE EXECUTE ON FUNCTION public.is_hotel_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_blocked(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bookings_enabled() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_guard_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_guard_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_set_total_price() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_prevent_overlap() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_hotel_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bookings_enabled() TO authenticated, anon;
