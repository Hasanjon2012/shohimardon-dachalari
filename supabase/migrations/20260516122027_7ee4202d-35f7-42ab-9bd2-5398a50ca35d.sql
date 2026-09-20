-- 1. Restrict booking DELETE to super_owner only
DROP POLICY IF EXISTS "Bookings: owner+user delete" ON public.bookings;
-- "Bookings: super delete" already covers super_owner deletes.

-- 2. Prevent admin_requests spam — at most one pending request per user
DROP POLICY IF EXISTS "AdminReq: user insert own" ON public.admin_requests;

CREATE POLICY "AdminReq: user insert own"
ON public.admin_requests
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_requests ar
    WHERE ar.user_id = auth.uid()
      AND ar.status = 'pending'
  )
);