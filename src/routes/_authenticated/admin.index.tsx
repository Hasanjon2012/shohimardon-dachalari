import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/DashboardShell";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { MAX_HOTELS_PER_ADMIN } from "@/lib/compress-image";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

const NAV = [
  { to: "/admin" as const, label: "Mening dachalarim" },
  { to: "/admin/hotels/new" as const, label: "Yangi dacha" },
  { to: "/admin/bookings" as const, label: "Bronlar" },
  { to: "/admin/settings" as const, label: "Sozlamalar" },
];

function AdminHome() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: hotels = [] } = useQuery({
    queryKey: ["my-hotels", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("hotels")
        .select("id, name, location, price_per_night, cover_image, published, created_at")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hotels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("O'chirildi");
      qc.invalidateQueries({ queryKey: ["my-hotels"] });
    },
    onError: (e: Error) => toast.error(friendlyError(e)),
  });

  const canAddHotel = hotels.length < MAX_HOTELS_PER_ADMIN;

  return (
    <DashboardShell title="Dacha Admin" nav={NAV}>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl text-emerald-deep">Mening dachalarim</h2>
        {canAddHotel ? (
          <Link to="/admin/hotels/new" className="rounded-full bg-emerald-deep px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-cream hover:bg-gold hover:text-emerald-deep">
            + Yangi dacha
          </Link>
        ) : null}
      </div>

      {!canAddHotel ? (
        <p className="mt-4 rounded-xl border border-dashed border-emerald-deep/30 bg-cream p-4 text-sm text-emerald-deep/80">
          Siz {MAX_HOTELS_PER_ADMIN} ta dacha qo'shgansiz — bu limit. Yangi dacha qo'shish uchun mavjudini o'chiring.
        </p>
      ) : null}

      <div className="mt-6 rounded-2xl bg-gradient-to-r from-emerald-deep/5 to-gold/10 p-6 shadow-sm border border-emerald-deep/10">
        <p className="text-emerald-deep font-medium leading-relaxed">
          🌟 <span className="font-semibold">Xush kelibsiz!</span> Dachangizni mehmonlarga yanada jozibador ko'rsatish uchun xonalarni qo'shish, suratlar joylashtirish va batafsil ma'lumot kiritishni unutmang. Buning uchun quyidagi dachangizdagi <span className="font-bold">«Tahrirlash»</span> tugmasini bosing — va mehmonlaringizga eng yaxshi tajribani taqdim eting!
        </p>
      </div>

      {hotels.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-white p-10 text-center text-muted-foreground shadow-card-luxe">
          Hali dacha qo'shmagansiz.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {hotels.map((h: any) => (
            <div key={h.id} className="overflow-hidden rounded-2xl bg-white shadow-card-luxe">
              {h.cover_image ? <img src={h.cover_image} alt="" className="h-40 w-full object-cover" /> : <div className="h-40 bg-emerald-tint" />}
              <div className="p-5">
                <h3 className="font-display text-xl text-emerald-deep">{h.name}</h3>
                <p className="text-sm text-muted-foreground">{h.location}</p>
                <p className="mt-2 text-sm font-medium text-emerald-deep">{Number(h.price_per_night).toLocaleString()} so'm/kecha</p>
                <div className="mt-4 flex gap-2">
                  <Link to="/admin/hotels/$id" params={{ id: h.id }} className="flex-1 rounded-full bg-emerald-deep px-4 py-2 text-center text-xs uppercase tracking-wider text-cream hover:bg-gold hover:text-emerald-deep">
                    Tahrirlash
                  </Link>
                  <button
                    onClick={() => { if (confirm("O'chirilsinmi?")) del.mutate(h.id); }}
                    className="rounded-full border border-red-600 px-4 py-2 text-xs uppercase tracking-wider text-red-600 hover:bg-red-600 hover:text-white"
                  >
                    O'chirish
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
