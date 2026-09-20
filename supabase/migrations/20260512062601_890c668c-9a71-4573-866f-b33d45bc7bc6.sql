
DROP POLICY IF EXISTS "Rooms: public read" ON public.rooms;
CREATE POLICY "Rooms: public read"
  ON public.rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hotels h
      WHERE h.id = rooms.hotel_id
        AND (
          h.published = true
          OR h.owner_id = auth.uid()
          OR public.has_role(auth.uid(), 'super_owner'::app_role)
        )
    )
  );

DROP POLICY IF EXISTS "Images: public read" ON public.hotel_images;
CREATE POLICY "Images: public read"
  ON public.hotel_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hotels h
      WHERE h.id = hotel_images.hotel_id
        AND (
          h.published = true
          OR h.owner_id = auth.uid()
          OR public.has_role(auth.uid(), 'super_owner'::app_role)
        )
    )
  );
