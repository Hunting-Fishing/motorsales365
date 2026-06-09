import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

const Body = z.object({
  orgId: z.string().uuid(),
  userId: z.string().uuid(),
  newPassword: z.string().min(8).max(72),
});

function admin() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const Route = createFileRoute("/api/seller/staff/reset-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization") ?? "";
          const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
          if (!token) return new Response("Unauthorized", { status: 401 });
          const sb = admin();
          const { data: userData } = await sb.auth.getUser(token);
          if (!userData.user) return new Response("Unauthorized", { status: 401 });
          const parsed = Body.safeParse(await request.json());
          if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
          const { orgId, userId, newPassword } = parsed.data;

          const { data: canManage } = await sb.rpc("can_manage_org", {
            _user_id: userData.user.id,
            _org_id: orgId,
          });
          if (!canManage) return new Response("Forbidden", { status: 403 });

          // Confirm target is a staff member of this org
          const { data: mem } = await sb
            .from("organization_members")
            .select("user_id, role")
            .eq("organization_id", orgId)
            .eq("user_id", userId)
            .maybeSingle();
          if (!mem || (mem as any).role === "owner") {
            return new Response("Cannot reset password for this user", { status: 403 });
          }

          const { error } = await sb.auth.admin.updateUserById(userId, { password: newPassword });
          if (error) return Response.json({ error: error.message }, { status: 400 });
          return Response.json({ ok: true });
        } catch (e: any) {
          return Response.json({ error: e?.message ?? "Server error" }, { status: 500 });
        }
      },
    },
  },
});
