import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Yangi parol — Shohimardon" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery token from the URL hash and creates a session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Parol kamida 6 belgidan iborat bo'lishi kerak");
      return;
    }
    if (password !== confirm) {
      toast.error("Parollar mos kelmadi");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success("Parol yangilandi");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-card-luxe">
        <Link to="/login" className="text-xs uppercase tracking-[0.3em] text-emerald-deep/80">← Kirishga qaytish</Link>
        <h1 className="mt-4 font-display text-4xl text-emerald-deep">Yangi parol</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ready ? "Yangi parolni kiriting." : "Havola tekshirilmoqda..."}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="text-xs uppercase tracking-wider text-emerald-deep/70">Yangi parol</label>
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
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
          <div>
            <label className="text-xs uppercase tracking-wider text-emerald-deep/70">Parolni tasdiqlang</label>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-cream px-4 py-3 outline-none focus:border-gold"
            />
          </div>
          <button
            disabled={loading || !ready}
            className="w-full rounded-full bg-emerald-deep py-3 text-sm uppercase tracking-[0.25em] text-cream transition hover:bg-gold hover:text-emerald-deep disabled:opacity-50"
          >
            {loading ? "Yangilanmoqda..." : "Parolni yangilash"}
          </button>
        </form>
      </div>
    </div>
  );
}
