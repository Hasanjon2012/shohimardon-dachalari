CREATE OR REPLACE FUNCTION public.hotel_phone(_hotel_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT phone FROM public.hotels
  WHERE id = _hotel_id
    AND auth.uid() IS NOT NULL
$function$;