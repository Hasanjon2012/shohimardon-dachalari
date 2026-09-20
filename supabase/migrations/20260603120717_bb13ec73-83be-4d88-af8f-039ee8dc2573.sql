DROP POLICY IF EXISTS "Reviews: user insert own" ON public.reviews;

CREATE POLICY "Reviews: user insert own"
ON public.reviews
FOR INSERT
WITH CHECK (
  (user_id = auth.uid())
  AND (NOT is_blocked(auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.hotels h ON h.id = r.hotel_id
    WHERE r.id = reviews.room_id
      AND r.hotel_id = reviews.hotel_id
      AND h.published = true
  )
);