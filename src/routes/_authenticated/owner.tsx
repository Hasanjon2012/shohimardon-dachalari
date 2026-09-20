import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getMyRoles } from "@/lib/auth-roles.functions";

export const Route = createFileRoute("/_authenticated/owner")({
  beforeLoad: async () => {
    // Server-verified role check (see admin.tsx).
    try {
      const { roles } = await getMyRoles();
      if (!roles.includes("super_owner")) {
        throw redirect({ to: "/" });
      }
    } catch (err) {
      if ((err as any)?.isRedirect) throw err;
      throw redirect({ to: "/login" });
    }
  },
  component: OwnerGuard,
});

function OwnerGuard() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && role !== "super_owner") navigate({ to: "/" });
  }, [role, loading, navigate]);
  if (loading) return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>;
  if (role !== "super_owner") return null;
  return <Outlet />;
}

const NAV = [
  { to: "/owner" as const, label: "Statistika" },
  { to: "/owner/hotels" as const, label: "Dachalar" },
  { to: "/owner/users" as const, label: "Foydalanuvchilar" },
  { to: "/owner/bookings" as const, label: "Bronlar" },
  { to: "/owner/messages" as const, label: "Xabarlar" },
  { to: "/owner/settings" as const, label: "Sozlamalar" },
];

export { NAV as OWNER_NAV };
