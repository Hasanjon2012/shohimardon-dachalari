import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/DashboardShell";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettingsPage,
});

const NAV = [
  { to: "/admin" as const, label: "Mening dachalarim" },
  { to: "/admin/hotels/new" as const, label: "Yangi dacha" },
  { to: "/admin/bookings" as const, label: "Bronlar" },
  { to: "/admin/settings" as const, label: "Sozlamalar" },
];

function AdminSettingsPage() {
  const { user } = useAuth();

  const { data: hotels = [] } = useQuery({
    queryKey: ["my-hotels-settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("hotels")
        .select("id, name")
        .eq("owner_id", user!.id);
      return data ?? [];
    },
  });

  const count = hotels.length;
  const confirmMessage =
    count > 0
      ? `DIQQAT! Akkauntingizni o'chirsangiz, sizga tegishli ${count} ta dacha ham ` +
        `(barcha xonalari, rasmlari va bronlari bilan) butunlay o'chib ketadi. ` +
        `Bu amalni qaytarib bo'lmaydi. Davom etilsinmi?`
      : "Akkauntingizni butunlay o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.";

  return (
    <DashboardShell title="Dacha Admin" nav={NAV}>
      <h2 className="font-display text-3xl text-emerald-deep">Sozlamalar</h2>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-card-luxe">
        <h3 className="font-display text-lg text-emerald-deep">Akkaunt ma'lumotlari</h3>
        <p className="mt-2 text-sm text-muted-foreground">Email: {user?.email}</p>
        <p className="mt-1 text-sm text-muted-foreground">Dachalar soni: {count}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-red-200 bg-white p-6 shadow-card-luxe">
        <h3 className="font-display text-lg text-red-600">Xavfli zona — Akkauntni o'chirish</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Akkauntingizni o'chirsangiz, quyidagilar <strong>butunlay</strong> o'chib ketadi va
          ularni qaytarib bo'lmaydi:
        </p>
        <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>Sizning shaxsiy profilingiz va akkauntingiz</li>
          <li>Saytga joylagan barcha dachalaringiz ({count} ta)</li>
          <li>Dachalardagi xonalar va rasmlar</li>
          <li>Mijozlar tomonidan qilingan barcha bronlar</li>
        </ul>
        {count > 0 && (
          <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            <strong>O'chiriladigan dachalar:</strong>
            <ul className="mt-2 list-disc pl-5">
              {hotels.map((h: any) => (
                <li key={h.id}>{h.name}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-5">
          <DeleteAccountButton confirmMessage={confirmMessage} />
        </div>
      </div>
    </DashboardShell>
  );
}
