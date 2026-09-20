
-- Allow anonymous access to hotel_phone for published hotels
CREATE OR REPLACE FUNCTION public.hotel_phone(_hotel_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT phone FROM public.hotels
  WHERE id = _hotel_id
    AND (
      published = true
      OR owner_id = auth.uid()
      OR public.has_role(auth.uid(), 'super_owner'::app_role)
    )
$function$;

GRANT EXECUTE ON FUNCTION public.hotel_phone(uuid) TO anon, authenticated;

-- Allow anonymous phone-click and contact tracking
GRANT EXECUTE ON FUNCTION public.track_hotel_phone_click(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_hotel_contact(uuid) TO anon, authenticated;
