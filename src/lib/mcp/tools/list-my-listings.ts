import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

/**
 * Returns the signed-in user's own listings. Forwards the OAuth bearer token
 * to Supabase so RLS runs as that user — never trust user_id from tool input.
 */
export default defineTool({
  name: "list_my_listings",
  title: "List my listings",
  description:
    "List the signed-in user's own 365 MotorSales listings, most recent first. Requires the user to be authenticated.",
  inputSchema: {
    status: z
      .enum(["active", "draft", "pending_sale", "sold", "archived"])
      .optional()
      .describe("Optional status filter."),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return {
        content: [{ type: "text", text: "Not authenticated." }],
        isError: true,
      };
    }
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      return {
        content: [{ type: "text", text: "Server not configured." }],
        isError: true,
      };
    }
    const supabase = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    let q = supabase
      .from("listings")
      .select("id,title,status,price_php,category_slug,city,region,published_at,updated_at")
      .eq("user_id", ctx.getUserId())
      .order("updated_at", { ascending: false })
      .limit(input.limit ?? 20);
    if (input.status) q = q.eq("status", input.status);

    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const rows = data ?? [];
    const text = rows.length
      ? rows
          .map((r: any) => `- [${r.status}] ${r.title} — ₱${r.price_php ?? "n/a"} — ${r.id}`)
          .join("\n")
      : "You have no listings yet.";
    return {
      content: [{ type: "text", text }],
      structuredContent: { count: rows.length, listings: rows },
    };
  },
});
