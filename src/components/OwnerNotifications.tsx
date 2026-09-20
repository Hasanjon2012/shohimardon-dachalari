import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export function OwnerNotifications() {
  const { role } = useAuth();
  const [count, setCount] = useState(0);
  const prevCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (role !== "super_owner") return;
    let active = true;

    const fetchCount = async () => {
      const { count: n } = await supabase
        .from("admin_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (!active) return;
      const next = n ?? 0;
      if (prevCountRef.current !== null && next > prevCountRef.current) {
        toast.info("Yangi admin arizasi keldi", {
          description: "Foydalanuvchilar bo'limidan ko'rishingiz mumkin",
        });
      }
      prevCountRef.current = next;
      setCount(next);
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [role]);

  if (role !== "super_owner") return null;

  return (
    <Link
      to="/owner/users"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-emerald-deep hover:bg-emerald-tint"
      aria-label={`${count} ta yangi admin arizasi`}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

