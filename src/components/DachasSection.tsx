import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HotelDetailsModal } from "@/components/HotelDetailsModal";
import { trackPhoneClick } from "@/lib/track-hotel";

type HotelRow = {
  id: string;
  slug: string;
  name: string;
  location: string | null;
  price_per_night: number;
  rating: number | null;
  cover_image: string | null;
  phone?: string | null;
  avg_rating?: number | null;
};

export function DachasSection() {
  const [modalHotel, setModalHotel] = useState<{ id: string; slug: string } | null>(null);
  const { data: hotels = [], isLoading } = useQuery({
    queryKey: ["hotels-featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotels")
        .select("id, slug, name, location, price_per_night, rating, cover_image, manual_order, contact_clicks")
        .eq("published", true)
        .order("manual_order", { ascending: true, nullsFirst: false })
        .order("contact_clicks", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      const list = (data ?? []) as unknown as HotelRow[];
      const ids = list.map((h) => h.id);
      if (ids.length === 0) return list.map((h) => ({ ...h, min_room_price: null as number | null }));
      const [{ data: rooms }, { data: reviews }] = await Promise.all([
        supabase.from("rooms").select("hotel_id, price").in("hotel_id", ids),
        supabase.from("reviews").select("hotel_id, rating").in("hotel_id", ids),
      ]);
      const minMap = new Map<string, number>();
      (rooms ?? []).forEach((r: any) => {
        const cur = minMap.get(r.hotel_id);
        const p = Number(r.price);
        if (cur === undefined || p < cur) minMap.set(r.hotel_id, p);
      });
      const sumMap = new Map<string, number>();
      const countMap = new Map<string, number>();
      (reviews ?? []).forEach((r: any) => {
        const hid = r.hotel_id as string;
        sumMap.set(hid, (sumMap.get(hid) ?? 0) + Number(r.rating));
        countMap.set(hid, (countMap.get(hid) ?? 0) + 1);
      });
      const avgMap = new Map<string, number>();
      sumMap.forEach((sum, hid) => {
        avgMap.set(hid, sum / countMap.get(hid)!);
      });
      return list.map((h) => ({
        ...h,
        min_room_price: minMap.get(h.id) ?? null,
        avg_rating: avgMap.get(h.id) ?? null,
      }));
    },
  });

  return (
    <section id="dachas" className="bg-background py-28 lg:py-40">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-col items-end justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.5em] text-emerald-deep/80">
              Tanlangan dachalar
            </p>
            <h2 className="mt-6 font-display text-4xl leading-[1.2] md:text-6xl text-emerald-deep">
              Eng go'zal joylar,
              <br />
              <span className="italic text-gradient-gold inline-block pb-2">eng yodda qoladigan tunlar</span>
            </h2>
          </div>
          <Link
            to="/hotels"
            className="group inline-flex items-center gap-3 text-sm uppercase tracking-[0.25em] text-emerald-deep"
          >
            Barcha dachalar
            <span className="transition-transform group-hover:translate-x-2">→</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-96 animate-pulse rounded-3xl bg-white shadow-card-luxe" />
            ))}
          </div>
        ) : hotels.length === 0 ? (
          <div className="mt-16 rounded-3xl bg-white p-16 text-center shadow-card-luxe">
            <p className="font-display text-2xl text-emerald-deep">Hozircha dachalar yo'q</p>
            <p className="mt-3 text-muted-foreground">
              Tez orada dacha egalari o'z dachalarini qo'shadi.
            </p>
          </div>
        ) : (
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {hotels.map((d, i) => (
              <article
                key={d.id}
                className="group hover-lift overflow-hidden rounded-3xl bg-white shadow-card-luxe"
              >
                <button
                  type="button"
                  onClick={() => setModalHotel({ id: d.id, slug: d.slug })}
                  className="block w-full text-left"
                >
                  <div className="relative h-80 overflow-hidden bg-emerald-tint">
                    {d.cover_image ? (
                      <img
                        src={d.cover_image}
                        alt={d.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-[2000ms] group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-emerald-deep/60">
                        <span className="font-display text-4xl">{d.name[0]}</span>
                      </div>
                    )}
                    {d.avg_rating != null ? (
                      <div className="absolute right-4 top-4 rounded-full bg-emerald-deep/90 px-3 py-1 text-xs font-medium text-gold shadow-lg ring-1 ring-gold/30 backdrop-blur-sm">
                        ★ {d.avg_rating.toFixed(1)}
                      </div>
                    ) : d.rating ? (
                      <div className="absolute right-4 top-4 rounded-full bg-emerald-deep/90 px-3 py-1 text-xs font-medium text-gold shadow-lg ring-1 ring-gold/30 backdrop-blur-sm">
                        ★ {d.rating}
                      </div>
                    ) : null}
                    {i === 1 && (
                      <div className="absolute left-4 top-4 rounded-full bg-gold px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-deep">
                        Premium
                      </div>
                    )}
                  </div>
                </button>
                <div className="p-7">
                  <button
                    type="button"
                    onClick={() => setModalHotel({ id: d.id, slug: d.slug })}
                    className="text-left"
                  >
                    <h3 className="font-display text-2xl text-emerald-deep transition-colors hover:text-gold">
                      {d.name}
                    </h3>
                  </button>
                  <p className="mt-1 text-sm text-muted-foreground">{d.location ?? ""}</p>
                  <div className="mt-6 flex items-center justify-between">
                    {(d as any).min_room_price !== null ? (
                      <span className="text-sm font-medium text-emerald-deep">
                        {Number((d as any).min_room_price).toLocaleString()} so'm / kecha
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Narx ko'rsatilmagan</span>
                    )}
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          void trackPhoneClick(d.id);
                          setModalHotel({ id: d.id, slug: d.slug });
                        }}
                        className="text-xs uppercase tracking-[0.2em] text-emerald-deep transition-colors hover:text-gold cursor-pointer"
                      >
                        Aloqa →
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalHotel({ id: d.id, slug: d.slug })}
                        className="text-xs uppercase tracking-[0.2em] text-gold transition-colors hover:text-emerald-deep"
                      >
                        Batafsil →
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <HotelDetailsModal
        hotelId={modalHotel?.id ?? null}
        slug={modalHotel?.slug ?? null}
        open={!!modalHotel}
        onOpenChange={(o) => { if (!o) setModalHotel(null); }}
      />
    </section>
  );
}
