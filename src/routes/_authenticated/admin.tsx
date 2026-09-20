import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getMyRoles } from "@/lib/auth-roles.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    // Server-verified role check. The server fn uses requireSupabaseAuth
    // middleware — the caller's JWT is validated on the server and roles are
    // read with that identity. A client cannot fake the result.
    try {
      const { roles } = await getMyRoles();
      if (!roles.includes("hotel_admin") && !roles.includes("super_owner")) {
        throw redirect({ to: "/" });
      }
    } catch (err) {
      if ((err as any)?.isRedirect) throw err;
      throw redirect({ to: "/login" });
    }
  },
  component: AdminGuard,
});

function AdminGuard() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (role !== "hotel_admin" && role !== "super_owner") {
      navigate({ to: "/" });
    }
  }, [role, loading, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>;
  if (role !== "hotel_admin" && role !== "super_owner") return null;
  return <Outlet />;
}
