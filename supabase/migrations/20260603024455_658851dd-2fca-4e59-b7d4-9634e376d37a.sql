CREATE POLICY "Profiles: self insert" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

REVOKE SELECT (phone) ON public.hotels FROM anon;