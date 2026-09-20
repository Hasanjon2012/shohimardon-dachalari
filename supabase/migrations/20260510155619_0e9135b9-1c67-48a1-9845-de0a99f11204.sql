
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('user', 'hotel_admin', 'super_owner');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ APP CONFIG (super owner email) ============
CREATE TABLE public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_config (key, value) VALUES ('super_owner_email', '');

-- ============ HOTELS ============
CREATE TABLE public.hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  location TEXT,
  price_per_night NUMERIC(10,2) NOT NULL DEFAULT 0,
  rating NUMERIC(2,1) DEFAULT 0,
  amenities TEXT[] DEFAULT '{}',
  cover_image TEXT,
  phone TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_hotels_owner ON public.hotels(owner_id);

-- ============ HOTEL IMAGES ============
CREATE TABLE public.hotel_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hotel_images ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_hotel_images_hotel ON public.hotel_images(hotel_id);

-- ============ ROOMS ============
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  capacity INT NOT NULL DEFAULT 2,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_rooms_hotel ON public.rooms(hotel_id);

-- ============ BOOKINGS ============
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INT NOT NULL DEFAULT 1,
  status booking_status NOT NULL DEFAULT 'pending',
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  guest_name TEXT,
  guest_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_bookings_user ON public.bookings(user_id);
CREATE INDEX idx_bookings_hotel ON public.bookings(hotel_id);

-- ============ FAVORITES ============
CREATE TABLE public.favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, hotel_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_hotel_owner(_user_id UUID, _hotel_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.hotels WHERE id = _hotel_id AND owner_id = _user_id);
$$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_hotels_updated BEFORE UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- handle_new_user: profile + role from raw_user_meta_data.role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
  _super_email TEXT;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );

  SELECT value INTO _super_email FROM public.app_config WHERE key = 'super_owner_email';

  IF _super_email IS NOT NULL AND _super_email <> '' AND lower(NEW.email) = lower(_super_email) THEN
    _role := 'super_owner';
  ELSIF NEW.raw_user_meta_data->>'role' = 'hotel_admin' THEN
    _role := 'hotel_admin';
  ELSE
    _role := 'user';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "Profiles: self read" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'super_owner'));
CREATE POLICY "Profiles: self update" ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'super_owner'));
CREATE POLICY "Profiles: super delete" ON public.profiles FOR DELETE
  USING (public.has_role(auth.uid(), 'super_owner'));

-- user_roles
CREATE POLICY "Roles: self read" ON public.user_roles FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_owner'));
CREATE POLICY "Roles: super manage" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'super_owner'))
  WITH CHECK (public.has_role(auth.uid(), 'super_owner'));

-- app_config (super owner only)
CREATE POLICY "Config: super read" ON public.app_config FOR SELECT
  USING (public.has_role(auth.uid(), 'super_owner'));
CREATE POLICY "Config: super write" ON public.app_config FOR ALL
  USING (public.has_role(auth.uid(), 'super_owner'))
  WITH CHECK (public.has_role(auth.uid(), 'super_owner'));

-- hotels: public read, owner+super write
CREATE POLICY "Hotels: public read" ON public.hotels FOR SELECT USING (true);
CREATE POLICY "Hotels: owner insert" ON public.hotels FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND (public.has_role(auth.uid(), 'hotel_admin') OR public.has_role(auth.uid(), 'super_owner'))
  );
CREATE POLICY "Hotels: owner update" ON public.hotels FOR UPDATE
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'super_owner'));
CREATE POLICY "Hotels: owner delete" ON public.hotels FOR DELETE
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'super_owner'));

-- hotel_images: public read, owner+super write
CREATE POLICY "Images: public read" ON public.hotel_images FOR SELECT USING (true);
CREATE POLICY "Images: owner write" ON public.hotel_images FOR ALL
  USING (public.is_hotel_owner(auth.uid(), hotel_id) OR public.has_role(auth.uid(), 'super_owner'))
  WITH CHECK (public.is_hotel_owner(auth.uid(), hotel_id) OR public.has_role(auth.uid(), 'super_owner'));

-- rooms: public read, owner write
CREATE POLICY "Rooms: public read" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Rooms: owner write" ON public.rooms FOR ALL
  USING (public.is_hotel_owner(auth.uid(), hotel_id) OR public.has_role(auth.uid(), 'super_owner'))
  WITH CHECK (public.is_hotel_owner(auth.uid(), hotel_id) OR public.has_role(auth.uid(), 'super_owner'));

-- bookings
CREATE POLICY "Bookings: user read own" ON public.bookings FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_hotel_owner(auth.uid(), hotel_id)
    OR public.has_role(auth.uid(), 'super_owner')
  );
CREATE POLICY "Bookings: user insert" ON public.bookings FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Bookings: owner+user update" ON public.bookings FOR UPDATE
  USING (
    user_id = auth.uid()
    OR public.is_hotel_owner(auth.uid(), hotel_id)
    OR public.has_role(auth.uid(), 'super_owner')
  );
CREATE POLICY "Bookings: super delete" ON public.bookings FOR DELETE
  USING (public.has_role(auth.uid(), 'super_owner') OR public.is_hotel_owner(auth.uid(), hotel_id));

-- favorites: only owner
CREATE POLICY "Favorites: self all" ON public.favorites FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public) VALUES ('hotel-images', 'hotel-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Hotel images public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'hotel-images');
CREATE POLICY "Hotel images authenticated upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'hotel-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Hotel images owner update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'hotel-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Hotel images owner delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'hotel-images' AND auth.uid() IS NOT NULL);
