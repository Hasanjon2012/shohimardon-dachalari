import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Parolni tiklash — Shohimardon" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    setSent(true);
    toast.success("Emailingizga havola yuborildi");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-card-luxe">
        <Link to="/login" className="text-xs uppercase tracking-[0.3em] text-emerald-deep/80">← Kirishga qaytish</Link>
        <h1 className="mt-4 font-display text-4xl text-emerald-deep">Parolni tiklash</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Emailingizni kiriting — sizga parolni yangilash uchun havola yuboramiz.
        </p>

        {sent ? (
          <div className="mt-8 rounded-2xl bg-emerald-tint p-6 text-sm text-emerald-deep">
            <strong>{email}</strong> manziliga havola yuborildi. Iltimos, pochtangizni tekshiring
            (spam papkasini ham) va havola orqali parolni yangilang.
          </div>
        ) : (
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
            <button
              disabled={loading}
              className="w-full rounded-full bg-emerald-deep py-3 text-sm uppercase tracking-[0.25em] text-cream transition hover:bg-gold hover:text-emerald-deep disabled:opacity-50"
            >
              {loading ? "Yuborilmoqda..." : "Havola yuborish"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
