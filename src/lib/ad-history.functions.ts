import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminRoleAudited } from "@/integrations/supabase/admin-middleware";

const filterSchema = z.object({
  source: z.enum(["advertisement", "ad_inquiry", "promotion"]).optional(),
  action: z.enum(["created", "updated", "deleted"]).optional(),
  sourceId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(500).optional(),
});

export const listAdHistory = createServerFn({ method: "GET" })
  .middleware([requireAdminRoleAudited("adHistory.list")])
  .inputValidator((input: unknown) => filterSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    let q = supabase
      .from("advertisement_history")
      .select("id, source, source_id, action, snapshot, previous, changed_by, changed_at, note")
      .order("changed_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.source) q = q.eq("source", data.source);
    if (data.action) q = q.eq("action", data.action);
    if (data.sourceId) q = q.eq("source_id", data.sourceId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { entries: rows ?? [] };
  });
