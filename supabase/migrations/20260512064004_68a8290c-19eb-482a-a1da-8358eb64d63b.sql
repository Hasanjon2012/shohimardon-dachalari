
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_hotel_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bookings_set_total_price() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bookings_guard_update() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_blocked(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.profiles_guard_update() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_hotel_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked(uuid) TO authenticated;
