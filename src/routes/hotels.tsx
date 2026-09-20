import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HotelDetailsModal } from "@/components/HotelDetailsModal";
import { supabase } from "@/integrations/supabase/client";
import heroMountainAsset from "@/assets/hotels-hero-mountain.jpg.asset.json";
import { openProtectedHotelPhoneCall } from "@/lib/track-hotel";

export const Route = createFileRoute("/hotels")({
  head: () => ({
    meta: [
      { title: "Shohimardon Dachalari — Ijara Narxlari" },
      { name: "description", content: "Shohimardon vodiysidagi mehmonxonalar va dachalar to'plami. Ijara narxlari, bron qilish va kontaktlar." },
      { property: "og:title", content: "Shohimardon Dachalari — Ijara Narxlari" },
      { property: "og:description", content: "Shohimardon vodiysidagi mehmonxonalar va dachalar to'plami. Ijara narxlari, bron qilish va kontaktlar." },
      { property: "og:url", content: "https://shohimardon.site/hotels" },
    ],
    links: [{ rel: "canonical", href: "https://shohimardon.site/hotels" }],
  }),
  component: HotelsPage,
});

type HotelRow = {
  id: string;
  slug: string;
  name: string;
  location: string | null;
  price_per_night: number;
  rating: number | null;
  cover_image: string | null;
  phone?: string | null;
  amenities: string[] | null;
  avg_rating?: number | null;
  min_room_price?: number | null;
};

