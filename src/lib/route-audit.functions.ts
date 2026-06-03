import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminRoleAudited } from "@/integrations/supabase/admin-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Input = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().datetime().nullable().optional(), // created_at ISO
  role: z
    .enum(["admin", "moderator", "shop_manager", "ads_manager", "support", "org_manager"])
    .nullable()
    .optional(),
  outcome: z.enum(["allowed", "denied", "error"]).nullable().optional(),
  actorId: z.string().uuid().nullable().optional(),
  labelContains: z.string().max(200).nullable().optional(),
});

export type RouteAuditRow = {
  id: string;
  actor_id: string;
  actor_name: string | null;
  role_required: string;
  route_label: string;
  method: string | null;
  outcome: string;
  error_message: string | null;
  duration_ms: number | null;
  ip: string | null;
  user_agent: string | null;
  target_summary: Record<string, unknown> | null;
  created_at: string;
};

export const listRouteAuditLog = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("audit.listRouteAccess")])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<{ rows: RouteAuditRow[]; nextCursor: string | null }> => {
    let q = supabaseAdmin
      .from("route_audit_log")
      .select(
        "id,actor_id,role_required,route_label,method,outcome,error_message,duration_ms,ip,user_agent,target_summary,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit + 1);

    if (data.cursor) q = q.lt("created_at", data.cursor);
    if (data.role) q = q.eq("role_required", data.role);
    if (data.outcome) q = q.eq("outcome", data.outcome);
    if (data.actorId) q = q.eq("actor_id", data.actorId);
    if (data.labelContains) {
      const safe = data.labelContains.replace(/[%,()]/g, " ");
      q = q.ilike("route_label", `%${safe}%`);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const list = (rows ?? []) as Array<Omit<RouteAuditRow, "actor_name">>;
    const hasMore = list.length > data.limit;
    const page = hasMore ? list.slice(0, data.limit) : list;
    const nextCursor = hasMore ? page[page.length - 1].created_at : null;

    // Resolve actor names
    const actorIds = Array.from(new Set(page.map((r) => r.actor_id)));
    let nameById = new Map<string, string | null>();
    if (actorIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id,full_name")
        .in("id", actorIds);
      nameById = new Map((profs ?? []).map((p: any) => [p.id, p.full_name ?? null]));
    }

    return {
      rows: page.map((r) => ({ ...r, actor_name: nameById.get(r.actor_id) ?? null })),
      nextCursor,
    };
  });
