import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/DashboardShell";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/profile/bookings")({
  component: BookingsPage,
});

const NAV = [
  { to: "/profile/bookings" as const, label: "Bronlarim" },
  { to: "/profile/favorites" as const, label: "Sevimlilar" },
  { to: "/profile/settings" as const, label: "Sozlamalar" },
];

function BookingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, hotels(name, slug, location, cover_image), rooms!bookings_room_id_fkey(name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const cancel = useMutation({
    mutationFn: async (b: any) => {
      const days = Math.floor((new Date(b.check_in).getTime() - Date.now()) / 86400000);
      const refundMsg =
        b.payment_status === "paid" && days >= 3
          ? "Depozit qaytariladi (3+ kun qoldi)."
          : b.payment_status === "paid"
          ? "Depozit qaytarilmaydi (3 kundan kam qoldi)."
          : "To'lov qilinmagan, qaytariladigan summa yo'q.";
      if (!confirm(`Bekor qilishni tasdiqlaysizmi?\n${refundMsg}`)) throw new Error("__cancelled__");
      const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", b.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bron bekor qilindi");
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: (e: Error) => { if (e.message !== "__cancelled__") toast.error(friendlyError(e)); },
  });

  return (
    <DashboardShell title="Profil" nav={NAV}>
      <h2 className="font-display text-3xl text-emerald-deep">Bronlarim</h2>

      {isLoading ? (
        <p className="mt-6 text-muted-foreground">Yuklanmoqda...</p>
      ) : bookings.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white p-10 text-center shadow-card-luxe">
          <p className="text-muted-foreground">Hali bronlaringiz yo'q.</p>
          <Link to="/hotels" className="mt-4 inline-block rounded-full bg-emerald-deep px-6 py-2.5 text-xs uppercase tracking-[0.2em] text-cream hover:bg-gold hover:text-emerald-deep">
            Mehmonxonalarni ko'rish
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {bookings.map((b: any) => (
            <div key={b.id} className="flex gap-4 rounded-2xl bg-white p-5 shadow-card-luxe">
              {b.hotels?.cover_image ? (
                <img src={b.hotels.cover_image} alt="" className="h-24 w-32 rounded-xl object-cover" />
              ) : (
                <div className="h-24 w-32 rounded-xl bg-emerald-tint" />
              )}
              <div className="flex-1">
                <Link to="/hotels/$slug" params={{ slug: b.hotels?.slug ?? "" }} className="font-display text-lg text-emerald-deep hover:text-gold">
                  {b.hotels?.name}
                </Link>
                <p className="text-sm text-muted-foreground">{b.hotels?.location}</p>
                {b.rooms?.name ? (
                  <p className="text-sm font-medium text-emerald-deep/80">Xona: {b.rooms.name}</p>
                ) : null}
                <p className="mt-1 text-sm">{b.check_in} → {b.check_out} · {b.guests} mehmon</p>
                <p className="text-sm text-emerald-deep">
                  Umumiy: {Number(b.total_price).toLocaleString()} so'm
                  {" · "}
                  Depozit: <b>{Number(b.deposit_amount).toLocaleString()} so'm</b>
                </p>
                {b.refund_eligible ? (
                  <p className="mt-1 text-xs text-green-700">✓ Depozit qaytarilishi belgilangan</p>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={b.status} />
                {b.status === "pending_payment" ? (
                  <Link
                    to="/booking/$id/pay"
                    params={{ id: b.id }}
                    className="rounded-full bg-gold px-4 py-1.5 text-xs uppercase tracking-wider text-emerald-deep hover:bg-emerald-deep hover:text-cream"
                  >
                    To'lov qilish →
                  </Link>
                ) : null}
                {b.status !== "cancelled" && b.status !== "no_show" ? (
                  <button onClick={() => cancel.mutate(b)} className="text-xs uppercase tracking-wider text-red-600 hover:underline">
                    Bekor qilish
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    pending_payment: "bg-amber-100 text-amber-800",
    confirmed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    no_show: "bg-zinc-200 text-zinc-800",
  };
  const lbl: Record<string, string> = {
    pending: "Kutilmoqda",
    pending_payment: "To'lov kutilmoqda",
    confirmed: "Tasdiqlandi",
    cancelled: "Bekor qilindi",
    no_show: "Kelmagan",
  };
  return <span className={`rounded-full px-3 py-1 text-xs ${map[status] ?? "bg-muted"}`}>{lbl[status] ?? status}</span>;
}
