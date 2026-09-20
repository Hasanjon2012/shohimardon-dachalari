-- 1. Booking field length/range constraints
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_guest_name_len,
  DROP CONSTRAINT IF EXISTS bookings_guest_phone_len,
  DROP CONSTRAINT IF EXISTS bookings_notes_len,
  DROP CONSTRAINT IF EXISTS bookings_guests_range;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_guest_name_len  CHECK (guest_name  IS NULL OR char_length(guest_name)  <= 200),
  ADD CONSTRAINT bookings_guest_phone_len CHECK (guest_phone IS NULL OR char_length(guest_phone) <= 30),
  ADD CONSTRAINT bookings_notes_len       CHECK (notes       IS NULL OR char_length(notes)       <= 1000),
  ADD CONSTRAINT bookings_guests_range    CHECK (guests BETWEEN 1 AND 50);

-- 2. Reviews: require a confirmed booking
DROP POLICY IF EXISTS "Reviews: user insert own" ON public.reviews;

CREATE POLICY "Reviews: user insert own"
ON public.reviews
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND NOT public.is_blocked(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.user_id = auth.uid()
      AND b.hotel_id = reviews.hotel_id
      AND b.room_id  = reviews.room_id
      AND b.status::text = 'confirmed'
  )
);

-- 3. Revoke EXECUTE on trigger-only SECURITY DEFINER functions from PUBLIC/anon/authenticated.
-- These functions are only invoked by triggers; no caller needs direct EXECUTE.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_guard_update()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_guard_update()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_set_total_price()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_prevent_overlap()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at()               FROM PUBLIC, anon, authenticated;

-- The helper functions has_role, is_hotel_owner, is_blocked, bookings_enabled
-- MUST remain executable by authenticated/anon because they are referenced inside
-- RLS policies and evaluated as the querying role.