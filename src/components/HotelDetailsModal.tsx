import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { MapPin, Star, ChevronLeft, ChevronRight, X } from "lucide-react";
import { MapView } from "@/components/MapPicker";
import { useBookingsEnabled } from "@/hooks/use-bookings-enabled";
import { RoomReviews } from "@/components/RoomReviews";
import { openTrackedPhoneCall, trackHotelView } from "@/lib/track-hotel";

type Props = {
  hotelId: string | null;
  slug?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Room = {
  id: string;
  name: string;
  price: number;
  capacity: number;
  description: string | null;
  images: { id: string; room_id: string; url: string }[];
};

type HotelModalRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  location: string | null;
  price_per_night: number;
  rating: number | null;
  cover_image: string | null;
  phone?: string | null;
  amenities: string[] | null;
  lat: number | null;
  lng: number | null;
};

export function HotelDetailsModal({ hotelId, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const bookingsEnabled = useBookingsEnabled();
  const [activeImg, setActiveImg] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setLightbox((l) => l && l.index < l.images.length - 1 ? { ...l, index: l.index + 1 } : l);
      else if (e.key === "ArrowLeft") setLightbox((l) => l && l.index > 0 ? { ...l, index: l.index - 1 } : l);
      else if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  useEffect(() => {
    if (open && hotelId) {
      trackHotelView(hotelId);
    }
  }, [open, hotelId]);

  const { data, isLoading } = useQuery({
    enabled: open && !!hotelId,
    queryKey: ["hotel-modal-full", hotelId],
    queryFn: async () => {
      const { data: hotel, error } = await supabase
        .from("hotels")
        .select("id, slug, name, description, location, price_per_night, rating, cover_image, amenities, lat, lng")
        .eq("id", hotelId!)
        .maybeSingle();
      if (error) throw error;
      let phone: string | null = null;
      if (hotel) {
        const { data: ph } = await supabase.rpc("hotel_phone", { _hotel_id: hotelId! });
        phone = (ph as string) ?? null;
      }
      const { data: imgs } = await supabase
        .from("hotel_images")
        .select("id, url, caption")
        .eq("hotel_id", hotelId!)
        .order("sort_order");
      const { data: rooms } = await supabase
        .from("rooms")
        .select("id, name, price, capacity, description")
        .eq("hotel_id", hotelId!)
        .order("price");
      const roomIds = (rooms ?? []).map((r) => r.id);
      const { data: roomImgs } = roomIds.length
        ? await supabase.from("room_images").select("id, room_id, url").in("room_id", roomIds).order("sort_order")
        : { data: [] as { id: string; room_id: string; url: string }[] };
      const roomsWithImages: Room[] = (rooms ?? []).map((r) => ({
        ...r,
        images: (roomImgs ?? []).filter((i) => i.room_id === r.id),
      }));
      return { hotel: hotel ? ({ ...hotel, phone } as unknown as HotelModalRow) : null, images: imgs ?? [], rooms: roomsWithImages };
    },
  });

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto bg-background p-0">
        {isLoading || !data?.hotel ? (
          <p className="py-20 text-center text-muted-foreground">Yuklanmoqda...</p>
        ) : (() => {
          const hotel = data.hotel;
          const images = data.images;
          const heroImg = activeImg || hotel.cover_image || images[0]?.url;
          const others = images.filter((i) => i.url !== heroImg).slice(0, 3);
          return (
            <div className="p-6 md:p-8">
              {/* Gallery */}
              {heroImg ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="md:col-span-2 h-[280px] md:h-[420px] overflow-hidden rounded-2xl bg-emerald-tint">
                    <img src={heroImg} alt={hotel.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-1 gap-3">
                    {others.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setActiveImg(img.url)}
                        className="h-24 md:h-[133px] overflow-hidden rounded-2xl bg-emerald-tint"
                      >
                        <img src={img.url} alt={img.caption ?? ""} className="h-full w-full object-cover hover:scale-105 transition" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Info */}
              <div className="mt-8">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {hotel.rating ? (
                    <span className="inline-flex items-center gap-1.5 text-gold">
                      <Star className="h-4 w-4 fill-gold" /> {hotel.rating}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-3 font-display text-4xl md:text-5xl text-emerald-deep">{hotel.name}</h2>
                {hotel.description ? (
                  <p className="mt-4 whitespace-pre-line text-muted-foreground">{hotel.description}</p>
                ) : null}

                {hotel.amenities && hotel.amenities.length > 0 ? (
                  <div className="mt-8">
                    <h3 className="font-display text-2xl text-emerald-deep">Qulayliklar</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {hotel.amenities.map((a: string) => (
                        <span key={a} className="rounded-full bg-emerald-tint px-4 py-2 text-sm text-emerald-deep">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Rooms with per-room booking */}
                <div className="mt-8">
                  <h3 className="font-display text-2xl text-emerald-deep">Xonalar</h3>
                  {data.rooms.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">Hozircha xonalar qo'shilmagan.</p>
                  ) : (
                    <div className="mt-3 space-y-4">
                      {data.rooms.map((r) => (
                        <RoomCard
                          key={r.id}
                          room={r}
                          hotelId={hotel.id}
                          hotelPhone={hotel.phone ?? null}
                          isAuthed={!!user}
                          userId={user?.id}
                          bookingsEnabled={bookingsEnabled}
                          onLoginClick={() => { onOpenChange(false); navigate({ to: "/login" }); }}
                          onBooked={(bookingId) => { onOpenChange(false); navigate({ to: "/booking/$id/pay", params: { id: bookingId } }); }}
                          onImageClick={(images, index) => setLightbox({ images, index })}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {hotel.lat != null && hotel.lng != null ? (
                  <div className="mt-8">
                    <h3 className="font-display text-2xl text-emerald-deep">Lokatsiya</h3>
                    <div className="mt-3">
                      <MapView lat={Number(hotel.lat)} lng={Number(hotel.lng)} />
                    </div>
                  </div>
                ) : null}

                {hotel.phone ? (
                  <a href={`tel:${hotel.phone}`} onClick={(e) => openTrackedPhoneCall(e, hotel.id, hotel.phone!)} className="mt-6 inline-block text-xs uppercase tracking-[0.2em] text-emerald-deep hover:text-gold">
                    Qo'ng'iroq: {hotel.phone}
                  </a>
                ) : null}
              </div>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
    {lightbox ? (
      <Dialog open={!!lightbox} onOpenChange={(o) => { if (!o) setLightbox(null); }}>
        <DialogContent className="max-w-5xl bg-black/95 p-0 border-0 [&>button]:hidden">
          <div className="relative flex items-center justify-center">
            <button
              type="button"
              aria-label="Yopish"
              onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
              className="fixed right-4 top-4 z-[100] flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white shadow-lg ring-1 ring-white/30 hover:bg-black/90 sm:h-12 sm:w-12"
            >
              <X className="h-6 w-6" />
            </button>
            <img src={lightbox.images[lightbox.index]} alt="" className="max-h-[90vh] w-full object-contain" />
            {lightbox.images.length > 1 ? (
              <>
                {lightbox.index > 0 ? (
                  <button
                    type="button"
                    aria-label="Oldingi"
                    onClick={() => setLightbox((l) => l ? { ...l, index: l.index - 1 } : l)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                ) : null}
                {lightbox.index < lightbox.images.length - 1 ? (
                  <button
                    type="button"
                    aria-label="Keyingi"
                    onClick={() => setLightbox((l) => l ? { ...l, index: l.index + 1 } : l)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                ) : null}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                  {lightbox.index + 1} / {lightbox.images.length}
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    ) : null}
    </>
  );
}

function RoomCard({
  room, hotelId, hotelPhone, isAuthed, userId, bookingsEnabled, onLoginClick, onBooked, onImageClick,
}: {
  room: Room;
  hotelId: string;
  hotelPhone: string | null;
  isAuthed: boolean;
  userId?: string;
  bookingsEnabled: boolean;
  onLoginClick: () => void;
  onBooked: (bookingId: string) => void;
  onImageClick: (images: string[], index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const book = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");
      if (!checkIn || !checkOut) throw new Error("Sanani tanlang");
      const nights = Math.max(1, (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
      const price = Number(room.price) * nights;
      const { data: created, error } = await supabase.from("bookings").insert({
        user_id: userId,
        hotel_id: hotelId,
        room_id: room.id,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        total_price: price,
        guest_name: guestName,
        guest_phone: guestPhone,
      }).select("id").single();
      if (error) throw error;
      return created.id as string;
    },
    onSuccess: (bookingId) => {
      onBooked(bookingId);
    },
    onError: (e: Error) => toast.error(friendlyError(e)),
  });

  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-display text-xl text-emerald-deep">{room.name}</div>
          <div className="text-xs text-muted-foreground">{room.capacity} kishi · {Number(room.price).toLocaleString()} so'm/kecha</div>
          {room.description ? <div className="mt-1 text-sm text-muted-foreground">{room.description}</div> : null}
        </div>
        {bookingsEnabled ? (
          <button
            type="button"
            onClick={() => isAuthed ? setOpen((v) => !v) : onLoginClick()}
            className="rounded-full bg-emerald-deep px-5 py-2 text-xs uppercase tracking-[0.2em] text-cream hover:bg-gold hover:text-emerald-deep"
          >
            {isAuthed && open ? "Yopish" : "Bron qilish"}
          </button>
        ) : hotelPhone ? (
          <a
            href={`tel:${hotelPhone}`}
            onClick={(e) => openTrackedPhoneCall(e, hotelId, hotelPhone)}
            className="rounded-full bg-emerald-deep px-5 py-2 text-xs uppercase tracking-[0.2em] text-cream hover:bg-gold hover:text-emerald-deep"
          >
            Aloqa
          </a>
        ) : (
          <span className="rounded-full border border-border px-5 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Aloqa mavjud emas
          </span>
        )}
      </div>

      {room.images.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
          {room.images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => onImageClick(room.images.map((i) => i.url), idx)}
              className="h-32 w-full overflow-hidden rounded-lg bg-cream"
            >
              <img src={img.url} alt="" className="h-full w-full object-contain transition-transform hover:scale-105" />
            </button>
          ))}
        </div>
      ) : null}

      {open && isAuthed ? (
        <div className="mt-4 grid gap-3 rounded-xl bg-cream/60 p-4 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wider text-emerald-deep/70">Kelish sanasi</label>
            <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 outline-none focus:border-gold" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-emerald-deep/70">Ketish sanasi</label>
            <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 outline-none focus:border-gold" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-emerald-deep/70">Mehmonlar soni</label>
            <input type="number" min={1} max={room.capacity} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 outline-none focus:border-gold" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-emerald-deep/70">Ismingiz</label>
            <input value={guestName} onChange={(e) => setGuestName(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 outline-none focus:border-gold" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs uppercase tracking-wider text-emerald-deep/70">Telefon</label>
            <input placeholder={hotelPhone ?? "+998901234567"} value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 outline-none focus:border-gold" />
          </div>
          <button
            type="button"
            onClick={() => book.mutate()}
            disabled={book.isPending}
            className="sm:col-span-2 w-full rounded-full bg-emerald-deep py-3 text-sm font-medium uppercase tracking-[0.2em] text-cream transition hover:bg-gold hover:text-emerald-deep disabled:opacity-50"
          >
            {book.isPending ? "Yuborilmoqda..." : `Bron qilish · ${Number(room.price).toLocaleString()} so'm/kecha`}
          </button>
        </div>
      ) : null}

      <RoomReviews hotelId={hotelId} roomId={room.id} />
    </div>
  );
}
