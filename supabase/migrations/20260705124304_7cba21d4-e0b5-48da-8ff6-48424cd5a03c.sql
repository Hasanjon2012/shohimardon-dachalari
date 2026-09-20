
-- 1) Require authentication for feedback INSERTs (blocks anon spam/abuse)
DROP POLICY IF EXISTS "Feedback: anyone insert" ON public.feedback;
CREATE POLICY "Feedback: authenticated insert"
  ON public.feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    length(btrim(email)) BETWEEN 3 AND 255
    AND length(btrim(message)) BETWEEN 1 AND 2000
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );

-- 2) Storage: hotel-images bucket — remove broad public SELECT that enables
--    listing all objects. Public serving via /storage/v1/object/public/*
--    does not require an RLS SELECT policy.
DROP POLICY IF EXISTS "Hotel images public read" ON storage.objects;

-- 3) SECURITY DEFINER hardening — revoke EXECUTE from anon/authenticated on
--    trigger-only functions (they run implicitly, never called by clients)
--    and on admin-only wrappers (which self-check role, but should not be
--    directly executable by anon).
REVOKE EXECUTE ON FUNCTION public.handle_new_user()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_set_total_price()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_guard_update()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_prevent_overlap()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.hotels_guard_update()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_guard_update()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reviews_guard_update()        FROM PUBLIC, anon, authenticated;

-- Admin-only wrappers: keep authenticated (function self-checks role) but
-- drop anon exposure.
REVOKE EXECUTE ON FUNCTION public.set_hotel_featured(uuid, boolean)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_hotel_manual_order(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reset_all_trust_scores()           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.adjust_user_trust_score(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_booking_no_show(uuid)         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_hotel_phone(uuid, text)     FROM PUBLIC, anon;
