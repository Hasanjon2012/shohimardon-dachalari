
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric;

CREATE TABLE IF NOT EXISTS public.room_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.room_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RoomImages: public read"
ON public.room_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.hotels h
    WHERE h.id = room_images.hotel_id
      AND (h.published = true OR h.owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_owner'::app_role))
  )
);

CREATE POLICY "RoomImages: owner write"
ON public.room_images FOR ALL
USING (public.is_hotel_owner(auth.uid(), hotel_id) OR public.has_role(auth.uid(), 'super_owner'::app_role))
WITH CHECK (public.is_hotel_owner(auth.uid(), hotel_id) OR public.has_role(auth.uid(), 'super_owner'::app_role));

CREATE INDEX IF NOT EXISTS room_images_room_idx ON public.room_images(room_id);
