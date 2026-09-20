CREATE TABLE public.room_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.room_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_videos TO authenticated;
GRANT ALL ON public.room_videos TO service_role;

ALTER TABLE public.room_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view room videos"
ON public.room_videos FOR SELECT
USING (true);

CREATE POLICY "Hotel owners can insert room videos"
ON public.room_videos FOR INSERT TO authenticated
WITH CHECK (public.is_hotel_owner(auth.uid(), hotel_id) OR public.has_role(auth.uid(), 'super_owner'::app_role));

CREATE POLICY "Hotel owners can update room videos"
ON public.room_videos FOR UPDATE TO authenticated
USING (public.is_hotel_owner(auth.uid(), hotel_id) OR public.has_role(auth.uid(), 'super_owner'::app_role));

CREATE POLICY "Hotel owners can delete room videos"
ON public.room_videos FOR DELETE TO authenticated
USING (public.is_hotel_owner(auth.uid(), hotel_id) OR public.has_role(auth.uid(), 'super_owner'::app_role));

CREATE INDEX idx_room_videos_room_id ON public.room_videos(room_id);