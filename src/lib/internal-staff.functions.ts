import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const STAFF_DOMAIN = "@365motorsales.com";

export type InternalStaffMember = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  manager_user_id: string | null;
  is_admin: boolean;
};

async function requireStaff(ctx: {
  supabase: any;
  userId: string;
  claims: any;
}) {
  const email = (ctx.claims?.email as string | undefined)?.toLowerCase() ?? "";
  if (!email.endsWith(STAFF_DOMAIN)) throw new Error("Not permitted");
  return email;
}

async function requireAdmin(ctx: { supabase: any; userId: string; claims: any }) {
  await requireStaff(ctx);
  const { data } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin only");
}

/** List every @365motorsales.com staff member with manager pointer. */
export const listInternalStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InternalStaffMember[]> => {
    await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Pull profiles first (fast path for is_staff_account = true)
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, avatar_url, manager_user_id, is_staff_account")
      .eq("is_staff_account", true);
    if (error) throw new Error(error.message);

    // Fetch emails + admin roles in parallel
    const ids = (profiles ?? []).map((p: any) => p.id);
    if (ids.length === 0) return [];

    const [{ data: rolesData }, ...userLookups] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      ...ids.map((id: string) => supabaseAdmin.auth.admin.getUserById(id)),
    ]);

    const adminSet = new Set(
      (rolesData ?? [])
        .filter((r: any) => r.role === "admin")
        .map((r: any) => r.user_id),
    );

    const emailById = new Map<string, string | null>();
    userLookups.forEach((u: any, i: number) => {
      emailById.set(ids[i], u?.data?.user?.email ?? null);
    });

    return (profiles ?? []).map((p: any) => ({
      user_id: p.id,
      full_name: p.full_name ?? null,
      email: emailById.get(p.id) ?? null,
      avatar_url: p.avatar_url ?? null,
      manager_user_id: p.manager_user_id ?? null,
      is_admin: adminSet.has(p.id),
    }));
  });

/** Admin-only: create a new @365 staff account with a specific manager. */
export const createInternalStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().email(),
        fullName: z.string().min(1),
        password: z.string().min(8),
        managerUserId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);

    const email = data.email.trim().toLowerCase();
    if (!email.endsWith(STAFF_DOMAIN)) {
      throw new Error(`Email must end with ${STAFF_DOMAIN}`);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        signup_intent: "internal_staff",
        manager_user_id: data.managerUserId,
      },
    });
    if (error || !created?.user) throw new Error(error?.message ?? "Failed to create user");

    // Ensure manager_user_id is applied even if trigger raced.
    await supabaseAdmin
      .from("profiles")
      .update({ manager_user_id: data.managerUserId, full_name: data.fullName })
      .eq("id", created.user.id);

    return { user_id: created.user.id, email };
  });

/** Admin-only: re-parent a staff member. Prevents cycles. */
export const updateStaffManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        managerUserId: z.string().uuid().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (data.managerUserId === data.userId) throw new Error("Cannot report to yourself");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Cycle check: walk up from proposed manager, make sure we don't hit userId.
    if (data.managerUserId) {
      let cursor: string | null = data.managerUserId;
      for (let i = 0; i < 50 && cursor; i++) {
        if (cursor === data.userId) throw new Error("Would create a cycle");
        const res: { data: { manager_user_id: string | null } | null } =
          await supabaseAdmin
            .from("profiles")
            .select("manager_user_id")
            .eq("id", cursor)
            .maybeSingle();
        cursor = res.data?.manager_user_id ?? null;
      }
    }


    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ manager_user_id: data.managerUserId })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin-only: disable a staff account. */
export const deactivateInternalStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: "876000h", // ~100 years
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
