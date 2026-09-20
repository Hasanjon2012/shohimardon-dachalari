import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/DashboardShell";
import { OWNER_NAV } from "./owner";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/owner/messages")({ component: OwnerMessages });

function OwnerMessages() {
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feedback").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("O'chirildi"); qc.invalidateQueries({ queryKey: ["feedback"] }); },
    onError: (e) => toast.error(friendlyError(e)),
  });

  return (
    <DashboardShell title="Super Owner" nav={OWNER_NAV}>
      <h2 className="font-display text-3xl text-emerald-deep">Xabarlar ({data.length})</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Foydalanuvchilarning tavsiya bo'limi orqali yuborgan xabarlari.
      </p>

      <div className="mt-8 space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Hozircha xabar yo'q.</p>
        ) : (
          data.map((m: any) => (
            <div key={m.id} className="rounded-2xl bg-white p-5 shadow-card-luxe">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <a href={`mailto:${m.email}`} className="font-medium text-emerald-deep hover:text-gold break-all">
                    {m.email}
                  </a>
                  <div className="text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("uz-UZ")}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-emerald-deep/90">{m.message}</p>
                </div>
                <button
                  onClick={() => { if (window.confirm("O'chirilsinmi?")) del.mutate(m.id); }}
                  className="shrink-0 rounded-full border border-red-300 bg-white px-4 py-1.5 text-xs uppercase tracking-wider text-red-600 hover:bg-red-600 hover:text-white"
                >
                  O'chirish
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardShell>
  );
}
