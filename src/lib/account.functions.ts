import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    // Collect hotels owned by this user
    const { data: hotels } = await supabaseAdmin
      .from("hotels")
      .select("id")
      .eq("owner_id", userId);
    const hotelIds = (hotels ?? []).map((h: any) => h.id);

    if (hotelIds.length > 0) {
      // Audit-trail protection: never hard-delete bookings with financial impact.
      // Block account deletion if any paid or confirmed booking exists.
      const { data: protectedBookings, error: bErr } = await supabaseAdmin
        .from("bookings")
        .select("id")
        .in("hotel_id", hotelIds)
        .or("payment_status.eq.paid,status.eq.confirmed")
        .limit(1);
      if (bErr) throw new Error(bErr.message);
      if ((protectedBookings ?? []).length > 0) {
        throw new Error(
          "Akkauntni o'chirib bo'lmaydi: sizning mehmonxonalaringizda to'langan yoki tasdiqlangan bronlar mavjud. " +
            "Iltimos, ushbu bronlarni yakunlang yoki super-egaga murojaat qiling."
        );
      }

      // Cancel any remaining (unpaid/pending) bookings instead of deleting them,
      // so the financial/audit trail is preserved.
      await supabaseAdmin
        .from("bookings")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .in("hotel_id", hotelIds)
        .neq("status", "cancelled");

      // Safe to remove hotel content that has no financial trail.
      await supabaseAdmin.from("hotel_images").delete().in("hotel_id", hotelIds);
      await supabaseAdmin.from("rooms").delete().in("hotel_id", hotelIds);
      await supabaseAdmin.from("hotels").delete().in("id", hotelIds);
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUserAsOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { userId: callerId, supabase } = context;

    // Verify caller is super_owner via RLS-respecting client
    const { data: roles, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    if (roleErr) throw new Error(roleErr.message);
    const isOwner = (roles ?? []).some((r: any) => r.role === "super_owner");
    if (!isOwner) throw new Error("Forbidden");

    if (data.userId === callerId) throw new Error("O'zingizni o'chira olmaysiz");

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
