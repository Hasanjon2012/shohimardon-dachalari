DROP POLICY IF EXISTS "Hotels: public read" ON public.hotels;
DROP POLICY IF EXISTS "Hotels: published public read" ON public.hotels;
DROP POLICY IF EXISTS "Hotels: owner and super read" ON public.hotels;

CREATE POLICY "Hotels: published public read"
  ON public.hotels
  FOR SELECT
  TO anon, authenticated
  USING (published = true);

CREATE POLICY "Hotels: owner and super read"
  ON public.hotels
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'super_owner'::public.app_role)
  );

GRANT SELECT (id, slug, name, description, location, price_per_night, rating, amenities, cover_image, published, created_at, updated_at, lat, lng) ON public.hotels TO anon;
GRANT SELECT ON public.hotels TO authenticated;
GRANT ALL ON public.hotels TO service_role;
REVOKE SELECT (phone) ON public.hotels FROM anon;