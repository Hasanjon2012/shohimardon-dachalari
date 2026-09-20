
-- 1) Bookings INSERT: require published hotel and matching available room (if room provided)
DROP POLICY IF EXISTS "Bookings: user insert" ON public.bookings;
CREATE POLICY "Bookings: user insert" ON public.bookings
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND NOT public.is_blocked(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.hotels h
    WHERE h.id = bookings.hotel_id AND h.published = true
  )
  AND (
    bookings.room_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = bookings.room_id
        AND r.hotel_id = bookings.hotel_id
        AND r.available = true
    )
  )
  AND check_out > check_in
);

-- 2) Profiles: remove self-insert. Profile rows are created by handle_new_user trigger on signup.
DROP POLICY IF EXISTS "Profiles: self insert" ON public.profiles;
