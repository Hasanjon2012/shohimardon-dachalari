import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Kirish — Shohimardon" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success("Xush kelibsiz!");
    // determine role and redirect
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user!.id);
    const r = roles?.map((x) => x.role) ?? [];
    if (r.includes("super_owner")) navigate({ to: "/owner" });
    else if (r.includes("hotel_admin")) navigate({ to: "/admin" });
    else navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-card-luxe">
        <Link to="/" className="text-xs uppercase tracking-[0.3em] text-emerald-deep/80">← Bosh sahifa</Link>
        <h1 className="mt-4 font-display text-4xl text-emerald-deep">Kirish</h1>
        <p className="mt-2 text-sm text-muted-foreground">Akkauntingizga kiring</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="text-xs uppercase tracking-wider text-emerald-deep/70">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-cream px-4 py-3 outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-emerald-deep/70">Parol</label>
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-cream px-4 py-3 pr-12 outline-none focus:border-gold"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-emerald-deep/80 hover:text-emerald-deep"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <button
            disabled={loading}
            className="w-full rounded-full bg-emerald-deep py-3 text-sm uppercase tracking-[0.25em] text-cream transition hover:bg-gold hover:text-emerald-deep disabled:opacity-50"
          >
            {loading ? "Kirilmoqda..." : "Kirish"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          <Link to="/forgot-password" className="text-emerald-deep/70 hover:text-gold hover:underline">
            Parolni unutdingizmi?
          </Link>
        </p>

        <p className="mt-2 text-center text-sm text-muted-foreground">
          Akkauntingiz yo'qmi?{" "}
          <Link to="/register" className="text-gold hover:underline">Ro'yxatdan o'tish</Link>
        </p>
      </div>
    </div>
  );
}
