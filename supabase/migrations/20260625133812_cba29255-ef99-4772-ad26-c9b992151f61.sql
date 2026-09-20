CREATE OR REPLACE FUNCTION public.reset_all_trust_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_owner'::app_role) THEN
    RAISE EXCEPTION 'Only super owners can reset trust scores';
  END IF;
  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles SET trust_score = 100, no_show_count = 0 WHERE id IS NOT NULL;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);
END;
$function$;