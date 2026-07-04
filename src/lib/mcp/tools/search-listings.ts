import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const CATEGORY_SLUGS = [
  "cars",
  "motorcycles",
  "trucks",
  "heavy-equipment",
  "boats",
  "parts",
  "agricultural",
  "industrial",
] as const;

/**
 * Public search over active listings. Uses the publishable key so RLS enforces
 * the same visibility anonymous browsers get on /browse/*. No PII, no contact
 * fields — a compact projection safe for AI clients.
 */
export default defineTool({
  name: "search_listings",
  title: "Search 365 MotorSales listings",
  description:
    "Search public 365 MotorSales Philippines marketplace listings by category, location and price. Returns active listings only.",
  inputSchema: {
    category: z
      .enum(CATEGORY_SLUGS)
      .describe("Marketplace category slug, e.g. 'cars', 'motorcycles', 'parts'."),
    query: z
      .string()
      .trim()
      .max(120)
      .optional()
      .describe("Optional keyword filter matched against the listing title."),
    region: z.string().trim().max(60).optional().describe("Philippine region name, e.g. 'NCR'."),
    city: z.string().trim().max(60).optional().describe("City or town name."),
    min_price_php: z.number().int().nonnegative().optional(),
    max_price_php: z.number().int().nonnegative().optional(),
    limit: z.number().int().min(1).max(25).optional().describe("Max results (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      return {
        content: [{ type: "text", text: "Server not configured (missing Supabase env)." }],
        isError: true,
      };
    }
    const supabase = createClient(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const limit = input.limit ?? 10;
    let q = supabase
      .from("listings")
      .select(
        "id,title,price_php,monthly_php,negotiable,region,city,category_slug,published_at",
      )
      .eq("status", "active")
      .eq("category_slug", input.category)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (input.query) q = q.ilike("title", `%${input.query}%`);
    if (input.region) q = q.eq("region", input.region);
    if (input.city) q = q.eq("city", input.city);
    if (input.min_price_php != null) q = q.gte("price_php", input.min_price_php);
    if (input.max_price_php != null) q = q.lte("price_php", input.max_price_php);

    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    const rows = data ?? [];
    const summary = rows.length
      ? rows
          .map(
            (r: any) =>
              `- ${r.title} — ₱${r.price_php ?? "n/a"} — ${r.city ?? r.region ?? "PH"} — https://365motorsales.com/listing/${r.id}`,
          )
          .join("\n")
      : "No matching listings.";

    return {
      content: [{ type: "text", text: summary }],
      structuredContent: { count: rows.length, listings: rows },
    };
  },
});
