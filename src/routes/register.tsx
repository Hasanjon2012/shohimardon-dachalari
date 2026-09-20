import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Ro'yxatdan o'tish — Shohimardon" }] }),
  component: RegisterPage,
});

type Mode = "user" | "hotel_admin";

function RegisterPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mode) return;

    // Client-side email format validation (accepts common providers)
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRe.test(email.trim())) {
      toast.error("Bunday email mavjud emas yoki noto'g'ri kiritilgan.");
      return;
    }
    if (password.length < 8) {
      toast.error("Parol juda oson. Kamida 8 ta belgidan iborat bo'lsin.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName, role: mode },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    if (mode === "hotel_admin") {
      toast.success("Akkaunt yaratildi! Mehmonxona egasi sifatida arizangiz yuborildi — owner tasdiqlashini kuting.");
    } else {
      toast.success("Akkaunt yaratildi! Kiriting.");
    }
    navigate({ to: "/login" });
  };

  if (!mode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream px-6 py-12">
        <div className="w-full max-w-2xl rounded-3xl bg-white p-10 shadow-card-luxe">
          <Link to="/" className="text-xs uppercase tracking-[0.3em] text-emerald-deep/80">← Bosh sahifa</Link>
          <h1 className="mt-4 font-display text-4xl text-emerald-deep">Ro'yxatdan o'tish</h1>
          <p className="mt-2 text-sm text-muted-foreground">Kim sifatida ro'yxatdan o'tasiz?</p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <button
              onClick={() => setMode("user")}
              className="group rounded-2xl border-2 border-border p-8 text-left transition hover:border-gold hover:shadow-card-luxe"
            >
              <div className="text-3xl">👤</div>
              <h3 className="mt-4 font-display text-2xl text-emerald-deep group-hover:text-gold">Mijoz</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Mehmonxonalarni ko'ring, bron qiling, sevimlilarga qo'shing.
              </p>
            </button>

            <button
              onClick={() => setMode("hotel_admin")}
              className="group rounded-2xl border-2 border-border p-8 text-left transition hover:border-gold hover:shadow-card-luxe"
            >
              <div className="text-3xl">🏨</div>
              <h3 className="mt-4 font-display text-2xl text-emerald-deep group-hover:text-gold">Mehmonxona egasi</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                O'z mehmonxonangizni qo'shing va bronlarni boshqaring.
              </p>
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Akkauntingiz bormi? <Link to="/login" className="text-gold hover:underline">Kirish</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-card-luxe">
        <button onClick={() => setMode(null)} className="text-xs uppercase tracking-[0.3em] text-emerald-deep/80">← Orqaga</button>
        <h1 className="mt-4 font-display text-4xl text-emerald-deep">
          {mode === "user" ? "Mijoz" : "Mehmonxona egasi"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Ma'lumotlaringizni kiriting</p>

        {mode === "hotel_admin" && (
          <div className="mt-4 rounded-xl border border-gold/40 bg-gold-soft p-4 text-xs text-emerald-deep">
            Eslatma: mehmonxona egasi sifatida ariza yuborasiz. Avval oddiy foydalanuvchi sifatida kirasiz; owner sizni tasdiqlagandan keyin admin huquqi beriladi.
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Field label="To'liq ism" value={fullName} onChange={setFullName} required />
          
          <Field label="Email" value={email} onChange={setEmail} type="email" required />
          <Field label="Parol" value={password} onChange={setPassword} type="password" required />

          <button
            disabled={loading}
            className="w-full rounded-full bg-emerald-deep py-3 text-sm uppercase tracking-[0.25em] text-cream transition hover:bg-gold hover:text-emerald-deep disabled:opacity-50"
          >
            {loading ? "Yaratilmoqda..." : "Ro'yxatdan o'tish"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (show ? "text" : "password") : type;
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-emerald-deep/70">{label}</label>
      <div className="relative mt-2">
        <input
          type={inputType}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border border-border bg-cream px-4 py-3 outline-none focus:border-gold ${isPassword ? "pr-12" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Parolni yashirish" : "Parolni ko'rsatish"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-emerald-deep/80 hover:text-emerald-deep"
          >
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>
    </div>
  );
}
