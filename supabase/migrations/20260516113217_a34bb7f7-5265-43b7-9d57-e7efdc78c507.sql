CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, user_id)
);

CREATE INDEX idx_reviews_hotel ON public.reviews(hotel_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews: public read" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Reviews: user insert own" ON public.reviews
  FOR INSERT WITH CHECK (user_id = auth.uid() AND NOT public.is_blocked(auth.uid()));

CREATE POLICY "Reviews: user update own" ON public.reviews
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Reviews: user delete own" ON public.reviews
  FOR DELETE USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_owner'::app_role));

CREATE TRIGGER reviews_set_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();