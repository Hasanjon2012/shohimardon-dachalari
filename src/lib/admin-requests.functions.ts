import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertSuperOwner(supabase: any, callerId: string) {
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId);
  if (error) throw new Error(error.message);
  if (!(roles ?? []).some((r: any) => r.role === "super_owner")) {
    throw new Error("Forbidden");
  }
}

export const listUsersForOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperOwner(context.supabase, context.userId);

    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const { data: reqs } = await supabaseAdmin.from("admin_requests").select("user_id, status");

    // Fetch emails via auth admin (paginate up to 1000)
    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailMap = new Map<string, string>();
    for (const u of usersPage?.users ?? []) emailMap.set(u.id, u.email ?? "");

    return (profs ?? []).map((p: any) => ({
      ...p,
      email: emailMap.get(p.id) ?? "",
      roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
      adminRequest: (reqs ?? []).find((r: any) => r.user_id === p.id)?.status ?? null,
    }));
  });

export const decideAdminRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      userId: z.string().uuid(),
      approve: z.boolean(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertSuperOwner(context.supabase, context.userId);

    if (data.approve) {
      // Grant hotel_admin role
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "hotel_admin" }, { onConflict: "user_id,role" });
      if (roleErr) throw new Error(roleErr.message);
    }
    const { error } = await supabaseAdmin
      .from("admin_requests")
      .update({ status: data.approve ? "approved" : "rejected", decided_at: new Date().toISOString() })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
