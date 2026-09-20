-- 1. anon_metric_inflation: restrict metric-incrementing RPCs to authenticated only
REVOKE EXECUTE ON FUNCTION public.increment_hotel_contact(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.track_hotel_phone_click(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_hotel_contact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_hotel_phone_click(uuid) TO authenticated;

-- 2. sitemap_xml_injection: enforce URL-safe slug format
ALTER TABLE public.hotels DROP CONSTRAINT IF EXISTS hotels_slug_format_chk;
ALTER TABLE public.hotels ADD CONSTRAINT hotels_slug_format_chk CHECK (slug ~ '^[a-z0-9-]+$');

-- 3. hotels_phone_column_select_policy: defensively ensure phone is never selectable by anon/authenticated
REVOKE SELECT (phone) ON public.hotels FROM anon, authenticated, PUBLIC;