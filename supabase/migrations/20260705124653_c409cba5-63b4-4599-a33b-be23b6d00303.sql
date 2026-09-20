
-- Restrict hotel admins from directly reading guest PII on bookings.
DROP POLICY IF EXISTS "Bookings: user read own" ON public.bookings;
CREATE POLICY "Bookings: user read own" ON public.bookings FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_owner'::app_role)
  );

-- Provide a scoped accessor for hotel admins that masks guest PII until payment is completed.
CREATE OR REPLACE FUNCTION public.hotel_owner_bookings()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  hotel_id uuid,
  room_id uuid,
  check_in date,
  check_out date,
  guests integer,
  total_price numeric,
  deposit_amount numeric,
  deposit_percent integer,
  status booking_status,
  payment_status text,
  payment_method text,
  payment_expires_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  refund_eligible boolean,
  created_at timestamptz,
  updated_at timestamptz,
  guest_name text,
  guest_phone text,
  hotel_name text,
  hotel_slug text,
  room_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id, b.user_id, b.hotel_id, b.room_id, b.check_in, b.check_out, b.guests,
    b.total_price, b.deposit_amount, b.deposit_percent, b.status,
    b.payment_status, b.payment_method, b.payment_expires_at, b.paid_at,
    b.cancelled_at, b.refund_eligible, b.created_at, b.updated_at,
    CASE WHEN b.payment_status = 'paid' THEN b.guest_name ELSE NULL END,
    CASE WHEN b.payment_status = 'paid' THEN b.guest_phone ELSE NULL END,
    h.name, h.slug, r.name
  FROM public.bookings b
  JOIN public.hotels h ON h.id = b.hotel_id
  LEFT JOIN public.rooms r ON r.id = b.room_id
  WHERE (
    h.owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_owner'::app_role)
  )
  AND b.status <> 'no_show'
  ORDER BY b.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.hotel_owner_bookings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hotel_owner_bookings() TO authenticated;
