-- Switch reviews to be per-room instead of per-hotel
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS room_id uuid;

-- Remove old unique constraint on (hotel_id, user_id) if exists
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.reviews'::regclass AND contype = 'u' LOOP
    EXECUTE 'ALTER TABLE public.reviews DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- Clear any prior rows (they were per-hotel only, no room_id)
DELETE FROM public.reviews WHERE room_id IS NULL;

ALTER TABLE public.reviews ALTER COLUMN room_id SET NOT NULL;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_room_user_unique UNIQUE (room_id, user_id);
CREATE INDEX IF NOT EXISTS reviews_room_id_idx ON public.reviews(room_id);