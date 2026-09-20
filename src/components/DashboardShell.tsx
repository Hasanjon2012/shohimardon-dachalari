import { Link, useNavigate, type LinkProps } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { OwnerNotifications } from "@/components/OwnerNotifications";
import type { ReactNode } from "react";

export function DashboardShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: { to: LinkProps["to"]; label: string }[];
  children: ReactNode;
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
          <Link to="/" className="font-display text-base tracking-[0.2em] text-emerald-deep md:text-xl">SHOHIMARDON</Link>
          <div className="flex items-center gap-2 md:gap-3">
            <OwnerNotifications />
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
            <button
              onClick={async () => { await signOut(); navigate({ to: "/" }); }}
              className="text-xs uppercase tracking-[0.2em] text-emerald-deep hover:text-gold"
            >
              Chiqish
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row md:gap-8 md:px-6 md:py-10">
        <aside className="w-full md:w-56 md:shrink-0">
          <h1 className="font-display text-2xl text-emerald-deep">{title}</h1>
          <nav className="mt-4 flex gap-2 overflow-x-auto pb-2 md:mt-6 md:flex-col md:gap-1 md:overflow-visible md:pb-0">
            {nav.map((n) => (
              <Link
                key={n.to as string}
                to={n.to}
                activeOptions={{ exact: true }}
                activeProps={{ className: "!bg-emerald-deep !text-cream" }}
                className="shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm text-emerald-deep hover:bg-emerald-tint md:shrink"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
