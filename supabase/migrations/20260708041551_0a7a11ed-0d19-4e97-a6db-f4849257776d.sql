REVOKE SELECT ON public.reviews FROM anon;
GRANT SELECT (id, hotel_id, room_id, rating, comment, guest_name, created_at, updated_at) ON public.reviews TO anon;