import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/DashboardShell";

export const Route = createFileRoute("/_authenticated/profile/favorites")({
  component: FavoritesPage,
});

const NAV = [
  { to: "/profile/bookings" as const, label: "Bronlarim" },
  { to: "/profile/favorites" as const, label: "Sevimlilar" },
  { to: "/profile/settings" as const, label: "Sozlamalar" },
];

function FavoritesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: favs = [] } = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("hotel_id, hotels(id, name, slug, location, cover_image, price_per_night, rating)")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const remove = useMutation({
    mutationFn: async (hotelId: string) => {
      await supabase.from("favorites").delete().eq("user_id", user!.id).eq("hotel_id", hotelId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });

  return (
    <DashboardShell title="Profil" nav={NAV}>
      <h2 className="font-display text-3xl text-emerald-deep">Sevimli mehmonxonalar</h2>

      {favs.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Sevimlilar yo'q.</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {favs.map((f: any) => (
            <div key={f.hotel_id} className="overflow-hidden rounded-2xl bg-white shadow-card-luxe">
              {f.hotels?.cover_image ? (
                <img src={f.hotels.cover_image} alt="" className="h-40 w-full object-cover" />
              ) : null}
              <div className="p-5">
                <Link to="/hotels/$slug" params={{ slug: f.hotels?.slug }} className="font-display text-lg text-emerald-deep hover:text-gold">
                  {f.hotels?.name}
                </Link>
                <p className="text-sm text-muted-foreground">{f.hotels?.location}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-emerald-deep">{Number(f.hotels?.price_per_night).toLocaleString()} so'm</span>
                  <button onClick={() => remove.mutate(f.hotel_id)} className="text-xs text-red-600 hover:underline">
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
