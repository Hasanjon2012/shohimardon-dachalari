
CREATE OR REPLACE FUNCTION public.hotels_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_owner'::app_role) THEN
    IF NEW.featured        IS DISTINCT FROM OLD.featured        THEN RAISE EXCEPTION 'featured can only be changed by super_owner'; END IF;
    IF NEW.manual_order    IS DISTINCT FROM OLD.manual_order    THEN RAISE EXCEPTION 'manual_order can only be changed by super_owner'; END IF;
    IF NEW.contact_clicks  IS DISTINCT FROM OLD.contact_clicks  THEN RAISE EXCEPTION 'contact_clicks is server-controlled'; END IF;
    IF NEW.view_count      IS DISTINCT FROM OLD.view_count      THEN RAISE EXCEPTION 'view_count is server-controlled'; END IF;
    IF NEW.phone_clicks    IS DISTINCT FROM OLD.phone_clicks    THEN RAISE EXCEPTION 'phone_clicks is server-controlled'; END IF;
    IF NEW.published       IS DISTINCT FROM OLD.published       THEN RAISE EXCEPTION 'published can only be changed by super_owner'; END IF;
    IF NEW.rating          IS DISTINCT FROM OLD.rating          THEN RAISE EXCEPTION 'rating is server-controlled'; END IF;
    IF NEW.deposit_percent IS DISTINCT FROM OLD.deposit_percent THEN RAISE EXCEPTION 'deposit_percent can only be changed by super_owner'; END IF;
    IF NEW.owner_id        IS DISTINCT FROM OLD.owner_id        THEN RAISE EXCEPTION 'owner_id is immutable'; END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS hotels_guard_update_trg ON public.hotels;
CREATE TRIGGER hotels_guard_update_trg
BEFORE UPDATE ON public.hotels
FOR EACH ROW EXECUTE FUNCTION public.hotels_guard_update();
