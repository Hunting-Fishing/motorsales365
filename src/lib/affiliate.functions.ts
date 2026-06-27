import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type AffiliateLinkPublic = {
  supplier_slug: string;
  label: string;
  region: string;
  logo_url: string | null;
  priority: number;
};

/** Public: list active affiliate suppliers (no secret/template fields). */
export const listAffiliateSuppliers = createServerFn({ method: "GET" }).handler(
  async (): Promise<AffiliateLinkPublic[]> => {
    const sb = publicClient();
    const { data, error } = await sb
      .from("affiliate_links" as any)
      .select("supplier_slug,label,region,logo_url,priority")
      .eq("is_active", true)
      .order("priority", { ascending: true });
    if (error) return [];
    return (data as any) ?? [];
  },
);

/** Build the outbound /api/public/go URL for a supplier + query/context. */
export function buildGoUrl(params: {
  slug: string;
  query: string;
  listingId?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
}) {
  const q = new URLSearchParams();
  q.set("q", params.query);
  if (params.listingId) q.set("lid", params.listingId);
  if (params.make) q.set("mk", params.make);
  if (params.model) q.set("md", params.model);
  if (params.year) q.set("yr", String(params.year));
  return `/api/public/go/${encodeURIComponent(params.slug)}?${q.toString()}`;
}

// ---- Admin ----

export const adminListAffiliateLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("affiliate_links" as any)
      .select("*")
      .order("priority", { ascending: true });
    if (error) throw error;
    return data as any[];
  });

export const adminUpsertAffiliateLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id?: string;
      supplier_slug: string;
      label: string;
      region: string;
      logo_url?: string | null;
      url_template: string;
      affiliate_id_env?: string | null;
      network?: string | null;
      commission_note?: string | null;
      is_active: boolean;
      priority: number;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const payload = { ...data };
    delete (payload as any).id;
    if (data.id) {
      const { error } = await context.supabase
        .from("affiliate_links" as any)
        .update(payload)
        .eq("id", data.id);
      if (error) throw error;
    } else {
      const { error } = await context.supabase
        .from("affiliate_links" as any)
        .insert(payload);
      if (error) throw error;
    }
    return { ok: true };
  });

export const adminDeleteAffiliateLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("affiliate_links" as any)
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminAffiliateClickStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await context.supabase
      .from("affiliate_clicks" as any)
      .select("supplier_slug")
      .gte("created_at", since);
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const row of (data as any[]) ?? []) {
      counts[row.supplier_slug] = (counts[row.supplier_slug] ?? 0) + 1;
    }
    return counts;
  });

/** Admin: verify Involve Asia credentials by authenticating. */
export const adminPingInvolveAsia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { pingInvolveAsia } = await import("@/lib/involve-asia.server");
    return pingInvolveAsia();
  });
