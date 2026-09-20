import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DashboardShell } from "@/components/DashboardShell";
import { OWNER_NAV } from "./owner";
import { deleteUserAsOwner } from "@/lib/account.functions";
import { listUsersForOwner, decideAdminRequest } from "@/lib/admin-requests.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/owner/users")({ component: OwnerUsers });

function OwnerUsers() {
  const qc = useQueryClient();
  const deleteFn = useServerFn(deleteUserAsOwner);
  const listFn = useServerFn(listUsersForOwner);
  const decideFn = useServerFn(decideAdminRequest);

  const { data = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => await listFn(),
  });

  const toggleBlock = useMutation({
    mutationFn: async ({ id, blocked }: { id: string; blocked: boolean }) => {
      const { error } = await supabase.from("profiles").update({ blocked }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Yangilandi"); qc.invalidateQueries({ queryKey: ["all-users"] }); },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => { await deleteFn({ data: { userId: id } }); },
    onSuccess: () => { toast.success("Foydalanuvchi o'chirildi"); qc.invalidateQueries({ queryKey: ["all-users"] }); },
    onError: (e: any) => toast.error(friendlyError(e)),
  });

  const decide = useMutation({
    mutationFn: async ({ userId, approve }: { userId: string; approve: boolean }) =>
      await decideFn({ data: { userId, approve } }),
    onSuccess: (_d, vars) => {
      toast.success(vars.approve ? "Admin sifatida tasdiqlandi" : "Ariza rad etildi");
      qc.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (e: any) => toast.error(friendlyError(e)),
  });

  const adjustTrust = useMutation({
    mutationFn: async ({ userId, delta }: { userId: string; delta: number }) => {
      const { error } = await supabase.rpc("adjust_user_trust_score", { _user_id: userId, _delta: delta });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Trust score yangilandi"); qc.invalidateQueries({ queryKey: ["all-users"] }); },
    onError: (e: any) => toast.error(friendlyError(e)),
  });

  const resetAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("reset_all_trust_scores");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Barcha trust score'lar 100 ga qaytarildi"); qc.invalidateQueries({ queryKey: ["all-users"] }); },
    onError: (e: any) => toast.error(friendlyError(e)),
  });

  const promptAdjust = (userId: string, name: string) => {
    const raw = window.prompt(`"${name}" uchun trust score'ga qancha qo'shamiz? (manfiy son ayirish uchun, masalan -10)`);
    if (raw == null) return;
    const delta = parseInt(raw, 10);
    if (!Number.isFinite(delta) || delta === 0) return;
    adjustTrust.mutate({ userId, delta });
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`"${name}" foydalanuvchini butunlay o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`)) return;
    deleteUser.mutate(id);
  };

  const pending = data.filter((u: any) => u.adminRequest === "pending" && !u.roles.includes("hotel_admin"));
  const admins = data.filter((u: any) => u.roles.includes("hotel_admin"));
  const regulars = data.filter(
    (u: any) => !u.roles.includes("hotel_admin") && !u.roles.includes("super_owner") && u.adminRequest !== "pending",
  );

  const renderRow = (u: any) => (
    <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card-luxe">
      <div className="min-w-0">
        <div className="font-medium text-emerald-deep">{u.full_name || "(ism yo'q)"}</div>
        <div className="text-xs text-muted-foreground">
          {u.email && <span className="font-mono">{u.email}</span>}
          {u.phone ? <span> · {u.phone}</span> : null}
          <span> · {u.roles.join(", ") || "user"}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-medium ${
            (u.trust_score ?? 100) >= 80 ? "bg-green-100 text-green-800"
              : (u.trust_score ?? 100) >= 40 ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800"
          }`}>Trust: {u.trust_score ?? 100}</span>
          {(u.no_show_count ?? 0) > 0 ? (
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-zinc-700">Kelmagan: {u.no_show_count}</span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => adjustTrust.mutate({ userId: u.id, delta: 10 })} disabled={adjustTrust.isPending} className="rounded-full border border-green-600 px-3 py-1.5 text-xs uppercase tracking-wider text-green-700 hover:bg-green-600 hover:text-white disabled:opacity-50">+10</button>
        <button onClick={() => promptAdjust(u.id, u.full_name || "Foydalanuvchi")} disabled={adjustTrust.isPending} className="rounded-full border border-emerald-deep px-3 py-1.5 text-xs uppercase tracking-wider text-emerald-deep hover:bg-emerald-deep hover:text-cream disabled:opacity-50">Trust ±</button>
        <button onClick={() => toggleBlock.mutate({ id: u.id, blocked: !u.blocked })} className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-wider ${u.blocked ? "bg-red-600 text-white" : "border border-emerald-deep text-emerald-deep hover:bg-emerald-deep hover:text-cream"}`}>
          {u.blocked ? "Bloklangan" : "Bloklash"}
        </button>
        <button
          onClick={() => handleDelete(u.id, u.full_name || "Foydalanuvchi")}
          disabled={deleteUser.isPending}
          className="rounded-full border border-red-300 bg-white px-4 py-1.5 text-xs uppercase tracking-wider text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"
        >
          O'chirish
        </button>
      </div>
    </div>
  );

  return (
    <DashboardShell title="Super Owner" nav={OWNER_NAV}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-3xl text-emerald-deep">Foydalanuvchilar</h2>
        <button
          onClick={() => { if (window.confirm("Barcha foydalanuvchilarning trust score'ini 100 ga qaytarmoqchimisiz?")) resetAll.mutate(); }}
          disabled={resetAll.isPending}
          className="rounded-full border border-emerald-deep px-4 py-2 text-xs uppercase tracking-wider text-emerald-deep hover:bg-emerald-deep hover:text-cream disabled:opacity-50"
        >Reset all trust scores</button>
      </div>

      <section className="mt-8">
        <h3 className="font-display text-xl text-emerald-deep">Admin arizalari ({pending.length})</h3>
        <div className="mt-4 space-y-2">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Yangi ariza yo'q.</p>
          ) : pending.map((u: any) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold/5 p-4">
              <div className="min-w-0">
                <div className="font-medium text-emerald-deep">{u.full_name || "(ism yo'q)"}</div>
                <div className="text-xs text-muted-foreground">
                  {u.email && <span className="font-mono">{u.email}</span>}
                  {u.phone ? <span> · {u.phone}</span> : null}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => decide.mutate({ userId: u.id, approve: true })}
                  disabled={decide.isPending}
                  className="rounded-full bg-emerald-deep px-4 py-1.5 text-xs uppercase tracking-wider text-cream hover:bg-gold hover:text-emerald-deep disabled:opacity-50"
                >Tasdiqlash</button>
                <button
                  onClick={() => decide.mutate({ userId: u.id, approve: false })}
                  disabled={decide.isPending}
                  className="rounded-full border border-red-500 px-4 py-1.5 text-xs uppercase tracking-wider text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"
                >Rad etish</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h3 className="font-display text-xl text-emerald-deep">Hotel adminlar ({admins.length})</h3>
        <div className="mt-4 space-y-2">
          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hozircha hotel admin yo'q.</p>
          ) : admins.map(renderRow)}
        </div>
      </section>

      <section className="mt-10">
        <h3 className="font-display text-xl text-emerald-deep">Mijozlar ({regulars.length})</h3>
        <div className="mt-4 space-y-2">
          {regulars.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hozircha mijoz yo'q.</p>
          ) : regulars.map(renderRow)}
        </div>
      </section>
    </DashboardShell>
  );
}
