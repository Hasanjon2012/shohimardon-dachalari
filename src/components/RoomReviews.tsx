import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";

function Stars({ value, onChange, size = "text-xl" }: { value: number; onChange?: (v: number) => void; size?: string }) {
  return (
    <div className={`flex gap-1 ${size}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={`${onChange ? "cursor-pointer hover:scale-110" : "cursor-default"} transition ${n <= value ? "text-gold" : "text-emerald-deep/20"}`}
          aria-label={`${n} yulduz`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string | null;
  guest_name: string | null;
};

export function RoomReviews({ hotelId, roomId }: { hotelId: string; roomId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [guestName, setGuestName] = useState("");

  const { data: isSuperOwner } = useQuery({
    queryKey: ["is-super-owner", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "super_owner")
        .maybeSingle();
      return !!data;
    },
  });
  const isOwner = !!user && !!isSuperOwner;

  const { data: reviews } = useQuery({
    queryKey: ["reviews", "room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, user_id, guest_name")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as ReviewRow[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id).filter((v): v is string => !!v)));
      let profiles: Record<string, string> = {};
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        profiles = Object.fromEntries((ps ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name || "Mehmon"]));
      }
      return rows.map((r) => ({
        ...r,
        author: r.user_id ? (profiles[r.user_id] || "Mehmon") : (r.guest_name || "Mehmon"),
      }));
    },
  });

  const myReview = reviews?.find((r) => user && r.user_id === user.id);

  const save = useMutation({
    mutationFn: async () => {
      if (rating < 1 || rating > 5) throw new Error("Bahoni tanlang");
      if (user) {
        const { error } = await supabase
          .from("reviews")
          .upsert(
            { hotel_id: hotelId, room_id: roomId, user_id: user.id, rating, comment },
            { onConflict: "room_id,user_id" },
          );
        if (error) throw error;
      } else {
        const name = guestName.trim();
        if (!name) throw new Error("Ismingizni kiriting");
        const { error } = await supabase
          .from("reviews")
          .insert({ hotel_id: hotelId, room_id: roomId, user_id: null, guest_name: name, rating, comment });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Sharhingiz qo'shildi");
      setComment("");
      setGuestName("");
      qc.invalidateQueries({ queryKey: ["reviews", "room", roomId] });
    },
    onError: (e: Error) => toast.error(friendlyError(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("O'chirildi");
      qc.invalidateQueries({ queryKey: ["reviews", "room", roomId] });
    },
  });

  const avg = reviews && reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between text-sm text-emerald-deep hover:text-gold"
      >
        <span className="font-medium">
          Sharhlar {reviews && reviews.length > 0 ? `· ★ ${avg.toFixed(1)} (${reviews.length})` : ""}
        </span>
        <span>{open ? "−" : "+"}</span>
      </button>

      {open ? (
        <div className="mt-3">
          <div className="rounded-xl border border-border bg-cream p-4">
            <div className="text-xs text-emerald-deep/70">{myReview ? "Sharhingizni tahrirlang" : "Sizning bahoyingiz"}</div>
            <div className="mt-2">
              <Stars value={rating} onChange={setRating} />
            </div>
            {!user ? (
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Ismingiz"
                maxLength={60}
                className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-gold"
              />
            ) : null}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={myReview?.comment ?? "Fikringizni bildiring"}
              rows={2}
              maxLength={1000}
              className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-gold"
            />
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="mt-2 cursor-pointer rounded-full bg-emerald-deep px-5 py-2 text-xs uppercase tracking-[0.2em] text-cream hover:bg-gold hover:text-emerald-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              {save.isPending ? "Saqlanmoqda..." : myReview ? "Yangilash" : "Yuborish"}
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {(reviews ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Hozircha sharhlar yo'q.</p>
            ) : (
              reviews!.map((r) => (
                <div key={r.id} className="rounded-xl bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-emerald-deep">Mehmon</div>
                      <Stars value={r.rating} size="text-sm" />
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                  {r.comment ? <p className="mt-2 whitespace-pre-line text-sm text-emerald-deep/80">{r.comment}</p> : null}
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={() => remove.mutate(r.id)}
                      className="mt-2 cursor-pointer text-xs text-red-600 hover:underline"
                    >
                      O'chirish
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
