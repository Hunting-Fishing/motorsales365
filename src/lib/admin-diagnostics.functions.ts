import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type UserPermissionDossier =
  | {
      not_found: true;
    }
  | {
      not_found: false;
      user_id: string;
      email: string | null;
      full_name: string | null;
      seller_type: string | null;
      roles: string[];
      created_at: string | null;
      last_sign_in_at: string | null;
    };

export const getUserPermissionDossier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string }) => {
    const email = (input?.email ?? "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Enter a valid email address.");
    }
    return { email };
  })
  .handler(async ({ data, context }): Promise<UserPermissionDossier> => {
    // Caller must be an admin.
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find the user by email — paginate up to 20 pages of 200.
    let found:
      | { id: string; email: string | null; created_at: string | null; last_sign_in_at: string | null }
      | null = null;
    const needle = data.email;
    for (let page = 1; page <= 20 && !found; page++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) throw new Error(error.message);
      const u = list.users.find((u) => (u.email ?? "").toLowerCase() === needle);
      if (u) {
        found = {
          id: u.id,
          email: u.email ?? null,
          created_at: u.created_at ?? null,
          last_sign_in_at: u.last_sign_in_at ?? null,
        };
        break;
      }
      if (list.users.length < 200) break;
    }

    if (!found) return { not_found: true };

    const [{ data: roleRows }, { data: profileRow }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("role").eq("user_id", found.id),
      supabaseAdmin
        .from("profiles")
        .select("full_name, seller_type")
        .eq("id", found.id)
        .maybeSingle(),
    ]);

    return {
      not_found: false,
      user_id: found.id,
      email: found.email,
      full_name: (profileRow as { full_name: string | null } | null)?.full_name ?? null,
      seller_type:
        (profileRow as { seller_type: string | null } | null)?.seller_type ?? null,
      roles: (roleRows ?? []).map((r: { role: string }) => r.role),
      created_at: found.created_at,
      last_sign_in_at: found.last_sign_in_at,
    };
  });
