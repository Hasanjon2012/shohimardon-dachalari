REVOKE SELECT (phone) ON public.hotels FROM anon, authenticated;

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
        SELECT 1 FROM public.bookings
        WHERE hotel_id = _hotel_id
          AND user_id = auth.uid()
          AND status::text IN ('confirmed','pending_payment','pending','no_show')
      )
    )
$function$;