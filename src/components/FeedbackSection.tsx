import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/errors";

const schema = z.object({
  email: z.string().trim().email({ message: "Email noto'g'ri" }).max(255),
  message: z.string().trim().min(3, { message: "Tavsiya juda qisqa" }).max(2000),
});

export function FeedbackSection() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, message });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("feedback").insert({
      email: parsed.data.email,
      message: parsed.data.message,
    });
    setLoading(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success("Tavsiyangiz uchun rahmat!");
    setEmail("");
    setMessage("");
  };

  return (
    <section id="tavsiyalar" className="bg-cream py-28 lg:py-40">
      <div className="mx-auto max-w-3xl px-6 lg:px-10">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.5em] text-emerald-deep/80">
            Tavsiyalar
          </p>
          <h2 className="mt-6 font-display text-4xl leading-[1.2] md:text-5xl text-emerald-deep">
            Fikringiz biz uchun
            <span className="italic text-gradient-gold inline-block pb-2"> qadrli</span>
          </h2>
          <p className="mt-4 text-emerald-deep/70">
            Tavsiya yoki taklifingizni yuboring — to'g'ridan-to'g'ri egasiga yetib boradi.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-12 space-y-5">
          <div>
            <label htmlFor="fb-email" className="block text-xs uppercase tracking-[0.3em] text-emerald-deep/80 mb-2">
              Email
            </label>
            <input
              id="fb-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="siz@example.com"
              className="w-full rounded-2xl border border-emerald-deep/20 bg-white px-5 py-3 text-emerald-deep placeholder:text-emerald-deep/70 focus:outline-none focus:ring-2 focus:ring-gold/60"
            />
          </div>
          <div>
            <label htmlFor="fb-message" className="block text-xs uppercase tracking-[0.3em] text-emerald-deep/80 mb-2">
              Tavsiya
            </label>
            <textarea
              id="fb-message"
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Fikringizni yozing..."
              className="w-full rounded-2xl border border-emerald-deep/20 bg-white px-5 py-3 text-emerald-deep placeholder:text-emerald-deep/70 focus:outline-none focus:ring-2 focus:ring-gold/60 resize-none"
            />
          </div>
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-full bg-emerald-deep px-8 py-3 text-xs uppercase tracking-[0.3em] text-cream transition-all hover:bg-gold hover:text-emerald-deep disabled:opacity-60"
            >
              {loading ? "Yuborilmoqda..." : "Yuborish"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
