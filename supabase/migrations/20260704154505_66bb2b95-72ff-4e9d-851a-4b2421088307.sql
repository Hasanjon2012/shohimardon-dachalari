-- Restore booking/ownership gate on hotel_phone
CREATE OR REPLACE FUNCTION public.hotel_phone(_hotel_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT phone FROM public.hotels h
  WHERE h.id = _hotel_id
    AND (
      h.owner_id = auth.uid()
      OR public.has_role(auth.uid(), 'super_owner'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.hotel_id = h.id
          AND b.user_id = auth.uid()
          AND b.payment_status = 'paid'
      )
    )
$function$;

REVOKE EXECUTE ON FUNCTION public.hotel_phone(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.hotel_phone(uuid) TO authenticated;

-- Revoke anonymous access to metric-incrementing RPCs to prevent inflation
REVOKE EXECUTE ON FUNCTION public.increment_hotel_contact(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.track_hotel_phone_click(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_hotel_contact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_hotel_phone_click(uuid) TO authenticated;
