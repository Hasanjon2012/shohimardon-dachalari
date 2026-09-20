import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/DashboardShell";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/profile/settings")({
  component: SettingsPage,
});

const NAV = [
  { to: "/profile/bookings" as const, label: "Bronlarim" },
  { to: "/profile/favorites" as const, label: "Sevimlilar" },
  { to: "/profile/settings" as const, label: "Sozlamalar" },
];

function SettingsPage() {
  const { user } = useAuth();
  return (
    <DashboardShell title="Profil" nav={NAV}>
      <h2 className="font-display text-3xl text-emerald-deep">Sozlamalar</h2>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-card-luxe">
        <h3 className="font-display text-lg text-emerald-deep">Akkaunt ma'lumotlari</h3>
        <p className="mt-2 text-sm text-muted-foreground">Email: {user?.email}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-red-200 bg-white p-6 shadow-card-luxe">
        <h3 className="font-display text-lg text-red-600">Xavfli zona</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Akkauntingizni o'chirsangiz barcha ma'lumotlaringiz (bronlar, sevimlilar) ham o'chib ketadi va
          buni qaytarib bo'lmaydi.
        </p>
        <div className="mt-4">
          <DeleteAccountButton />
        </div>
      </div>
    </DashboardShell>
  );
}
