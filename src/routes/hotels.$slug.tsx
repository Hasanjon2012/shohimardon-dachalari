import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { openTrackedPhoneCall, trackHotelView } from "@/lib/track-hotel";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { MapView } from "@/components/MapPicker";
import { useBookingsEnabled } from "@/hooks/use-bookings-enabled";
import { RoomReviews } from "@/components/RoomReviews";

type HotelDetailRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  price_per_night: number;
  rating: number | null;
  amenities: string[] | null;
  cover_image: string | null;
  phone?: string | null;
  lat: number | null;
  lng: number | null;
};

export const Route = createFileRoute("/hotels/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("hotels")
      .select("name, description, cover_image, price_per_night, location")
      .eq("slug", params.slug)
      .eq("published", true)
      .maybeSingle();
    return { hotelMeta: data as null | { name: string; description: string | null; cover_image: string | null; price_per_night: number; location: string | null } };
  },
  head: ({ params, loaderData }) => {
    const url = `https://shohimardon.site/hotels/${params.slug}`;
    const h = loaderData?.hotelMeta;
    const rawDesc = (h?.description ?? "").replace(/\s+/g, " ").trim();
    const fallbackDesc = `${h?.name ?? "Shohimardon dachasi"}${h?.location ? " — " + h.location : ""}. Shohimardonda dacha ijarasi, narxlar va bron qilish.`;
    const description = (rawDesc.length >= 50 ? rawDesc : fallbackDesc).slice(0, 158);
    const title = h?.name ? `${h.name} — Shohimardon Dacha`.slice(0, 60) : "Dacha — Shohimardon";
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:type", content: "article" },
    ];
    if (h?.cover_image) {
      meta.push({ property: "og:image", content: h.cover_image });
      meta.push({ name: "twitter:image", content: h.cover_image });
    }
    const scripts: Array<{ type: string; children: string }> = [];
    if (h) {
      scripts.push({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LodgingBusiness",
          name: h.name,
          description,
          url,
          image: h.cover_image ?? undefined,
          address: h.location ?? undefined,
          priceRange: h.price_per_night ? `${Number(h.price_per_night).toLocaleString()} UZS` : undefined,
        }),
      });
    }
    return { meta, links: [{ rel: "canonical", href: url }], scripts };
  },
  component: HotelDetailPage,
});

function HotelDetailPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeImg, setActiveImg] = useState<string | null>(null);
  const bookingsEnabled = useBookingsEnabled();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [roomId, setRoomId] = useState<string>("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["hotel", slug],
    queryFn: async () => {
      const hotelResult = await supabase
        .from("hotels")
        .select("id, name, slug, description, location, price_per_night, rating, amenities, cover_image, lat, lng, owner_id, deposit_percent")
        .eq("slug", slug)
        .single();
      const hotelBase = hotelResult.data as any;
      const error = hotelResult.error;
      if (error) throw error;
      let phone: string | null = null;
      if (hotelBase) {
        const { data: ph } = await supabase.rpc("hotel_phone", { _hotel_id: hotelBase.id });
        phone = (ph as string) ?? null;
      }
      const hotel = { ...hotelBase, phone } as unknown as HotelDetailRow;
      const [{ data: imgs }, { data: rooms }] = await Promise.all([
        supabase.from("hotel_images").select("*").eq("hotel_id", hotel.id).order("sort_order"),
        supabase.from("rooms").select("*").eq("hotel_id", hotel.id).order("price"),
      ]);
      return { hotel, images: imgs ?? [], rooms: rooms ?? [] };
    },
  });

  useEffect(() => { if (data?.hotel?.id) trackHotelView(data.hotel.id); }, [data?.hotel?.id]);


  const { data: isFav } = useQuery({
    queryKey: ["fav", slug, user?.id],
    enabled: !!user && !!data?.hotel.id,
    queryFn: async () => {
      const { data: f } = await supabase
        .from("favorites")
        .select("hotel_id")
        .eq("user_id", user!.id)
        .eq("hotel_id", data!.hotel.id)
        .maybeSingle();
      return !!f;
    },
  });

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (!user || !data) throw new Error("auth");
      if (isFav) {
        await supabase.from("favorites").delete().eq("user_id", user.id).eq("hotel_id", data.hotel.id);
      } else {
        await supabase.from("favorites").insert({ user_id: user.id, hotel_id: data.hotel.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fav", slug] }),
  });

  const book = useMutation({
    mutationFn: async () => {
      if (!user || !data) throw new Error("auth");
      if (!checkIn || !checkOut) throw new Error("Sanani tanlang");
      if (new Date(checkOut) <= new Date(checkIn)) throw new Error("Ketish sanasi kelish sanasidan keyin bo'lishi kerak");

      // Conflict check: same room (or hotel-level if no room) overlapping dates
      let conflictQ = supabase
        .from("bookings")
        .select("check_in, check_out, status")
        .eq("hotel_id", data.hotel.id)
        .neq("status", "cancelled")
        .lt("check_in", checkOut)
        .gt("check_out", checkIn);
      if (roomId) conflictQ = conflictQ.eq("room_id", roomId);
      const { data: conflicts } = await conflictQ;
      if (conflicts && conflicts.length > 0) {
        const ranges = conflicts.map((c: any) => `${c.check_in} → ${c.check_out}`).join(", ");
        throw new Error(`Bu xona tanlangan kunlarda allaqachon band. Band kunlar: ${ranges}`);
      }

      const nights = Math.max(1, (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
      const room = data.rooms.find((r) => r.id === roomId);
      const price = room ? Number(room.price) * nights : Number(data.hotel.price_per_night) * nights;
      const { data: created, error } = await supabase.from("bookings").insert({
        user_id: user.id,
        hotel_id: data.hotel.id,
        room_id: roomId || null,
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
      navigate({ to: "/booking/$id/pay", params: { id: bookingId } });
    },
    onError: (e: Error) => toast.error(friendlyError(e)),
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center">Topilmadi</div>;

  const { hotel, images, rooms } = data;
  const heroImg = activeImg || hotel.cover_image || images[0]?.url;

  return (
    <div className="bg-background">
      <SiteHeader />

      <section className="relative h-[60vh] min-h-[420px] overflow-hidden bg-emerald-deep">
        {heroImg ? (
          <img src={heroImg} alt={hotel.name} className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-deep/40 to-emerald-deep/80" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <h1 className="font-display text-5xl text-white md:text-7xl">{hotel.name}</h1>
          <p className="mt-3 text-white/80">{hotel.location}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-10">
            {/* Gallery */}
            {images.length > 0 ? (
              <div>
                <h2 className="font-display text-2xl text-emerald-deep">Galereya</h2>
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {images.map((img) => (
                    <button key={img.id} onClick={() => setActiveImg(img.url)} className="aspect-square overflow-hidden rounded-xl">
                      <img src={img.url} alt={img.caption ?? ""} className="h-full w-full object-cover hover:scale-105 transition" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Description */}
            <div>
              <h2 className="font-display text-2xl text-emerald-deep">Tavsif</h2>
              <p className="mt-3 whitespace-pre-line text-muted-foreground">{hotel.description ?? "—"}</p>
            </div>

            {/* Amenities */}
            {hotel.amenities && hotel.amenities.length > 0 ? (
              <div>
                <h2 className="font-display text-2xl text-emerald-deep">Qulayliklar</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {hotel.amenities.map((a: string) => (
                    <span key={a} className="rounded-full bg-emerald-tint px-4 py-2 text-sm text-emerald-deep">{a}</span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Map */}
            {hotel.lat != null && hotel.lng != null ? (
              <div>
                <h2 className="font-display text-2xl text-emerald-deep">Lokatsiya</h2>
                <div className="mt-3">
                  <MapView lat={Number(hotel.lat)} lng={Number(hotel.lng)} height={320} />
                </div>
              </div>
            ) : null}

            {/* Rooms */}
            {rooms.length > 0 ? (
              <div>
                <h2 className="font-display text-2xl text-emerald-deep">Xonalar</h2>
                <div className="mt-4 space-y-3">
                  {rooms.map((r) => (
                    <div key={r.id} className={`rounded-2xl border p-5 transition ${roomId === r.id ? "border-gold bg-gold/5" : "border-border"}`}>
                      <label className="flex cursor-pointer items-center justify-between">
                        <div>
                          <input type="radio" name="room" checked={roomId === r.id} onChange={() => setRoomId(r.id)} className="sr-only" />
                          <div className="font-display text-lg text-emerald-deep">{r.name}</div>
                          <div className="text-sm text-muted-foreground">{r.capacity} kishi · {r.description ?? ""}</div>
                        </div>
                        <div className="font-medium text-emerald-deep">{Number(r.price).toLocaleString()} so'm</div>
                      </label>
                      <RoomReviews hotelId={hotel.id} roomId={r.id} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>


          {/* Booking card */}
          <aside className="lg:sticky lg:top-28 h-fit rounded-3xl bg-white p-7 shadow-card-luxe">
            <div className="text-3xl font-display text-emerald-deep">
              {Number(hotel.price_per_night).toLocaleString()} <span className="text-base text-muted-foreground">so'm/kecha</span>
            </div>
            {hotel.rating ? <div className="mt-2 text-sm text-gold">★ {hotel.rating}</div> : null}

            {!bookingsEnabled ? (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-muted-foreground">Bron qilish vaqtincha o'chirilgan. Iltimos, mehmonxona egasi bilan bog'laning.</p>
                {hotel.phone ? (
                  <a href={`tel:${hotel.phone}`} onClick={(e) => openTrackedPhoneCall(e, hotel.id, hotel.phone!)} className="block w-full rounded-full bg-emerald-deep py-3 text-center text-xs uppercase tracking-[0.25em] text-cream hover:bg-gold hover:text-emerald-deep">
                    Qo'ng'iroq: {hotel.phone}
                  </a>
                ) : null}
              </div>
            ) : !user ? (
              <div className="mt-6 space-y-3">
                {hotel.phone ? (
                  <a href={`tel:${hotel.phone}`} onClick={(e) => openTrackedPhoneCall(e, hotel.id, hotel.phone!)} className="block w-full rounded-full border border-emerald-deep py-3 text-center text-xs uppercase tracking-[0.25em] text-emerald-deep hover:bg-emerald-deep hover:text-cream">
                    Qo'ng'iroq: {hotel.phone}
                  </a>
                ) : null}
                <button
                  onClick={() => navigate({ to: "/login" })}
                  className="block w-full rounded-full bg-emerald-deep py-3 text-center text-xs uppercase tracking-[0.25em] text-cream hover:bg-gold hover:text-emerald-deep"
                >
                  Bron qilish
                </button>
                <p className="text-center text-xs text-muted-foreground">Bron qilish uchun tizimga kiring.</p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-emerald-deep/70">Kelish</label>
                    <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-cream px-3 py-2.5 outline-none focus:border-gold" />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-emerald-deep/70">Ketish</label>
                    <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-cream px-3 py-2.5 outline-none focus:border-gold" />
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-emerald-deep/70">Mehmonlar</label>
                  <input type="number" min={1} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-border bg-cream px-3 py-2.5 outline-none focus:border-gold" />
                </div>
                <input placeholder="Ismingiz" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full rounded-xl border border-border bg-cream px-3 py-2.5 outline-none focus:border-gold" />
                <input placeholder="Telefon" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="w-full rounded-xl border border-border bg-cream px-3 py-2.5 outline-none focus:border-gold" />

                <button
                  onClick={() => book.mutate()}
                  disabled={book.isPending}
                  className="w-full rounded-full bg-emerald-deep py-3 text-xs uppercase tracking-[0.25em] text-cream transition hover:bg-gold hover:text-emerald-deep disabled:opacity-50"
                >
                  {book.isPending ? "Yuborilmoqda..." : "Book now"}
                </button>
                <button
                  onClick={() => toggleFav.mutate()}
                  className="w-full rounded-full border border-emerald-deep py-3 text-xs uppercase tracking-[0.25em] text-emerald-deep hover:bg-emerald-deep hover:text-cream"
                >
                  {isFav ? "♥ Sevimlilarda" : "♡ Sevimlilarga"}
                </button>
              </div>
            )}

            {hotel.phone && user ? (
              <a href={`tel:${hotel.phone}`} onClick={(e) => openTrackedPhoneCall(e, hotel.id, hotel.phone!)} className="mt-3 block text-center text-xs uppercase tracking-[0.2em] text-emerald-deep hover:text-gold">
                Qo'ng'iroq: {hotel.phone}
              </a>
            ) : null}


          </aside>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
