
-- Revoke EXECUTE from PUBLIC on all SECURITY DEFINER functions in public schema,
-- then grant back only where the app needs it.

-- Trigger functions: only the trigger system needs to run these. Revoke all.
REVOKE ALL ON FUNCTION public.bookings_set_total_price() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bookings_guard_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bookings_prevent_overlap() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hotels_guard_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profiles_guard_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reviews_guard_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Internal helpers used inside policies/functions only. Policies evaluate as the
-- calling role, so keep EXECUTE for the roles that actually run queries.
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_hotel_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_hotel_owner(uuid, uuid) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_blocked(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_blocked(uuid) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.bookings_enabled() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bookings_enabled() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.hotel_phone(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hotel_phone(uuid) TO anon, authenticated, service_role;

-- Tracking RPCs: called from client for both anon and signed-in visitors.
REVOKE ALL ON FUNCTION public.track_hotel_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_hotel_view(uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.track_hotel_phone_click(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_hotel_phone_click(uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.increment_hotel_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_hotel_contact(uuid) TO anon, authenticated;

-- Authenticated-only RPCs. Internal role checks inside each function still apply.
REVOKE ALL ON FUNCTION public.hotel_owner_bookings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hotel_owner_bookings() TO authenticated;

REVOKE ALL ON FUNCTION public.mark_booking_no_show(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_booking_no_show(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.update_hotel_phone(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_hotel_phone(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.set_hotel_featured(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_hotel_featured(uuid, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.set_hotel_manual_order(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_hotel_manual_order(uuid, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.adjust_user_trust_score(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_user_trust_score(uuid, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.reset_all_trust_scores() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_all_trust_scores() TO authenticated;
