import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/DashboardShell";
import { OWNER_NAV } from "./owner";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/owner/hotels")({ component: OwnerHotels });

function OwnerHotels() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["all-hotels"],
    queryFn: async () => {
      const { data: hotels } = await supabase
        .from("hotels")
        .select("id, owner_id, name, location, cover_image, published, created_at, manual_order, contact_clicks, view_count, phone_clicks, featured")
        .order("featured", { ascending: false })
        .order("manual_order", { ascending: true, nullsFirst: false })
        .order("phone_clicks", { ascending: false })
        .order("view_count", { ascending: false })
        .order("created_at", { ascending: false });
      const list = hotels ?? [];
      const ownerIds = Array.from(new Set(list.map((h: any) => h.owner_id)));
      if (ownerIds.length === 0) return list;
      const { data: profs } = await supabase.from("profiles").select("id, full_name, phone").in("id", ownerIds);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return list.map((h: any) => ({ ...h, owner: map.get(h.owner_id) }));
    },
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("hotels").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("O'chirildi"); qc.invalidateQueries({ queryKey: ["all-hotels"] }); },
  });
  const setOrder = useMutation({
    mutationFn: async ({ id, order }: { id: string; order: number | null }) => {
      const { error } = await supabase.rpc("set_hotel_manual_order", { _hotel_id: id, _order: order as number });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Tartib saqlandi"); qc.invalidateQueries({ queryKey: ["all-hotels"] }); qc.invalidateQueries({ queryKey: ["hotels-all"] }); qc.invalidateQueries({ queryKey: ["hotels-featured"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const setFeatured = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await supabase.rpc("set_hotel_featured", { _hotel_id: id, _featured: featured });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Tavsiya yangilandi"); qc.invalidateQueries({ queryKey: ["all-hotels"] }); qc.invalidateQueries({ queryKey: ["hotels-all"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const featuredCount = (data as any[]).filter((h) => h.featured).length;

  return (
    <DashboardShell title="Super Owner" nav={OWNER_NAV}>
      <h2 className="font-display text-3xl text-emerald-deep">Barcha dachalar</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        "Tavsiya etilgan" belgilangan dachalar tepada chiqadi (eng ko'pi 5 ta). Qolganlari Smart Score (ko'rishlar + telefon bosishlar × 5) bo'yicha avtomatik tartiblanadi.
      </p>
      <div className="mt-6 space-y-2">
        {data.map((h: any) => (
          <OwnerHotelRow
            key={h.id}
            hotel={h}
            featuredCount={featuredCount}
            onSave={(order) => setOrder.mutate({ id: h.id, order })}
            onToggleFeatured={(v) => setFeatured.mutate({ id: h.id, featured: v })}
            onDelete={() => { if (confirm("O'chirilsinmi?")) del.mutate(h.id); }}
            saving={setOrder.isPending}
          />
        ))}
      </div>
    </DashboardShell>
  );
}


function OwnerHotelRow({ hotel: h, onSave, onToggleFeatured, onDelete, saving, featuredCount }: { hotel: any; onSave: (order: number | null) => void; onToggleFeatured: (v: boolean) => void; onDelete: () => void; saving: boolean; featuredCount: number }) {
  const [val, setVal] = useState<string>(h.manual_order != null ? String(h.manual_order) : "");
  useEffect(() => { setVal(h.manual_order != null ? String(h.manual_order) : ""); }, [h.manual_order]);
  const initial = h.manual_order != null ? String(h.manual_order) : "";
  const dirty = val !== initial;
  const FEATURED_LIMIT = 5;
  const canFeature = h.featured || featuredCount < FEATURED_LIMIT;
  const score = (Number(h.view_count) || 0) + (Number(h.phone_clicks) || 0) * 5;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card-luxe">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="font-display text-lg text-emerald-deep">{h.name}</div>
          {h.featured ? <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-deep">Tavsiya</span> : null}
        </div>
        <div className="text-xs text-muted-foreground">{h.location}</div>
        <div className="mt-1 text-xs text-emerald-deep/80">
          Admin: <span className="font-medium">{h.owner?.full_name?.trim() || "Noma'lum"}</span>
          {h.owner?.phone ? <span className="text-muted-foreground"> · {h.owner.phone}</span> : null}
          <span className="text-muted-foreground"> · Ko'rishlar: {h.view_count ?? 0} · Telefon: {h.phone_clicks ?? 0} · Score: {score}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onToggleFeatured(!h.featured)}
          disabled={!canFeature}
          title={!canFeature ? `Eng ko'pi ${FEATURED_LIMIT} ta tavsiya etilgan dacha bo'lishi mumkin` : ""}
          className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${h.featured ? "bg-gold text-emerald-deep hover:bg-emerald-deep hover:text-cream" : "border border-gold text-emerald-deep hover:bg-gold"}`}
        >
          {h.featured ? "★ Tavsiyada" : "☆ Tavsiya qilish"}
        </button>

        <label className="text-xs uppercase tracking-wider text-emerald-deep/70">Tartib</label>
        <input
          type="number"
          min={1}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="—"
          className="w-20 rounded-lg border border-border bg-cream px-3 py-1.5 text-sm outline-none focus:border-gold"
        />
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => onSave(val === "" ? null : Math.max(1, Number(val)))}
          className="rounded-full bg-emerald-deep px-4 py-1.5 text-xs uppercase tracking-wider text-cream hover:bg-gold hover:text-emerald-deep disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          Saqlash
        </button>
        <button onClick={onDelete} className="rounded-full border border-red-600 px-4 py-1.5 text-xs uppercase tracking-wider text-red-600 hover:bg-red-600 hover:text-white cursor-pointer">O'chirish</button>
      </div>
    </div>
  );
}
