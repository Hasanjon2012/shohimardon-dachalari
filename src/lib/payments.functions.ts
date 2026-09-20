import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Simulated payment confirmation. In production this should be invoked by a
// signed webhook from the payment provider (Click/Payme), not by the user.
// Until then, we restrict who can flip a booking to "paid" to the owner of
// the booking, and we perform the write server-side using the service role
// so payment_status cannot be tampered with from the client.
export const confirmBookingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        bookingId: z.string().uuid(),
        method: z.enum(["click", "payme"]),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking, error: readErr } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, hotel_id, status, payment_status, payment_expires_at")
      .eq("id", data.bookingId)
      .single();
    if (readErr || !booking) throw new Error("Bron topilmadi");

    // Only the hotel owner or a super_owner may confirm a booking as paid.
    // Guests MUST NOT be able to self-confirm — payment confirmation is
    // performed either by the receiving hotel (offline cash acknowledgement)
    // or by a signed webhook from the payment provider (Click/Payme).
    const [{ data: hotel }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("hotels").select("owner_id").eq("id", booking.hotel_id).single(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const isSuper = (roles ?? []).some((r) => r.role === "super_owner");
    const isHotelOwner = hotel?.owner_id === userId;
    if (!isSuper && !isHotelOwner) {
      console.warn(
        `[payments] Unauthorized confirm attempt by user=${userId} booking=${data.bookingId}`,
      );
      throw new Error("Bu bronni tasdiqlashga ruxsat yo'q");
    }

    if (booking.payment_status === "paid") return { ok: true, alreadyPaid: true };
    if (booking.status !== "pending_payment") {
      throw new Error("Bu bron to'lovni qabul qila olmaydi");
    }
    if (
      booking.payment_expires_at &&
      new Date(booking.payment_expires_at).getTime() < Date.now()
    ) {
      throw new Error("To'lov muddati o'tgan");
    }

    const { error: updErr } = await supabaseAdmin
      .from("bookings")
      .update({
        payment_status: "paid",
        payment_method: data.method,
        paid_at: new Date().toISOString(),
        status: "confirmed",
      })
      .eq("id", data.bookingId);
    if (updErr) throw new Error(updErr.message);

    console.info(
      `[payments] Booking confirmed by ${isSuper ? "super_owner" : "hotel_owner"}=${userId} booking=${data.bookingId} method=${data.method}`,
    );
    return { ok: true };
  });

