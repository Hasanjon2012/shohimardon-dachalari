import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/DashboardShell";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { compressImage, MAX_ROOMS_PER_HOTEL, MAX_IMAGES_PER_ROOM } from "@/lib/compress-image";

export const Route = createFileRoute("/_authenticated/admin/hotels/$id")({
  component: EditHotelPage,
});

const NAV = [
  { to: "/admin" as const, label: "Mening dachalarim" },
  { to: "/admin/hotels/new" as const, label: "Yangi dacha" },
  { to: "/admin/bookings" as const, label: "Bronlar" },
  { to: "/admin/settings" as const, label: "Sozlamalar" },
];

function EditHotelPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: hotel, isLoading } = useQuery({
    queryKey: ["hotel-edit", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotels")
        .select("id, owner_id, name, slug, description, location, price_per_night, rating, cover_image, published, lat, lng, deposit_percent, amenities")
        .eq("id", id)
        .single();
      if (error) throw error;
      const { data: phone } = await supabase.rpc("hotel_phone", { _hotel_id: id });
      return { ...data, phone: phone ?? "" };
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["hotel-rooms-edit", id],
    queryFn: async () => {
      const { data: rs } = await supabase.from("rooms").select("*").eq("hotel_id", id).order("price");
      const list = rs ?? [];
      const ids = list.map((r: any) => r.id);
      let imgs: any[] = [];
      if (ids.length) {
        const { data: imgRes } = await supabase.from("room_images").select("*").in("room_id", ids);
        imgs = imgRes ?? [];
      }
      return list.map((r: any) => ({
        ...r,
        images: imgs.filter((i) => i.room_id === r.id),
        videos: [],
      }));
    },
  });

  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (hotel) setForm(hotel); }, [hotel]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("hotels").update({
        name: form.name, location: form.location, description: form.description,
        price_per_night: Number(form.price_per_night), phone: form.phone,
        amenities: typeof form.amenities === "string" ? form.amenities.split(",").map((s: string) => s.trim()) : form.amenities,
        cover_image: form.cover_image, published: form.published,
        deposit_percent: Math.min(50, Math.max(10, Number(form.deposit_percent) || 25)),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saqlandi"); qc.invalidateQueries({ queryKey: ["hotel-edit"] }); },
    onError: (e: Error) => toast.error(friendlyError(e)),
  });

  // New room state — image is mandatory
  const [newRoom, setNewRoom] = useState({ name: "", price: "", capacity: "", description: "" });
  const [newRoomFile, setNewRoomFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);

  const addRoom = async () => {
    if (rooms.length >= MAX_ROOMS_PER_HOTEL) return toast.error(`${MAX_ROOMS_PER_HOTEL} tadan ko'p xona qo'shib bo'lmaydi`);
    if (!newRoom.name.trim()) return toast.error("Xona nomini kiriting");
    if (!newRoom.price) return toast.error("Narxini kiriting");
    if (!newRoomFile) return toast.error("Kamida 1 ta rasm yuklang");
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(newRoomFile.type)) return toast.error("Faqat rasm fayllar (JPG, PNG, WEBP, GIF)");
    setAdding(true);
    const { data: room, error } = await supabase.from("rooms").insert({
      hotel_id: id, name: newRoom.name.trim(), price: Number(newRoom.price) || 0,
      capacity: Number(newRoom.capacity) || 2, description: newRoom.description,
    }).select().single();
    if (error) { setAdding(false); toast.error(friendlyError(error)); return; }

    const compressed = await compressImage(newRoomFile).catch(() => newRoomFile);
    const path = `${user!.id}/${id}/rooms/${room.id}/${Date.now()}-${compressed.name}`;
    const { error: upErr } = await supabase.storage.from("hotel-images").upload(path, compressed);
    if (upErr) {
      await supabase.from("rooms").delete().eq("id", room.id);
      setAdding(false);
      toast.error(friendlyError(upErr));
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("hotel-images").getPublicUrl(path);
    const { error: imgErr } = await supabase.from("room_images").insert({
      room_id: room.id, hotel_id: id, url: publicUrl, sort_order: 0,
    });
    if (imgErr) { setAdding(false); toast.error(friendlyError(imgErr)); return; }

    setNewRoom({ name: "", price: "", capacity: "", description: "" });
    setNewRoomFile(null);
    setAdding(false);
    toast.success("Xona qo'shildi");
    qc.invalidateQueries({ queryKey: ["hotel-rooms-edit"] });
  };

  const delRoom = async (rid: string) => {
    await supabase.from("room_images").delete().eq("room_id", rid);
    await supabase.from("rooms").delete().eq("id", rid);
    qc.invalidateQueries({ queryKey: ["hotel-rooms-edit"] });
  };

  const uploadRoomImage = async (room: any, file: File) => {
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(file.type)) { toast.error("Faqat rasm fayllar (JPG, PNG, WEBP, GIF)"); return; }
    if ((room.images?.length ?? 0) >= MAX_IMAGES_PER_ROOM) { toast.error(`Bir xonaga ${MAX_IMAGES_PER_ROOM} tadan ko'p rasm yuklab bo'lmaydi`); return; }
    const compressed = await compressImage(file).catch(() => file);
    const path = `${user!.id}/${id}/rooms/${room.id}/${Date.now()}-${compressed.name}`;
    const { error: upErr } = await supabase.storage.from("hotel-images").upload(path, compressed);
    if (upErr) { toast.error(friendlyError(upErr)); return; }
    const { data: { publicUrl } } = supabase.storage.from("hotel-images").getPublicUrl(path);
    const { error } = await supabase.from("room_images").insert({
      room_id: room.id, hotel_id: id, url: publicUrl, sort_order: room.images.length,
    });
    if (error) { toast.error(friendlyError(error)); return; }
    qc.invalidateQueries({ queryKey: ["hotel-rooms-edit"] });
  };

  const delRoomImage = async (imgId: string) => {
    await supabase.from("room_images").delete().eq("id", imgId);
    qc.invalidateQueries({ queryKey: ["hotel-rooms-edit"] });
  };

  if (isLoading || !form) return <DashboardShell title="Dacha Admin" nav={NAV}><p>Yuklanmoqda...</p></DashboardShell>;

  return (
    <DashboardShell title="Dacha Admin" nav={NAV}>
      <h2 className="font-display text-3xl text-emerald-deep">Hotel tahrirlash</h2>

      {/* Hotel info */}
      <section className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-card-luxe">
        <Field label="Nom" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Joylashuv" value={form.location ?? ""} onChange={(v) => setForm({ ...form, location: v })} />
        <div>
          <label className="text-xs uppercase tracking-wider text-emerald-deep/70">Tavsif</label>
          <textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="mt-1 w-full rounded-xl border border-border bg-cream px-4 py-3 outline-none focus:border-gold" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Narx" value={String(form.price_per_night)} onChange={(v) => setForm({ ...form, price_per_night: v })} type="number" />
          <Field label="Telefon" value={form.phone ?? ""} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="Depozit % (10-50)" value={String(form.deposit_percent ?? 25)} onChange={(v) => setForm({ ...form, deposit_percent: v })} type="number" />
        </div>
        <Field label="Qulayliklar (vergul bilan)" value={Array.isArray(form.amenities) ? form.amenities.join(", ") : form.amenities ?? ""} onChange={(v) => setForm({ ...form, amenities: v })} />
        <div>
          <label className="text-xs uppercase tracking-wider text-emerald-deep/70">Asosiy rasm</label>
          {form.cover_image ? (
            <div className="mt-2 flex items-center gap-3">
              <img src={form.cover_image} alt="" className="h-24 w-36 rounded-lg object-cover" />
              <button type="button" onClick={() => setForm({ ...form, cover_image: "" })} className="cursor-pointer text-xs text-red-600 hover:underline">O'chirish</button>
            </div>
          ) : null}
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
              if (!ALLOWED.includes(file.type)) { toast.error("Faqat rasm fayllar (JPG, PNG, WEBP, GIF)"); return; }
              const compressed = await compressImage(file).catch(() => file);
              const path = `${user!.id}/${id}/cover/${Date.now()}-${compressed.name}`;
              const { error: upErr } = await supabase.storage.from("hotel-images").upload(path, compressed);
              if (upErr) { toast.error(friendlyError(upErr)); return; }
              const { data: { publicUrl } } = supabase.storage.from("hotel-images").getPublicUrl(path);
              const { error: updErr } = await supabase.from("hotels").update({ cover_image: publicUrl }).eq("id", id);
              if (updErr) { toast.error(friendlyError(updErr)); return; }
              setForm({ ...form, cover_image: publicUrl });
              toast.success("Asosiy rasm yangilandi");
              qc.invalidateQueries({ queryKey: ["hotel-edit"] });
            }}
            className="mt-2 block w-full cursor-pointer rounded-xl border border-border bg-cream px-3 py-2 text-xs outline-none file:cursor-pointer focus:border-gold"
          />
          <Field label="yoki rasm URL" value={form.cover_image ?? ""} onChange={(v) => setForm({ ...form, cover_image: v })} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
          Saytda ko'rsatilsin
        </label>
        <button onClick={() => save.mutate()} className="rounded-full bg-emerald-deep px-6 py-2.5 text-xs uppercase tracking-[0.25em] text-cream hover:bg-gold hover:text-emerald-deep">
          Saqlash
        </button>
      </section>

      {/* Rooms */}
      <section className="mt-6 rounded-2xl bg-white p-6 shadow-card-luxe">
        <h3 className="font-display text-xl text-emerald-deep">Xonalar</h3>

        <div className="mt-4 space-y-4">
          {rooms.map((r: any) => (
            <div key={r.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-emerald-deep">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.capacity} kishi · {Number(r.price).toLocaleString()} so'm</div>
                  {r.description ? <div className="mt-1 text-xs text-muted-foreground">{r.description}</div> : null}
                </div>
                <button onClick={() => delRoom(r.id)} className="cursor-pointer text-xs text-red-600 hover:underline">O'chirish</button>
              </div>

              <div className="mt-3">
                <label className="text-[11px] uppercase tracking-wider text-emerald-deep/70">Xona rasmlari</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadRoomImage(r, f); e.target.value = ""; }}
                  className="mt-1 block w-full cursor-pointer rounded-xl border border-border bg-cream px-3 py-2 text-xs outline-none file:cursor-pointer focus:border-gold"
                />
                {r.images.length > 0 ? (
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {r.images.map((img: any) => (
                      <div key={img.id} className="relative">
                        <img src={img.url} alt="" className="h-32 w-full rounded-lg bg-cream object-contain" />
                        <button onClick={() => delRoomImage(img.id)} className="absolute right-1 top-1 cursor-pointer rounded-full bg-red-600 px-1.5 text-xs text-white">×</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-red-600">⚠ Bu xonada rasm yo'q</p>
                )}
              </div>

            </div>
          ))}
        </div>

        {/* Add new room — hidden when limit reached */}
        {rooms.length >= MAX_ROOMS_PER_HOTEL ? (
          <p className="mt-5 rounded-xl border border-dashed border-emerald-deep/30 p-4 text-center text-sm text-emerald-deep/70">
            Maksimal {MAX_ROOMS_PER_HOTEL} ta xona qo'shilgan. Yangi xona qo'shish uchun mavjudlaridan birini o'chiring.
          </p>
        ) : (
        <div className="mt-5 rounded-xl border border-dashed border-emerald-deep/30 p-4">
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Xona nomi (masalan: Lyuks)" value={newRoom.name} onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })} className="rounded-xl border border-border bg-cream px-3 py-2 text-sm" />
            <input placeholder="Narx (10000 = 10 ming so'm)" type="number" value={newRoom.price} onChange={(e) => setNewRoom({ ...newRoom, price: e.target.value })} className="rounded-xl border border-border bg-cream px-3 py-2 text-sm" />
            <input placeholder="Sig'im (kishi soni)" type="number" value={newRoom.capacity} onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value })} className="rounded-xl border border-border bg-cream px-3 py-2 text-sm" />
            <input placeholder="Tavsif (ixtiyoriy)" value={newRoom.description} onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })} className="rounded-xl border border-border bg-cream px-3 py-2 text-sm" />
          </div>
          <div className="mt-3">
            <label className="text-[11px] uppercase tracking-wider text-emerald-deep/70">Xona rasmi (majburiy)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setNewRoomFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full cursor-pointer rounded-xl border border-border bg-cream px-3 py-2 text-xs outline-none file:cursor-pointer focus:border-gold"
            />
            {newRoomFile ? <p className="mt-1 text-[11px] text-emerald-deep/80">✓ {newRoomFile.name}</p> : null}
          </div>
          <button type="button" disabled={adding} onClick={addRoom} className="mt-3 rounded-full bg-emerald-deep px-5 py-2 text-xs uppercase tracking-wider text-cream hover:bg-gold hover:text-emerald-deep disabled:opacity-50">
            {adding ? "Qo'shilmoqda..." : "+ Xona qo'shish"}
          </button>
        </div>
        )}
      </section>
    </DashboardShell>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-emerald-deep/70">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-cream px-4 py-3 outline-none focus:border-gold" />
    </div>
  );
}
