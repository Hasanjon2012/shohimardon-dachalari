import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/_authenticated/booking/$id/confirmed")({
  component: ConfirmedPage,
});

function ConfirmedPage() {
  const { id } = Route.useParams();
  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking-confirmed", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, hotels(name, slug, location), rooms!bookings_room_id_fkey(name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      let phone: string | null = null;
      if (data?.hotel_id) {
        const { data: ph } = await supabase.rpc("hotel_phone", { _hotel_id: data.hotel_id });
        phone = (ph as string) ?? null;
      }
      return { ...(data as any), hotels: { ...((data as any).hotels ?? {}), phone } } as any;
    },
  });

  if (isLoading || !booking) return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>;

  return (
    <div className="bg-cream min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-3xl bg-white p-10 text-center shadow-card-luxe">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">✓</div>
          <h1 className="mt-4 font-display text-3xl text-emerald-deep">Bron tasdiqlandi!</h1>
          <p className="mt-2 text-muted-foreground">Depozitingiz qabul qilindi. Mehmonxona sizni kutmoqda.</p>

          <div className="mt-8 grid gap-3 rounded-2xl bg-cream/50 p-6 text-left">
            <Row label="Mehmonxona" value={booking.hotels?.name} />
            {booking.rooms?.name ? <Row label="Xona" value={booking.rooms.name} /> : null}
            <Row label="Sanalar" value={`${booking.check_in} → ${booking.check_out}`} />
            <Row label="Mehmonlar" value={String(booking.guests)} />
            <Row label="Umumiy" value={`${Number(booking.total_price).toLocaleString()} so'm`} />
            <Row label="To'langan depozit" value={`${Number(booking.deposit_amount).toLocaleString()} so'm`} accent />
            <Row label="To'lov usuli" value={(booking.payment_method ?? "").toUpperCase()} />
            {booking.hotels?.phone ? <Row label="Aloqa" value={booking.hotels.phone} /> : null}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Tasdiqnoma sizning Bronlar bo'limingizda saqlangan. Belgilangan kuni kelmasangiz depozit qaytarilmaydi.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Link to="/profile/bookings" className="rounded-full bg-emerald-deep px-6 py-3 text-xs uppercase tracking-wider text-cream hover:bg-gold hover:text-emerald-deep">
              Bronlarim
            </Link>
            <Link to="/hotels" className="rounded-full border border-emerald-deep px-6 py-3 text-xs uppercase tracking-wider text-emerald-deep hover:bg-emerald-deep hover:text-cream">
              Boshqa mehmonxonalar
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent ? "font-display text-gold" : "font-medium text-emerald-deep"}>{value}</span>
    </div>
  );
}
