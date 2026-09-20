import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/DashboardShell";
import { OWNER_NAV } from "./owner";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/owner/settings")({ component: OwnerSettings });

function OwnerSettings() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingsEnabled, setBookingsEnabled] = useState(true);
  const [savingBookings, setSavingBookings] = useState(false);

  useEffect(() => {
    supabase.from("app_config").select("value").eq("key", "super_owner_email").single().then(({ data }) => {
      setEmail(data?.value ?? "");
    });
    supabase.from("app_config").select("value").eq("key", "bookings_enabled").single().then(({ data }) => {
      setBookingsEnabled((data?.value ?? "true") === "true");
    });
  }, []);

  const save = async () => {
    setLoading(true);
    const { error } = await supabase.from("app_config").update({ value: email }).eq("key", "super_owner_email");
    setLoading(false);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("Saqlandi. Bu email ostida ro'yxatdan o'tgan akkaunt avtomatik super owner bo'ladi.");
  };

  const toggleBookings = async (next: boolean) => {
    setSavingBookings(true);
    const { error } = await supabase
      .from("app_config")
      .upsert({ key: "bookings_enabled", value: next ? "true" : "false" }, { onConflict: "key" });
    setSavingBookings(false);
    if (error) { toast.error(friendlyError(error)); return; }
    setBookingsEnabled(next);
    toast.success(next ? "Bron qilish yoqildi" : "Bron qilish o'chirildi");
  };

  return (
    <DashboardShell title="Super Owner" nav={OWNER_NAV}>
      <h2 className="font-display text-3xl text-emerald-deep">Sozlamalar</h2>

      <div className="mt-6 max-w-xl rounded-2xl bg-white p-6 shadow-card-luxe">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-lg text-emerald-deep">Bron qilish (global)</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              O'chirilsa, foydalanuvchilar dacha xonalarini bron qila olmaydi — ular faqat dacha egasi bilan bog'lana oladi.
            </p>
          </div>
          <button
            onClick={() => toggleBookings(!bookingsEnabled)}
            disabled={savingBookings}
            className={`shrink-0 cursor-pointer rounded-full px-5 py-2 text-xs uppercase tracking-[0.25em] disabled:cursor-not-allowed ${bookingsEnabled ? "bg-emerald-deep text-cream" : "border border-emerald-deep text-emerald-deep"}`}
          >
            {bookingsEnabled ? "Yoqilgan" : "O'chirilgan"}
          </button>
        </div>
      </div>

      <div className="mt-6 max-w-xl rounded-2xl bg-white p-6 shadow-card-luxe">
        <label className="text-xs uppercase tracking-wider text-emerald-deep/70">Super owner email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-cream px-4 py-3 outline-none focus:border-gold" />
        <button onClick={save} disabled={loading} className="mt-3 rounded-full bg-emerald-deep px-6 py-2.5 text-xs uppercase tracking-[0.25em] text-cream hover:bg-gold hover:text-emerald-deep disabled:opacity-50">
          {loading ? "..." : "Saqlash"}
        </button>
      </div>
    </DashboardShell>
  );
}
