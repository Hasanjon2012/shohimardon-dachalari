import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { deleteMyAccount } from "@/lib/account.functions";
import { useAuth } from "@/hooks/use-auth";

export function DeleteAccountButton({ confirmMessage }: { confirmMessage?: string }) {
  const fn = useServerFn(deleteMyAccount);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    const msg =
      confirmMessage ??
      "Akkauntingizni butunlay o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.";
    if (!window.confirm(msg)) return;
    setLoading(true);
    try {
      await fn();
      await signOut();
      toast.success("Akkauntingiz o'chirildi");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="rounded-full border border-red-300 bg-white px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
    >
      {loading ? "O'chirilmoqda..." : "Akkauntni o'chirish"}
    </button>
  );
}
