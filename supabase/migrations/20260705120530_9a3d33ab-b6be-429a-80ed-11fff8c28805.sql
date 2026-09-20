CREATE OR REPLACE FUNCTION public.hotel_phone(_hotel_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone FROM public.hotels WHERE id = _hotel_id AND published = true;
$$;

GRANT EXECUTE ON FUNCTION public.hotel_phone(uuid) TO anon, authenticated;