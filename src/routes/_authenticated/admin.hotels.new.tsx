import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/DashboardShell";
import { MapPicker } from "@/components/MapPicker";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { compressImage, MAX_ROOMS_PER_HOTEL, MAX_IMAGES_PER_ROOM, MAX_HOTELS_PER_ADMIN } from "@/lib/compress-image";

export const Route = createFileRoute("/_authenticated/admin/hotels/new")({
  component: NewHotelPage,
});

const NAV = [
  { to: "/admin" as const, label: "Mening dachalarim" },
  { to: "/admin/hotels/new" as const, label: "Yangi dacha" },
  { to: "/admin/bookings" as const, label: "Bronlar" },
  { to: "/admin/settings" as const, label: "Sozlamalar" },
];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 7);
}

type RoomDraft = {
  id: string; // local id
  dbId?: string;
  name: string;
  price: string;
  capacity: string;
  description: string;
  images: { id?: string; url: string }[];
};

function NewHotelPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Step 1 form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  
  const [phone, setPhone] = useState("");
  const [amenities, setAmenities] = useState("");
  const [cover, setCover] = useState("");
  const [uploading, setUploading] = useState(false);

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locLabel, setLocLabel] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [pendingDetected, setPendingDetected] = useState<{ lat: number; lng: number; label: string } | null>(null);

  // Step state
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const finalizeLockRef = useRef(false);

  // Limit check
  const [limitState, setLimitState] = useState<"checking" | "blocked" | "ok">("checking");
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { count } = await supabase
        .from("hotels")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id);
      setLimitState((count ?? 0) >= MAX_HOTELS_PER_ADMIN ? "blocked" : "ok");
    })();
  }, [user]);

  // Rooms
  const [rooms, setRooms] = useState<RoomDraft[]>([]);
  const [newRoom, setNewRoom] = useState({ name: "", price: "", capacity: "", description: "" });
  const [newRoomFiles, setNewRoomFiles] = useState<File[]>([]);

  // ---- Helpers ----
  const reverseGeocode = async (la: number, ln: number) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${ln}&accept-language=uz`);
      const j = await r.json();
      return j.display_name || `${la.toFixed(5)}, ${ln.toFixed(5)}`;
    } catch {
      return `${la.toFixed(5)}, ${ln.toFixed(5)}`;
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Brauzeringiz geolokatsiyani qo'llab-quvvatlamaydi");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const la = pos.coords.latitude;
        const ln = pos.coords.longitude;
        const label = await reverseGeocode(la, ln);
        setPendingDetected({ lat: la, lng: ln, label });
        setDetecting(false);
      },
      (err) => {
        setDetecting(false);
        toast.error("Lokatsiyani aniqlab bo'lmadi: " + err.message);
      }
    );
  };

  const acceptDetected = () => {
    if (!pendingDetected) return;
    setLat(pendingDetected.lat);
    setLng(pendingDetected.lng);
    setLocLabel(pendingDetected.label);
    setPendingDetected(null);
  };

  const onMapPick = async (la: number, ln: number) => {
    setLat(la);
    setLng(ln);
    const label = await reverseGeocode(la, ln);
    setLocLabel(label);
  };

  // ---- Cover upload ----
  const handleCoverUpload = async (file: File) => {
    if (!user) return;
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(file.type)) { toast.error("Faqat rasm fayllar (JPG, PNG, WEBP, GIF)"); return; }
    setUploading(true);
    const compressed = await compressImage(file).catch(() => file);
    const path = `${user.id}/covers/${Date.now()}-${compressed.name}`;
    const { error: upErr } = await supabase.storage.from("hotel-images").upload(path, compressed);
    if (upErr) { setUploading(false); toast.error(friendlyError(upErr)); return; }
    const { data: { publicUrl } } = supabase.storage.from("hotel-images").getPublicUrl(path);
    setCover(publicUrl);
    setUploading(false);
    toast.success("Rasm yuklandi");
  };

  // ---- Step 1 → create hotel (unpublished) and move to step 2 ----
  const proceedToRooms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return toast.error("Telefon raqamini kiriting");
    if (lat == null || lng == null) return toast.error("Xaritadan lokatsiyani belgilang");
    // Enforce hotel-per-admin limit
    const { count } = await supabase.from("hotels").select("id", { count: "exact", head: true }).eq("owner_id", user!.id);
    if ((count ?? 0) >= MAX_HOTELS_PER_ADMIN) {
      toast.error(`Siz ${MAX_HOTELS_PER_ADMIN} ta dachadan ko'p qo'sha olmaysiz`);
      navigate({ to: "/admin" });
      return;
    }
    const createdHotelId = crypto.randomUUID();
    setSaving(true);
    const { error } = await supabase.from("hotels").insert({
      id: createdHotelId,
      owner_id: user!.id,
      name,
      slug: slugify(name),
      location: locLabel,
      lat, lng,
      description,
      price_per_night: 0,
      phone: phone.trim(),
      amenities: amenities.split(",").map((s) => s.trim()).filter(Boolean),
      cover_image: cover || null,
      published: false,
    });
    setSaving(false);
    if (error) { toast.error(friendlyError(error)); return; }
    setHotelId(createdHotelId);
    setStep(2);
  };

  // ---- Rooms management ----
  const addRoomInternal = async (): Promise<boolean> => {
    if (!hotelId) return false;
    if (rooms.length >= MAX_ROOMS_PER_HOTEL) { toast.error(`${MAX_ROOMS_PER_HOTEL} tadan ko'p xona qo'shib bo'lmaydi`); return false; }
    if (!newRoom.name.trim()) { toast.error("Xona nomini kiriting"); return false; }
    if (!newRoom.price) { toast.error("Xona narxini kiriting"); return false; }
    if (newRoomFiles.length === 0) { toast.error("Kamida 1 ta rasm tanlang"); return false; }
    if (newRoomFiles.length > MAX_IMAGES_PER_ROOM) { toast.error(`Bir xonaga ${MAX_IMAGES_PER_ROOM} tadan ko'p rasm yuklab bo'lmaydi`); return false; }
    const { data, error } = await supabase.from("rooms").insert({
      hotel_id: hotelId,
      name: newRoom.name.trim(),
      price: Number(newRoom.price) || 0,
      capacity: Number(newRoom.capacity) || 2,
      description: newRoom.description,
    }).select().single();
    if (error) { toast.error(friendlyError(error)); return false; }
    const created: RoomDraft = {
      id: data.id, dbId: data.id, name: data.name, price: String(data.price),
      capacity: String(data.capacity), description: data.description ?? "", images: [],
    };
    const uploaded: { id?: string; url: string }[] = [];
    for (let i = 0; i < newRoomFiles.length; i++) {
      const file = await compressImage(newRoomFiles[i]).catch(() => newRoomFiles[i]);
      const path = `${user!.id}/${hotelId}/rooms/${created.id}/${Date.now()}-${i}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("hotel-images").upload(path, file);
      if (upErr) { toast.error(friendlyError(upErr)); continue; }
      const { data: { publicUrl } } = supabase.storage.from("hotel-images").getPublicUrl(path);
      const { data: imgRow, error: imgErr } = await supabase.from("room_images").insert({
        room_id: created.id, hotel_id: hotelId, url: publicUrl, sort_order: i,
      }).select().single();
      if (imgErr) { toast.error(friendlyError(imgErr)); continue; }
      uploaded.push({ id: imgRow.id, url: publicUrl });
    }
    setRooms((r) => [...r, { ...created, images: uploaded }]);
    setNewRoom({ name: "", price: "", capacity: "", description: "" });
    setNewRoomFiles([]);
    return true;
  };

  const addRoom = async () => { await addRoomInternal(); };

  const hasPendingRoom = () =>
    newRoom.name.trim() !== "" || newRoom.price !== "" || newRoom.capacity !== "" || newRoom.description !== "" || newRoomFiles.length > 0;


  const removeRoom = async (id: string) => {
    await supabase.from("rooms").delete().eq("id", id);
    setRooms((r) => r.filter((x) => x.id !== id));
  };

  const uploadRoomImage = async (room: RoomDraft, file: File) => {
    if (!hotelId) return;
    if (room.images.length >= MAX_IMAGES_PER_ROOM) { toast.error(`Bir xonaga ${MAX_IMAGES_PER_ROOM} tadan ko'p rasm yuklab bo'lmaydi`); return; }
    const compressed = await compressImage(file).catch(() => file);
    const path = `${user!.id}/${hotelId}/rooms/${room.id}/${Date.now()}-${compressed.name}`;
    const { error: upErr } = await supabase.storage.from("hotel-images").upload(path, compressed);
    if (upErr) { toast.error(friendlyError(upErr)); return; }
    const { data: { publicUrl } } = supabase.storage.from("hotel-images").getPublicUrl(path);
    const { data, error } = await supabase.from("room_images").insert({
      room_id: room.id, hotel_id: hotelId, url: publicUrl, sort_order: room.images.length,
    }).select().single();
    if (error) { toast.error(friendlyError(error)); return; }
    setRooms((rs) => rs.map((r) => r.id === room.id ? { ...r, images: [...r.images, { id: data.id, url: publicUrl }] } : r));
  };

  const removeRoomImage = async (room: RoomDraft, imgId?: string) => {
    if (!imgId) return;
    await supabase.from("room_images").delete().eq("id", imgId);
    setRooms((rs) => rs.map((r) => r.id === room.id ? { ...r, images: r.images.filter((i) => i.id !== imgId) } : r));
  };

  // ---- Final publish ----
  const finalize = async () => {
    if (finalizeLockRef.current || saving) return;
    if (!hotelId) return;
    if (rooms.length === 0 && !hasPendingRoom()) return toast.error("Kamida bitta xona qo'shing");

    finalizeLockRef.current = true;
    setSaving(true);
    try {
      // Auto-add pending room if user filled the form but didn't click "Xona qo'shish"
      if (hasPendingRoom()) {
        const ok = await addRoomInternal();
        if (!ok) return;
      }
      const { error } = await supabase.from("hotels").update({ published: true }).eq("id", hotelId);
      if (error) return toast.error(friendlyError(error));
      toast.success("Dacha saqlandi va e'lon qilindi!");
      navigate({ to: "/admin/hotels/$id", params: { id: hotelId } });
    } finally {
      finalizeLockRef.current = false;
      setSaving(false);
    }
  };


  // ============ Render ============
  if (limitState !== "ok" && step === 1 && !hotelId) {
    return (
      <DashboardShell title="Dacha Admin" nav={NAV}>
        <h2 className="font-display text-3xl text-emerald-deep">Yangi dacha qo'shish</h2>
        {limitState === "checking" ? (
          <p className="mt-6 text-sm text-emerald-deep/70">Yuklanmoqda...</p>
        ) : (
          <div className="mt-6 max-w-2xl rounded-2xl border border-gold bg-cream p-6 shadow-card-luxe">
            <h3 className="font-display text-xl text-emerald-deep">Limit tugagan</h3>
            <p className="mt-2 text-sm text-emerald-deep/80">
              Siz {MAX_HOTELS_PER_ADMIN} ta dacha qo'shgansiz — bu maksimal limit. Yangi dacha qo'shish uchun avval mavjud dachangizni o'chiring.
            </p>
            <Link
              to="/admin"
              className="mt-4 inline-block rounded-xl bg-emerald-deep px-5 py-2.5 text-xs uppercase tracking-wider text-cream hover:bg-gold hover:text-emerald-deep"
            >
              Mening dachalarim
            </Link>
          </div>
        )}
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Dacha Admin" nav={NAV}>
      <h2 className="font-display text-3xl text-emerald-deep">
        {step === 1 ? "Yangi dacha qo'shish" : "Xonalar va rasmlarni qo'shing"}
      </h2>


      {step === 1 ? (
        <form onSubmit={proceedToRooms} className="mt-6 max-w-3xl space-y-4 rounded-2xl bg-white p-6 shadow-card-luxe">
          <Input label="Dacha nomi" value={name} onChange={setName} required />

          {/* Location */}
          <div>
            <label className="text-xs uppercase tracking-wider text-emerald-deep/70">Joylashuv</label>
            <div className="mt-1 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={detectLocation}
                disabled={detecting}
                className="rounded-xl bg-emerald-deep px-4 py-2.5 text-xs uppercase tracking-wider text-cream hover:bg-gold hover:text-emerald-deep disabled:opacity-50"
              >
                {detecting ? "Aniqlanmoqda..." : "Avtomatik aniqlash"}
              </button>
              <span className="self-center text-xs text-muted-foreground">yoki xaritadan tanlang ↓</span>
            </div>

            {pendingDetected ? (
              <div className="mt-3 rounded-xl border border-gold bg-cream p-4">
                <p className="text-sm text-emerald-deep">{pendingDetected.label}</p>
                <p className="mt-2 text-xs text-emerald-deep/70">Shu yerni tanlaysizmi?</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={acceptDetected} className="rounded-full bg-emerald-deep px-4 py-1.5 text-xs uppercase tracking-wider text-cream hover:bg-gold hover:text-emerald-deep">Ha</button>
                  <button type="button" onClick={() => setPendingDetected(null)} className="rounded-full border border-emerald-deep px-4 py-1.5 text-xs uppercase tracking-wider text-emerald-deep hover:bg-emerald-deep hover:text-cream">Yo'q</button>
                </div>
              </div>
            ) : null}

            <div className="mt-3">
              <MapPicker lat={lat} lng={lng} onChange={onMapPick} />
            </div>
            {locLabel ? (
              <p className="mt-2 text-xs text-emerald-deep/80">📍 {locLabel}</p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Xaritadan dachangiz joylashuvini bosing</p>
            )}
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-emerald-deep/70">Tavsif</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-border bg-cream px-4 py-3 outline-none focus:border-gold" />
          </div>

          <Input label="Telefon" value={phone} onChange={setPhone} placeholder="+998911231159" required />
          <Input label="Qulayliklar (vergul bilan ajrating)" value={amenities} onChange={setAmenities} placeholder="wifi, televizor, hovuz" />

          <div>
            <label className="text-xs uppercase tracking-wider text-emerald-deep/70">Asosiy rasm</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = ""; }}
              className="mt-1 block w-full cursor-pointer rounded-xl border border-border bg-cream px-4 py-3 text-sm outline-none file:cursor-pointer focus:border-gold"
            />
            {uploading ? <p className="mt-2 text-xs text-muted-foreground">Yuklanmoqda...</p> : null}
            {cover ? (
              <div className="mt-3">
                <img src={cover} alt="cover" className="h-40 w-full rounded-xl object-cover" />
                <button type="button" onClick={() => setCover("")} className="mt-2 cursor-pointer text-xs text-red-600 hover:underline">Olib tashlash</button>
              </div>
            ) : null}
          </div>

          <button disabled={saving || uploading} className="w-full rounded-full bg-emerald-deep py-3 text-xs uppercase tracking-[0.25em] text-cream hover:bg-gold hover:text-emerald-deep disabled:opacity-50">
            {saving ? "Saqlanmoqda..." : "Davom etish → Xonalar qo'shish"}
          </button>
        </form>
      ) : (
        <div className="mt-6 max-w-3xl space-y-6">
          {/* Rooms list */}
          <section className="rounded-2xl bg-white p-6 shadow-card-luxe">
            <h3 className="font-display text-xl text-emerald-deep">Xonalar</h3>
            <p className="mt-1 text-xs text-muted-foreground">Avval pastdagi shakldan xona qo'shing, so'ng har bir xona ostidan «Xona rasmlari» bo'limidagi <b>«Choose File»</b> tugmasi orqali kamida 1 ta rasm yuklang.</p>

            <div className="mt-4 space-y-4">
              {rooms.map((r) => (
                <div key={r.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-emerald-deep">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.capacity} kishi · {Number(r.price).toLocaleString()} so'm</div>
                      {r.description ? <div className="mt-1 text-xs text-muted-foreground">{r.description}</div> : null}
                    </div>
                    <button onClick={() => removeRoom(r.id)} className="cursor-pointer text-xs text-red-600 hover:underline">O'chirish</button>
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
                        {r.images.map((img) => (
                          <div key={img.id} className="relative">
                            <img src={img.url} alt="" className="h-20 w-full rounded-lg object-cover" />
                            <button onClick={() => removeRoomImage(r, img.id)} className="absolute right-1 top-1 cursor-pointer rounded-full bg-red-600 px-1.5 text-xs text-white">×</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-[11px] text-red-600">⚠ Hech bo'lmaganda 1 ta rasm yuklang</p>
                    )}
                  </div>

                </div>
              ))}

              {rooms.length === 0 ? <p className="text-sm text-muted-foreground">Hali xona yo'q. Pastdan qo'shing.</p> : null}
            </div>

            {/* Add room form — hidden when limit reached */}
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
                <label className="text-xs uppercase tracking-wider text-emerald-deep/70">Xona rasmlari</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const fs = Array.from(e.target.files || []);
                    if (fs.length > MAX_IMAGES_PER_ROOM) {
                      toast.error(`Bir xonaga ${MAX_IMAGES_PER_ROOM} tadan ko'p rasm yuklab bo'lmaydi`);
                      setNewRoomFiles(fs.slice(0, MAX_IMAGES_PER_ROOM));
                    } else {
                      setNewRoomFiles(fs);
                    }
                    e.target.value = "";
                  }}
                  className="mt-1 block w-full cursor-pointer rounded-xl border border-border bg-cream px-4 py-3 text-sm outline-none file:cursor-pointer focus:border-gold"
                />
                {newRoomFiles.length > 0 ? (
                  <>
                    <p className="mt-1 text-xs text-emerald-deep/70">{newRoomFiles.length} ta rasm tanlandi</p>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {newRoomFiles.map((f, i) => (
                        <div key={i} className="relative">
                          <img src={URL.createObjectURL(f)} alt="" className="h-20 w-full rounded-lg object-cover" />
                          <button
                            type="button"
                            onClick={() => setNewRoomFiles((arr) => arr.filter((_, idx) => idx !== i))}
                            className="absolute right-1 top-1 cursor-pointer rounded-full bg-red-600 px-1.5 text-xs text-white"
                          >×</button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">Kamida 1 ta rasm tanlang</p>
                )}

              </div>
              <button type="button" onClick={addRoom} className="mt-3 cursor-pointer rounded-full bg-emerald-deep px-5 py-2 text-xs uppercase tracking-wider text-cream hover:bg-gold hover:text-emerald-deep">
                + Xona qo'shish
              </button>
            </div>
            )}
          </section>

          {/* Final save */}
          <div className="flex justify-end gap-3">
            <button disabled={saving} onClick={finalize} className="cursor-pointer rounded-full bg-emerald-deep px-8 py-3 text-xs uppercase tracking-[0.25em] text-cream hover:bg-gold hover:text-emerald-deep disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "Saqlanyapti..." : "Dachani saqlash"}
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function Input({ label, value, onChange, type = "text", required, placeholder }: any) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-emerald-deep/70">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-cream px-4 py-3 outline-none focus:border-gold"
      />
    </div>
  );
}
