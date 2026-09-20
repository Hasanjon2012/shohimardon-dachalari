
-- Allow anonymous (guest) reviews
ALTER TABLE public.reviews ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS guest_name text;

-- Drop unique constraint referencing (room_id, user_id) if it exists so guests can add multiple
-- Keep constraint for signed-in users via partial unique index
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_room_id_user_id_key') THEN
    ALTER TABLE public.reviews DROP CONSTRAINT reviews_room_id_user_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_room_user_unique_idx
  ON public.reviews (room_id, user_id) WHERE user_id IS NOT NULL;

-- Require either user_id or guest_name
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_author_present;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_author_present
  CHECK (user_id IS NOT NULL OR (guest_name IS NOT NULL AND length(btrim(guest_name)) > 0));

-- Grant SELECT to anon so public reviews list works
GRANT SELECT ON public.reviews TO anon;
GRANT INSERT ON public.reviews TO anon;

-- Replace insert policy: allow authenticated users (no booking check) and anon guests
DROP POLICY IF EXISTS "Reviews: user insert own" ON public.reviews;
DROP POLICY IF EXISTS "Reviews: authenticated insert" ON public.reviews;
DROP POLICY IF EXISTS "Reviews: guest insert" ON public.reviews;

CREATE POLICY "Reviews: authenticated insert"
ON public.reviews FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND NOT public.is_blocked(auth.uid())
  AND rating BETWEEN 1 AND 5
  AND EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.hotels h ON h.id = r.hotel_id
    WHERE r.id = reviews.room_id AND r.hotel_id = reviews.hotel_id AND h.published = true
  )
);

CREATE POLICY "Reviews: guest insert"
ON public.reviews FOR INSERT TO anon
WITH CHECK (
  user_id IS NULL
  AND guest_name IS NOT NULL
  AND length(btrim(guest_name)) BETWEEN 1 AND 60
  AND rating BETWEEN 1 AND 5
  AND (comment IS NULL OR length(comment) <= 1000)
  AND EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.hotels h ON h.id = r.hotel_id
    WHERE r.id = reviews.room_id AND r.hotel_id = reviews.hotel_id AND h.published = true
  )
);
