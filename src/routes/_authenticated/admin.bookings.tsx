import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/DashboardShell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/bookings")({
  component: AdminBookings,
});

const NAV = [
  { to: "/admin" as const, label: "Mening dachalarim" },
  { to: "/admin/hotels/new" as const, label: "Yangi dacha" },
  { to: "/admin/bookings" as const, label: "Bronlar" },
  { to: "/admin/settings" as const, label: "Sozlamalar" },
];

function AdminBookings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: bookings = [] } = useQuery({
    queryKey: ["admin-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("hotel_owner_bookings");
      if (error) throw error;
      return (data ?? []).map((b: any) => ({
        ...b,
        hotels: { name: b.hotel_name, slug: b.hotel_slug },
        rooms: b.room_name ? { name: b.room_name } : null,
      }));
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pending" | "confirmed" | "cancelled" }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Yangilandi"); qc.invalidateQueries({ queryKey: ["admin-bookings"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Xatolik"),
  });

  const noShow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("mark_booking_no_show", { _booking_id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("No-show belgilandi va o'chirildi"); qc.invalidateQueries({ queryKey: ["admin-bookings"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Xatolik"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("O'chirildi"); qc.invalidateQueries({ queryKey: ["admin-bookings"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Xatolik"),
  });

  const statusLabel: Record<string, string> = {
    pending: "Kutilmoqda", pending_payment: "To'lov kutilmoqda", confirmed: "Tasdiqlandi",
    cancelled: "Bekor qilingan", no_show: "Kelmagan",
  };
  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    pending_payment: "bg-amber-100 text-amber-800",
    confirmed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    no_show: "bg-zinc-200 text-zinc-800",
  };

  return (
    <DashboardShell title="Dacha Admin" nav={NAV}>
      <h2 className="font-display text-3xl text-emerald-deep">Bronlar</h2>
      <div className="mt-6 space-y-3">
        {bookings.length === 0 ? <p className="text-muted-foreground">Bronlar yo'q.</p> : null}
        {bookings.map((b: any) => {
          const checkInPast = new Date(b.check_in) <= new Date();
          return (
          <div key={b.id} className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-card-luxe">
            <div>
              <div className="font-display text-lg text-emerald-deep">{b.hotels?.name}</div>
              {b.rooms?.name ? (
                <div className="text-sm font-medium text-emerald-deep/80">Xona: {b.rooms.name}</div>
              ) : null}
              <div className="text-sm text-muted-foreground">{b.payment_status === "paid" ? `${b.guest_name ?? "—"} · ${b.guest_phone ?? "—"}` : "Mehmon ma'lumotlari to'lovdan keyin ko'rinadi"}</div>
              <div className="text-sm">{b.check_in} → {b.check_out} · {b.guests} mehmon · {Number(b.total_price).toLocaleString()} so'm</div>
              <div className="text-xs text-emerald-deep/80">
                Depozit ({b.deposit_percent}%): {Number(b.deposit_amount).toLocaleString()} so'm ·
                To'lov: <b>{b.payment_status}</b>{b.payment_method ? ` (${b.payment_method})` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs ${statusColor[b.status] ?? "bg-muted"}`}>{statusLabel[b.status] ?? b.status}</span>
              {b.status === "pending" || b.status === "pending_payment" ? (
                <>
                  <button onClick={() => update.mutate({ id: b.id, status: "confirmed" })} className="rounded-full bg-emerald-deep px-4 py-1.5 text-xs uppercase tracking-wider text-cream hover:bg-gold hover:text-emerald-deep">Tasdiqlash</button>
                  <button onClick={() => update.mutate({ id: b.id, status: "cancelled" })} className="rounded-full border border-red-600 px-4 py-1.5 text-xs uppercase tracking-wider text-red-600 hover:bg-red-600 hover:text-white">Bekor</button>
                </>
              ) : null}
              {b.status === "confirmed" && checkInPast ? (
                <button onClick={() => { if (confirm("User kelmaganini tasdiqlaysizmi? Depozit qaytarilmaydi.")) noShow.mutate(b.id); }} className="rounded-full border border-zinc-600 px-4 py-1.5 text-xs uppercase tracking-wider text-zinc-700 hover:bg-zinc-700 hover:text-white">No-show</button>
              ) : null}
              {b.status === "cancelled" ? (
                <button onClick={() => { if (confirm("Bronni o'chirishga ishonchingiz komilmi?")) del.mutate(b.id); }} className="rounded-full border border-red-600 px-4 py-1.5 text-xs uppercase tracking-wider text-red-600 hover:bg-red-600 hover:text-white">O'chirish</button>
              ) : null}
            </div>
          </div>
        );})}
      </div>
    </DashboardShell>
  );
}
