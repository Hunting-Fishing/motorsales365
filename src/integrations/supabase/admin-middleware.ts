// Server-side admin gate. Wraps requireSupabaseAuth and additionally
// asserts the caller has the `admin` role via the SECURITY DEFINER
// has_role() function. Use on every destructive admin server fn.

import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "./auth-middleware";
import { supabaseAdmin } from "./client.server";

export const requireAdminRole = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const userId = (context as { userId?: string }).userId;
    if (!userId) {
      throw new Response("Unauthorized", { status: 401 });
    }
    const { data, error } = await supabaseAdmin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (error || data !== true) {
      throw new Response("Forbidden", { status: 403 });
    }
    return next({ context: { isAdmin: true as const } });
  });
