import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STAFF_DOMAIN = "@365motorsales.com";

/**
 * Returns the user IDs of all auth users whose email ends with
 * @365motorsales.com. Used by the admin Users page to filter / flag
 * staff accounts without exposing emails to the client.
 *
 * Requires the caller to have an admin role (enforced via the user_roles
 * table). The actual lookup uses the service-role admin client.
 */
export const listStaffUserIds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // Caller must be an admin.
    const { data: adminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRow) throw new Error("Not permitted");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const ids: string[] = [];
    let page = 1;
    // perPage max is 1000; paginate defensively.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (error) throw new Error(error.message);
      const users = data?.users ?? [];
      for (const u of users) {
        if ((u.email ?? "").toLowerCase().endsWith(STAFF_DOMAIN)) {
          ids.push(u.id);
        }
      }
      if (users.length < 1000) break;
      page += 1;
      if (page > 20) break; // safety
    }
    return { ids };
  });
