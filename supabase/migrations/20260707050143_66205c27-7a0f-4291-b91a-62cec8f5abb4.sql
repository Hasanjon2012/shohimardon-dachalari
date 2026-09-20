CREATE POLICY "Reviews: hotel owner delete" ON public.reviews
FOR DELETE TO authenticated
USING (public.is_hotel_owner(auth.uid(), hotel_id) OR public.has_role(auth.uid(), 'super_owner'::app_role));