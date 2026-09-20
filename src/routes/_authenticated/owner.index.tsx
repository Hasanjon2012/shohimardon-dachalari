import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/DashboardShell";
import { OWNER_NAV } from "./owner";

export const Route = createFileRoute("/_authenticated/owner/")({
  component: OwnerHome,
});

function OwnerHome() {
  const { data: stats } = useQuery({
    queryKey: ["owner-stats"],
    queryFn: async () => {
      const [{ count: hotels }, { count: bookings }, { data: revData }, { data: popular }, { data: hotelsData }] = await Promise.all([
        supabase.from("hotels").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("total_price").eq("status", "confirmed"),
        supabase.from("bookings").select("hotel_id, hotels(name, owner_id)").limit(1000),
        supabase.from("hotels").select("id, name, owner_id, contact_clicks"),
      ]);
      const revenue = (revData ?? []).reduce((s: number, r: any) => s + Number(r.total_price), 0);
      const totalContacts = (hotelsData ?? []).reduce((s: number, h: any) => s + (h.contact_clicks ?? 0), 0);

      const ownerIds = Array.from(new Set([
        ...((hotelsData ?? []).map((h: any) => h.owner_id)),
        ...((popular ?? []).map((b: any) => b.hotels?.owner_id)),
      ].filter(Boolean))) as string[];
      const profMap = new Map<string, string>();
      if (ownerIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ownerIds);
        (profs ?? []).forEach((p: any) => profMap.set(p.id, (p.full_name ?? "").trim() || "Noma'lum"));
      }

      const counts: Record<string, { name: string; owner: string; n: number }> = {};
      (popular ?? []).forEach((b: any) => {
        const k = b.hotel_id; if (!k) return;
        counts[k] = counts[k] ?? { name: b.hotels?.name ?? "?", owner: profMap.get(b.hotels?.owner_id) ?? "Noma'lum", n: 0 };
        counts[k].n++;
      });
      const top = Object.values(counts).sort((a, b) => b.n - a.n).slice(0, 5);
      const topContacts = (hotelsData ?? [])
        .map((h: any) => ({ name: h.name ?? "?", owner: profMap.get(h.owner_id) ?? "Noma'lum", n: h.contact_clicks ?? 0 }))
        .sort((a: any, b: any) => b.n - a.n)
        .slice(0, 5);
      return { hotels: hotels ?? 0, bookings: bookings ?? 0, revenue, totalContacts, top, topContacts };
    },
  });

  return (
    <DashboardShell title="Super Owner" nav={OWNER_NAV}>
      <h2 className="font-display text-3xl text-emerald-deep">Statistika</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Stat label="Dachalar" value={stats?.hotels ?? 0} />
        <Stat label="Jami bronlar" value={stats?.bookings ?? 0} />
        <Stat label="Daromad (so'm)" value={(stats?.revenue ?? 0).toLocaleString()} />
        <Stat label="Jami aloqa" value={stats?.totalContacts ?? 0} />
      </div>
      <h3 className="mt-10 font-display text-2xl text-emerald-deep">Eng mashhur dachalar</h3>
      <div className="mt-4 space-y-2">
        {(stats?.top ?? []).map((t, i) => (
          <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-card-luxe">
            <div className="min-w-0">
              <div className="text-emerald-deep">{i + 1}. {t.name}</div>
              <div className="text-xs text-muted-foreground">Egasi: {t.owner}</div>
            </div>
            <span className="text-sm text-muted-foreground whitespace-nowrap">{t.n} bron</span>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-card-luxe">
      <div className="text-xs uppercase tracking-wider text-emerald-deep/80">{label}</div>
      <div className="mt-2 font-display text-3xl text-emerald-deep">{value}</div>
    </div>
  );
}