function HotelsPage() {
  const [search, setSearch] = useState("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [minRating, setMinRating] = useState<string>("");
  const [modalHotel, setModalHotel] = useState<{ id: string; slug: string } | null>(null);

  const { data: hotels = [], isLoading } = useQuery({
    queryKey: ["hotels-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotels")
        .select("id, slug, name, location, price_per_night, rating, cover_image, amenities, manual_order, contact_clicks, view_count, phone_clicks, featured, created_at")
        .eq("published", true);
      if (error) throw error;
      const list = (data ?? []) as unknown as HotelRow[];
      const ids = list.map((h) => h.id);
      if (ids.length === 0) return list;
      const [{ data: rooms }, { data: reviews }] = await Promise.all([
        supabase.from("rooms").select("hotel_id, price").in("hotel_id", ids),
        supabase.from("reviews").select("hotel_id, rating").in("hotel_id", ids),
      ]);
      const minMap = new Map<string, number>();
      (rooms ?? []).forEach((r: any) => {
        const p = Number(r.price);
        if (!Number.isFinite(p) || p <= 0) return;
        const cur = minMap.get(r.hotel_id);
        if (cur === undefined || p < cur) minMap.set(r.hotel_id, p);
      });
      const sumMap = new Map<string, number>();
      const countMap = new Map<string, number>();
      (reviews ?? []).forEach((r: any) => {
        sumMap.set(r.hotel_id, (sumMap.get(r.hotel_id) ?? 0) + Number(r.rating));
        countMap.set(r.hotel_id, (countMap.get(r.hotel_id) ?? 0) + 1);
      });
      return list.map((h) => {
        const roomMin = minMap.get(h.id);
        const hotelPrice = Number(h.price_per_night);
        const fallback = Number.isFinite(hotelPrice) && hotelPrice > 0 ? hotelPrice : null;
        const cnt = countMap.get(h.id) ?? 0;
        return {
          ...h,
          min_room_price: roomMin ?? fallback,
          avg_rating: cnt > 0 ? sumMap.get(h.id)! / cnt : (h.rating != null && Number(h.rating) > 0 ? Number(h.rating) : null),
        };
      });
    },
    staleTime: 60_000,
  });

  const filtered = hotels.filter((h: any) => {
    if (search && !`${h.name} ${h.location ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (maxPrice && (h.min_room_price === null || Number(h.min_room_price) > Number(maxPrice))) return false;
    if (minRating && Number(h.avg_rating ?? h.rating ?? 0) < Number(minRating)) return false;
    return true;
  });

  const FEATURED_LIMIT = 5;
  const smartScore = (h: any) => (Number(h.view_count) || 0) * 1 + (Number(h.phone_clicks) || 0) * 5;
  // Featured (max 5) — owner-selected, ordered by manual_order then score
  const featured = filtered
    .filter((h: any) => h.featured)
    .sort((a: any, b: any) => {
      const ma = a.manual_order ?? 9999;
      const mb = b.manual_order ?? 9999;
      if (ma !== mb) return ma - mb;
      return smartScore(b) - smartScore(a);
    })
    .slice(0, FEATURED_LIMIT);
  const featuredIds = new Set(featured.map((h: any) => h.id));
  // Smart-ranked rest
  const ranked = filtered
    .filter((h: any) => !featuredIds.has(h.id))
    .sort((a: any, b: any) => smartScore(b) - smartScore(a));

  const renderCard = (d: any, badge?: { label: string; tone: "gold" | "emerald" }) => (
    <article key={d.id} className="group hover-lift overflow-hidden rounded-3xl bg-white shadow-card-luxe">
      <button type="button" onClick={() => setModalHotel({ id: d.id, slug: d.slug })} className="block w-full text-left">
        <div className="relative h-72 overflow-hidden bg-emerald-tint">
          {d.cover_image ? (
            <img src={d.cover_image} alt={d.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-[2000ms] group-hover:scale-110" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-emerald-deep/60">
              <span className="font-display text-4xl">{d.name[0]}</span>
            </div>
          )}
          {badge ? (
            <div className={`absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] shadow-lg backdrop-blur-sm ${badge.tone === "gold" ? "bg-gold text-emerald-deep ring-1 ring-gold/60" : "bg-emerald-deep/90 text-cream ring-1 ring-cream/30"}`}>
              {badge.label}
            </div>
          ) : null}
          {d.avg_rating != null ? (
            <div className="absolute right-4 top-4 rounded-full bg-emerald-deep/90 px-3 py-1 text-xs font-medium text-gold shadow-lg ring-1 ring-gold/30 backdrop-blur-sm">★ {d.avg_rating.toFixed(1)}</div>
          ) : d.rating ? (
            <div className="absolute right-4 top-4 rounded-full bg-emerald-deep/90 px-3 py-1 text-xs font-medium text-gold shadow-lg ring-1 ring-gold/30 backdrop-blur-sm">★ {d.rating}</div>
          ) : null}
        </div>
      </button>
      <div className="p-7">
        <button type="button" onClick={() => setModalHotel({ id: d.id, slug: d.slug })} className="text-left">
          <h3 className="font-display text-2xl text-emerald-deep transition-colors hover:text-gold">{d.name}</h3>
        </button>
        <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
          <div>
            {d.min_room_price !== null ? (
              <>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bir kecha (eng arzon)</div>
                <div className="mt-1 text-base font-medium text-emerald-deep">{Number(d.min_room_price).toLocaleString()} so'm</div>
              </>
            ) : (
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Narx ko'rsatilmagan</div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => openProtectedHotelPhoneCall(d.id)}
              className="rounded-full border border-emerald-deep px-5 py-2.5 text-center text-xs uppercase tracking-[0.2em] text-emerald-deep transition hover:bg-emerald-deep hover:text-cream cursor-pointer"
            >
              Aloqa
            </button>
            <button
              type="button"
              onClick={() => setModalHotel({ id: d.id, slug: d.slug })}
              className="rounded-full bg-emerald-deep px-5 py-2.5 text-center text-xs uppercase tracking-[0.2em] text-cream transition hover:bg-gold hover:text-emerald-deep"
            >
              Batafsil
            </button>
          </div>
        </div>
      </div>
    </article>
  );

  return (
    <div className="bg-background">
      <SiteHeader />

      <section className="relative h-[40vh] min-h-[320px] overflow-hidden bg-emerald-deep">
        <img
          src={heroMountainAsset.url}
          alt="Shohimardon tog'lari"
          loading="eager"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-deep/70 via-emerald-deep/60 to-emerald-deep/80" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.5em] text-gold">Tanlangan makonlar</p>
          <h1 className="mt-6 font-display text-5xl text-white md:text-7xl">
            Bizning <span className="italic text-gradient-gold">dachalarimiz</span>
          </h1>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          {/* Filters */}
          <div className="mb-10 grid gap-4 rounded-2xl bg-white p-6 shadow-card-luxe md:grid-cols-3">
            <input
              placeholder="Qidiruv (nom yoki joylashuv)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-border bg-cream px-4 py-3 outline-none focus:border-gold"
            />
            <input
              type="number"
              placeholder="Maksimal narx (so'm)"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="rounded-xl border border-border bg-cream px-4 py-3 outline-none focus:border-gold"
            />
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="rounded-xl border border-border bg-cream px-4 py-3 outline-none focus:border-gold"
            >
              <option value="">Reyting bo'yicha</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="4.5">4.5+</option>
            </select>
          </div>

          {isLoading ? (
            <p className="text-center text-muted-foreground">Yuklanmoqda...</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl bg-white p-16 text-center shadow-card-luxe">
              <p className="font-display text-2xl text-emerald-deep">Dachalar topilmadi</p>
            </div>
          ) : (
            <div className="space-y-16">
              {featured.length > 0 ? (
                <div>
                  <div className="mb-6 flex items-end justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.4em] text-gold">Eng yaxshi tanlov</p>
                      <h2 className="mt-2 font-display text-3xl text-emerald-deep">Tavsiya etilgan dachalar</h2>
                    </div>
                  </div>
                  <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
                    {featured.map((d: any) => renderCard(d, { label: "Tavsiya etilgan", tone: "gold" }))}
                  </div>
                </div>
              ) : null}

              {ranked.length > 0 ? (
                <div>
                  <div className="mb-6">
                    <p className="text-[11px] uppercase tracking-[0.4em] text-emerald-deep/80">Smart reyting</p>
                    <h2 className="mt-2 font-display text-3xl text-emerald-deep">Barcha dachalar</h2>
                  </div>
                  <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
                    {ranked.map((d: any) => renderCard(d))}
                  </div>
                </div>
              ) : null}

            </div>
          )}
        </div>
      </section>


      <SiteFooter />

      <HotelDetailsModal
        hotelId={modalHotel?.id ?? null}
        slug={modalHotel?.slug ?? null}
        open={!!modalHotel}
        onOpenChange={(o) => { if (!o) setModalHotel(null); }}
      />
    </div>
  );
}
