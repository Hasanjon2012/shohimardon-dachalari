import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/DashboardShell";
import { OWNER_NAV } from "./owner";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/owner/bookings")({ component: OwnerBookings });

function OwnerBookings() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["all-bookings"],
    queryFn: async () => {
      const { data } = await supabase.from("bookings").select("*, hotels(name), rooms!bookings_room_id_fkey(name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("bookings").delete().eq("id", id); },
    onSuccess: () => { toast.success("O'chirildi"); qc.invalidateQueries({ queryKey: ["all-bookings"] }); },
  });

  return (
    <DashboardShell title="Super Owner" nav={OWNER_NAV}>
      <h2 className="font-display text-3xl text-emerald-deep">Barcha bronlar</h2>
      <div className="mt-6 space-y-2">
        {data.map((b: any) => (
          <div key={b.id} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-card-luxe">
            <div>
              <div className="font-medium text-emerald-deep">{b.hotels?.name}</div>
              {b.rooms?.name ? <div className="text-xs text-emerald-deep/70">Xona: {b.rooms.name}</div> : null}
              <div className="text-xs text-muted-foreground">{b.guest_name} · {b.check_in} → {b.check_out} · {b.status}</div>
              <div className="text-xs text-emerald-deep/70">
                Depozit: {Number(b.deposit_amount).toLocaleString()} so'm · To'lov: {b.payment_status}
              </div>
            </div>
            <button onClick={() => del.mutate(b.id)} className="text-xs text-red-600 hover:underline">O'chirish</button>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
