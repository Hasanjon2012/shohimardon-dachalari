DROP POLICY IF EXISTS "Reviews: user delete own" ON public.reviews;
DROP POLICY IF EXISTS "Reviews: hotel owner delete" ON public.reviews;

CREATE POLICY "Reviews: super_owner delete"
  ON public.reviews
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_owner'::app_role));