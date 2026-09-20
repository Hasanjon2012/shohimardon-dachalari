import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const dashHref =
    role === "super_owner" ? "/owner" : role === "hotel_admin" ? "/admin" : "/profile/bookings";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "glass-dark py-3" : "py-[24px]"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-10">
        <Link to="/" className="group flex items-center gap-2">
          <span className="text-2xl tracking-[0.25em] text-white font-display">SHOHIMARDON</span>
        </Link>

        <nav className="hidden items-center gap-10 text-sm tracking-wide text-white/85 md:flex">
          <Link to="/" className="hover:text-gold transition-colors">Bosh sahifa</Link>
          <Link to="/hotels" className="hover:text-gold transition-colors">Dachalar</Link>
          <a href="/#gallery" className="hover:text-gold transition-colors">Galereya</a>
          <a href="/#tavsiyalar" className="hover:text-gold transition-colors">Tavsiyalar</a>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link
                to={dashHref}
                className="inline-flex items-center justify-center rounded-full border border-gold/60 bg-gold-soft px-5 py-2 text-xs uppercase tracking-[0.2em] text-gold backdrop-blur-md transition-all hover:bg-gold hover:text-emerald-deep"
              >
                {role === "super_owner" ? "Owner" : role === "hotel_admin" ? "Admin" : "Profil"}
              </Link>
              <button
                onClick={handleSignOut}
                className="text-xs uppercase tracking-[0.2em] text-white/70 hover:text-gold"
              >
                Chiqish
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-full border border-gold/60 px-5 py-2 text-xs uppercase tracking-[0.2em] text-gold backdrop-blur-md transition-all hover:bg-gold-soft mx-[15px]"
              >
                Kirish
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-full border border-gold/60 bg-gold-soft px-5 py-2 text-xs uppercase tracking-[0.2em] text-gold backdrop-blur-md transition-all hover:bg-gold hover:text-emerald-deep"
              >
                Ro'yxatdan o'tish
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Menyu"
          className="md:hidden inline-flex items-center justify-center rounded-full border border-white/20 p-2 text-white hover:text-gold hover:border-gold/60 transition-colors"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden mt-3 mx-4 rounded-2xl glass-dark p-5 flex flex-col gap-4">
          <nav className="flex flex-col gap-3 text-sm tracking-wide text-white/85">
            <Link to="/" onClick={() => setOpen(false)} className="hover:text-gold transition-colors">Bosh sahifa</Link>
            <Link to="/hotels" onClick={() => setOpen(false)} className="hover:text-gold transition-colors">Dachalar</Link>
            <a href="/#gallery" onClick={() => setOpen(false)} className="hover:text-gold transition-colors">Galereya</a>
            <a href="/#tavsiyalar" onClick={() => setOpen(false)} className="hover:text-gold transition-colors">Tavsiyalar</a>
          </nav>
          <div className="h-px bg-white/10" />
          <div className="flex flex-col gap-3">
            {user ? (
              <>
                <Link
                  to={dashHref}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center rounded-full border border-gold/60 bg-gold-soft px-5 py-2 text-xs uppercase tracking-[0.2em] text-gold transition-all hover:bg-gold hover:text-emerald-deep"
                >
                  {role === "super_owner" ? "Owner" : role === "hotel_admin" ? "Admin" : "Profil"}
                </Link>
                <button
                  onClick={() => { setOpen(false); handleSignOut(); }}
                  className="text-xs uppercase tracking-[0.2em] text-white/70 hover:text-gold py-2"
                >
                  Chiqish
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center rounded-full border border-gold/60 px-5 py-2 text-xs uppercase tracking-[0.2em] text-gold transition-all hover:bg-gold-soft"
                >
                  Kirish
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center rounded-full border border-gold/60 bg-gold-soft px-5 py-2 text-xs uppercase tracking-[0.2em] text-gold transition-all hover:bg-gold hover:text-emerald-deep"
                >
                  Ro'yxatdan o'tish
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
