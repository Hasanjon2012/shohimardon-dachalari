
-- Restore full SELECT grants on hotels for anon/authenticated so app queries work.
-- Keep anon blocked from reading the phone column only.
GRANT SELECT ON public.hotels TO authenticated;
GRANT SELECT ON public.hotels TO anon;
REVOKE SELECT (phone) ON public.hotels FROM anon;

-- Restore full SELECT on reviews to authenticated (column-level for anon stays).
GRANT SELECT ON public.reviews TO authenticated;
