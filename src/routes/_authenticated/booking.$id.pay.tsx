import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/booking/$id/pay")({
  component: PayPage,
});

function PayPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState<"click" | "payme">("click");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking-pay", id],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, hotels(name, slug, location, cover_image), rooms!bookings_room_id_fkey(name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bron bekor qilindi");
      navigate({ to: "/profile/bookings" });
    },
  });

  if (isLoading || !booking) {
    return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>;
  }

  if (booking.user_id !== user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <h1 className="font-display text-2xl text-emerald-deep">Ruxsat yo'q</h1>
          <Link to="/profile/bookings" className="mt-4 inline-block underline">Bronlarim</Link>
        </div>
      </div>
    );
  }

  const expiresAt = booking.payment_expires_at ? new Date(booking.payment_expires_at).getTime() : 0;
  const remaining = Math.max(0, expiresAt - now);
  const expired = booking.status === "cancelled" || (booking.status === "pending_payment" && remaining === 0);
  const paid = booking.payment_status === "paid";
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  return (
    <div className="bg-cream min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-3xl bg-white p-8 shadow-card-luxe">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-emerald-tint px-3 py-1 text-xs uppercase tracking-wider text-emerald-deep">Xavfsiz to'lov</span>
            {paid ? (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-800">To'langan</span>
            ) : expired ? (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-800">Muddati o'tgan</span>
            ) : (
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs text-yellow-800">To'lov kutilmoqda</span>
            )}
          </div>

          <h1 className="mt-4 font-display text-3xl text-emerald-deep">{booking.hotels?.name}</h1>
          <p className="text-sm text-muted-foreground">{booking.hotels?.location}</p>

          {/* Booking summary */}
          <div className="mt-6 grid gap-4 rounded-2xl border border-border p-5 sm:grid-cols-2">
            {booking.rooms?.name ? <Info label="Xona" value={booking.rooms.name} /> : null}
            <Info label="Kelish" value={booking.check_in} />
            <Info label="Ketish" value={booking.check_out} />
            <Info label="Mehmonlar" value={String(booking.guests)} />
            <Info label="Umumiy narx" value={`${Number(booking.total_price).toLocaleString()} so'm`} />
            <Info
              label={`Depozit (${booking.deposit_percent}%)`}
              value={`${Number(booking.deposit_amount).toLocaleString()} so'm`}
              accent
            />
          </div>

          {/* Timer */}
          {!paid && !expired ? (
            <div className="mt-6 flex items-center justify-between rounded-2xl bg-emerald-deep/5 p-5">
              <div>
                <div className="text-xs uppercase tracking-wider text-emerald-deep/70">To'lov muddati</div>
                <div className="font-display text-3xl text-emerald-deep">
                  {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                </div>
              </div>
              <p className="max-w-xs text-xs text-muted-foreground">
                Vaqt tugagach bron avtomatik bekor qilinadi va xona yana bo'sh bo'ladi.
              </p>
            </div>
          ) : null}

          {/* Refund policy */}
          <div className="mt-6 rounded-2xl border border-border bg-cream/40 p-5">
            <h3 className="font-display text-sm uppercase tracking-wider text-emerald-deep">Pul qaytarish siyosati</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Kelishdan <b>3 kun va undan oldin</b> bekor qilsangiz — depozit qaytariladi</li>
              <li>• <b>24 soatdan kam</b> qolganda bekor qilsangiz — qaytarilmaydi</li>
              <li>• Belgilangan kuni kelmasangiz (No-show) — pul qaytarilmaydi va trust score pasayadi</li>
            </ul>
          </div>

          {/* Payment methods */}
          {!paid && !expired ? (
            <>
              <div className="mt-6">
                <h3 className="font-display text-sm uppercase tracking-wider text-emerald-deep">To'lov usuli</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <MethodCard active={method === "click"} onClick={() => setMethod("click")} name="Click" tag="UZ tezkor to'lov" color="bg-blue-500" />
                  <MethodCard active={method === "payme"} onClick={() => setMethod("payme")} name="Payme" tag="Karta orqali" color="bg-cyan-500" />
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-yellow-50 p-5 text-sm text-yellow-900">
                🔒 Click/Payme integratsiyasi hali ulangani yo'q. To'lovni tanlangan usulda amalga oshirganingizdan so'ng, dacha egasi qabul qilinganini tasdiqlaydi va bron avtomatik faollashadi.
              </div>

              <button
                onClick={() => cancel.mutate()}
                className="mt-3 w-full rounded-full border border-red-600 py-2.5 text-xs uppercase tracking-wider text-red-600 hover:bg-red-600 hover:text-white"
              >
                Bronni bekor qilish
              </button>
            </>
          ) : null}

          {expired && !paid ? (
            <div className="mt-6 rounded-2xl bg-red-50 p-5 text-sm text-red-800">
              Bu bronning to'lov muddati o'tgan. Iltimos, qaytadan bron qiling.
              <Link to="/hotels/$slug" params={{ slug: booking.hotels?.slug ?? "" }} className="mt-3 block underline">Mehmonxonaga qaytish →</Link>
            </div>
          ) : null}

          {paid ? (
            <Link
              to="/booking/$id/confirmed"
              params={{ id }}
              className="mt-6 block w-full rounded-full bg-emerald-deep py-3 text-center text-xs uppercase tracking-[0.25em] text-cream"
            >
              Tasdiqnomani ko'rish →
            </Link>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Info({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-emerald-deep/80">{label}</div>
      <div className={accent ? "font-display text-xl text-gold" : "text-sm text-emerald-deep"}>{value}</div>
    </div>
  );
}

function MethodCard({ active, onClick, name, tag, color }: { active: boolean; onClick: () => void; name: string; tag: string; color: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${active ? "border-gold bg-gold/5" : "border-border hover:border-emerald-deep/40"}`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color} font-display text-white`}>{name[0]}</div>
      <div>
        <div className="font-medium text-emerald-deep">{name}</div>
        <div className="text-[11px] text-muted-foreground">{tag}</div>
      </div>
    </button>
  );
}
