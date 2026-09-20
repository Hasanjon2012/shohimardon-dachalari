
-- 1) Restrict admin_requests realtime: drop from publication so non-super_owner users can't subscribe
ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_requests;

-- 2) Lock down hotels.phone at the column level so only the owner/super_owner or guests with a booking can read it via RPC
REVOKE SELECT ON public.hotels FROM anon, authenticated;

GRANT SELECT (
  id, owner_id, name, slug, description, location, price_per_night, rating,
  cover_image, published, created_at, updated_at, lat, lng, deposit_percent, amenities
) ON public.hotels TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.hotels TO authenticated;
GRANT ALL ON public.hotels TO service_role;

-- 3) Extend hotel_phone() so confirmed/paid guests can also retrieve it
CREATE OR REPLACE FUNCTION public.hotel_phone(_hotel_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT phone FROM public.hotels
  WHERE id = _hotel_id
    AND (
      owner_id = auth.uid()
      OR public.has_role(auth.uid(), 'super_owner'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.hotel_id = _hotel_id
          AND b.user_id = auth.uid()
          AND b.status IN ('confirmed'::booking_status, 'pending_payment'::booking_status, 'pending'::booking_status, 'no_show'::booking_status)
      )
    )
$function$;
