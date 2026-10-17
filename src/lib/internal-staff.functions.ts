import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  STAFF_CHANGE_UNCONFIRMED,
  STAFF_DIRECTORY_UNAVAILABLE,
  STAFF_CREATION_UNKNOWN,
  staffManagerRowSchema,
} from "./internal-staff-contract";

const STAFF_DOMAIN = "@365motorsales.com";

export type InternalStaffMember = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  manager_user_id: string | null;
  is_admin: boolean;
};

type StaffContext = { supabase: SupabaseClient<Database>; userId: string; claims: unknown };
async function requireStaff(ctx: StaffContext) {
  const claims = z.object({ email: z.string() }).safeParse(ctx.claims);
  const email = claims.success ? claims.data.email.toLowerCase() : "";
  if (!email.endsWith(STAFF_DOMAIN)) throw new Error("Not permitted");
  return email;
}

async function requireAdmin(ctx: StaffContext) {
  await requireStaff(ctx);
  try {
    const { data, error } = await ctx.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", ctx.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error || data?.role !== "admin") throw new Error("Admin only");
  } catch {
    throw new Error("Admin only");
  }
}

/** List every @365motorsales.com staff member with manager pointer. */
export const listInternalStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InternalStaffMember[]> => {
    await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      // Pull profiles first (fast path for is_staff_account = true)
      const { data: profiles, error } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, avatar_url, manager_user_id, is_staff_account")
        .eq("is_staff_account", true);
      if (error || !Array.isArray(profiles)) throw new Error(STAFF_DIRECTORY_UNAVAILABLE);

      // Fetch emails + admin roles in parallel
      const ids = profiles.map((p) => p.id);
      if (ids.length === 0) return [];

      const [rolesResult, userLookups] = await Promise.all([
        supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
        Promise.all(ids.map((id) => supabaseAdmin.auth.admin.getUserById(id))),
      ]);
      if (
        rolesResult.error ||
        !Array.isArray(rolesResult.data) ||
        userLookups.some((u, i) => u.error || u.data.user?.id !== ids[i])
      )
        throw new Error(STAFF_DIRECTORY_UNAVAILABLE);

      const adminSet = new Set(
        rolesResult.data.filter((r) => r.role === "admin").map((r) => r.user_id),
      );

      const emailById = new Map<string, string | null>();
      userLookups.forEach((u, i) => {
        emailById.set(ids[i], u?.data?.user?.email ?? null);
      });

      return profiles.map((p) => ({
        user_id: p.id,
        full_name: p.full_name ?? null,
        email: emailById.get(p.id) ?? null,
        avatar_url: p.avatar_url ?? null,
        manager_user_id: p.manager_user_id ?? null,
        is_admin: adminSet.has(p.id),
      }));
    } catch {
      throw new Error(STAFF_DIRECTORY_UNAVAILABLE);
    }
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
    const { data: created, error } = await supabaseAdmin.auth.admin
      .createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          full_name: data.fullName,
          signup_intent: "internal_staff",
          manager_user_id: data.managerUserId,
        },
      })
      .catch(() => {
        throw new Error(STAFF_CREATION_UNKNOWN);
      });
    const identity = z
      .object({ id: z.string().uuid(), email: z.string().email() })
      .safeParse(created?.user);
    if (error || !identity.success || identity.data.email.toLowerCase() !== email)
      throw new Error(STAFF_CREATION_UNKNOWN);

    // Auth may already have committed. Never delete/roll back the account here,
    // retry creation automatically or claim downstream role/org provisioning.
    let profileConfirmed = false;
    try {
      const result = await supabaseAdmin
        .from("profiles")
        .update({ manager_user_id: data.managerUserId, full_name: data.fullName })
        .eq("id", identity.data.id)
        .select("id,manager_user_id,full_name")
        .maybeSingle();
      const profile = z
        .object({
          id: z.string().uuid(),
          manager_user_id: z.string().uuid().nullable(),
          full_name: z.string().nullable(),
        })
        .strict()
        .safeParse(result.data);
      profileConfirmed =
        !result.error &&
        profile.success &&
        profile.data.id.toLowerCase() === identity.data.id.toLowerCase() &&
        profile.data.manager_user_id?.toLowerCase() === data.managerUserId.toLowerCase() &&
        profile.data.full_name === data.fullName;
    } catch {
      /* Partial/unknown outcome is returned without private provider details. */
    }
    return { user_id: identity.data.id.toLowerCase(), email, profileConfirmed };
  });

/** Admin-only: bounded hierarchy precheck and confirmed returned row. Not an
 * atomic concurrent-cycle/role/offboarding authority protocol. */
export const updateStaffManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z
          .string()
          .uuid()
          .transform((value) => value.toLowerCase()),
        managerUserId: z
          .string()
          .uuid()
          .transform((value) => value.toLowerCase())
          .nullable(),
      })
      .strict()
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (data.managerUserId === data.userId) throw new Error("Cannot report to yourself");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      // Cycle check: walk up from proposed manager, make sure we don't hit userId.
      if (data.managerUserId) {
        let cursor: string | null = data.managerUserId;
        const visited = new Set([data.userId]);
        for (let depth = 0; cursor !== null; depth++) {
          if (visited.has(cursor)) throw new Error("Would create a cycle");
          if (depth >= 50) throw new Error(STAFF_CHANGE_UNCONFIRMED);
          visited.add(cursor);
          const res = await supabaseAdmin
            .from("profiles")
            .select("id,manager_user_id")
            .eq("id", cursor)
            .maybeSingle();
          const row = staffManagerRowSchema.safeParse(res.data);
          if (res.error || !row.success || row.data.id !== cursor)
            throw new Error(STAFF_CHANGE_UNCONFIRMED);
          cursor = row.data.manager_user_id;
        }
      }

      const { data: changed, error } = await supabaseAdmin
        .from("profiles")
        .update({ manager_user_id: data.managerUserId })
        .eq("id", data.userId)
        .select("id,manager_user_id")
        .maybeSingle();
      const row = staffManagerRowSchema.safeParse(changed);
      if (
        error ||
        !row.success ||
        row.data.id !== data.userId ||
        row.data.manager_user_id !== data.managerUserId
      )
        throw new Error(STAFF_CHANGE_UNCONFIRMED);
      return { ok: true as const, user_id: row.data.id, manager_user_id: row.data.manager_user_id };
    } catch {
      throw new Error(STAFF_CHANGE_UNCONFIRMED);
    }
  });

/** Admin-only: disable a staff account. */
export const deactivateInternalStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z
          .string()
          .uuid()
          .transform((value) => value.toLowerCase()),
      })
      .strict()
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin.auth.admin
      .updateUserById(data.userId, {
        ban_duration: "876000h", // ~100 years
      })
      .catch(() => {
        throw new Error(STAFF_CHANGE_UNCONFIRMED);
      });
    const user = z
      .object({ id: z.string().uuid(), banned_until: z.string().datetime({ offset: true }) })
      .safeParse(updated?.user);
    if (
      error ||
      !user.success ||
      user.data.id.toLowerCase() !== data.userId ||
      !Number.isFinite(Date.parse(user.data.banned_until)) ||
      Date.parse(user.data.banned_until) <= Date.now()
    )
      throw new Error(STAFF_CHANGE_UNCONFIRMED);
    // This only confirms the provider's returned sign-in restriction. It does
    // not revoke existing JWTs or synchronize roles/native roster/chat access.
    return {
      ok: true as const,
      user_id: data.userId,
      scope: "sign_in_restriction" as const,
      existingSessions: "unverified" as const,
    };
  });
