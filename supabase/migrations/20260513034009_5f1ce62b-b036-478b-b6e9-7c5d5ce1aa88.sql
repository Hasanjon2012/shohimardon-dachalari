DROP POLICY IF EXISTS "Bookings: super delete" ON public.bookings;

CREATE POLICY "Bookings: super delete"
ON public.bookings
FOR DELETE
USING (has_role(auth.uid(), 'super_owner'::app_role));