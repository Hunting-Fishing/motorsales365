import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DbArticleSection = {
  heading?: string;
  body?: string;
  bullets?: string[];
  cta?: { label: string; to: string; external?: boolean };
};

export type DbArticleRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: "playbook" | "feature" | "coming-soon" | "infographic" | "script" | "compliance";
  tags: string[];
  status: "active" | "coming-soon" | "draft";
  hero_emoji: string | null;
  hero_image_url: string | null;
  sections: DbArticleSection[];
  sort_order: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};

const SELECT_COLS =
  "id,slug,title,description,category,tags,status,hero_emoji,hero_image_url,sections,sort_order,created_at,updated_at,updated_by";

function mapRow(row: any): DbArticleRow {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    category: row.category,
    tags: Array.isArray(row.tags) ? row.tags : [],
    status: row.status,
    hero_emoji: row.hero_emoji ?? null,
    hero_image_url: row.hero_image_url ?? null,
    sections: Array.isArray(row.sections) ? row.sections : [],
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    updated_by: row.updated_by ?? null,
  };
}

const STAFF_DOMAIN = "@365motorsales.com";

function isStaffEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase().endsWith(STAFF_DOMAIN);
}

/**
 * Staff Academy admin gate: the caller must both hold the `admin` role
 * AND sign in with a verified @365motorsales.com email. This is stricter
 * than a plain `admin` check to prevent a non-staff admin from editing
 * internal training content.
 */
async function isStaffAdmin(context: any): Promise<boolean> {
  const email: string | undefined = context.claims?.email;
  // Reject only if the claim explicitly says the email is NOT verified.
  const verifiedClaim =
    context.claims?.email_verified ??
    context.claims?.user_metadata?.email_verified;
  if (verifiedClaim === false) return false;
  if (!email || !isStaffEmail(email)) return false;
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  return !!data;
}

// Back-compat alias so existing call sites keep working.
const isAdmin = isStaffAdmin;


/** Staff read: RLS returns published rows to staff, all rows to admins. */
export const listStaffAcademyArticles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DbArticleRow[]> => {
    const { data, error } = await (context.supabase as any)
      .from("staff_academy_articles")
      .select(SELECT_COLS)
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  });

/** Admin: same shape but explicit — used from the editor list. */
export const listAllStaffAcademyArticlesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DbArticleRow[]> => {
    if (!(await isAdmin(context))) throw new Error("Forbidden");
    const { data, error } = await (context.supabase as any)
      .from("staff_academy_articles")
      .select(SELECT_COLS)
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  });

export const getStaffAcademyArticleBySlug = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }): Promise<DbArticleRow | null> => {
    const { data: row, error } = await (context.supabase as any)
      .from("staff_academy_articles")
      .select(SELECT_COLS)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error || !row) return null;
    return mapRow(row);
  });

export const getStaffAcademyArticleById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<DbArticleRow | null> => {
    if (!(await isAdmin(context))) throw new Error("Forbidden");
    const { data: row, error } = await (context.supabase as any)
      .from("staff_academy_articles")
      .select(SELECT_COLS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    return row ? mapRow(row) : null;
  });

const sectionSchema = z.object({
  heading: z.string().max(200).optional(),
  body: z.string().max(8000).optional(),
  bullets: z.array(z.string().max(500)).max(30).optional(),
  cta: z
    .object({
      label: z.string().min(1).max(80),
      to: z.string().min(1).max(500),
      external: z.boolean().optional(),
    })
    .optional(),
});

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers, hyphens only"),
  title: z.string().min(1).max(200),
  description: z.string().max(500).default(""),
  category: z.enum(["playbook", "feature", "coming-soon", "infographic", "script", "compliance"]),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
  status: z.enum(["active", "coming-soon", "draft"]),
  hero_emoji: z.string().max(8).nullable().optional(),
  hero_image_url: z.string().url().max(500).nullable().optional(),
  sections: z.array(sectionSchema).max(40).default([]),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const upsertStaffAcademyArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => upsertSchema.parse(input))
  .handler(async ({ data, context }): Promise<DbArticleRow> => {
    if (!(await isAdmin(context))) throw new Error("Forbidden");
    const payload = {
      ...data,
      hero_emoji: data.hero_emoji ?? null,
      hero_image_url: data.hero_image_url ?? null,
      updated_by: context.userId,
    };
    const { data: row, error } = await (context.supabase as any)
      .from("staff_academy_articles")
      .upsert(payload, { onConflict: "id" })
      .select(SELECT_COLS)
      .single();
    if (error) throw new Error(error.message);
    return mapRow(row);
  });

export const deleteStaffAcademyArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    if (!(await isAdmin(context))) throw new Error("Forbidden");
    const { error } = await (context.supabase as any)
      .from("staff_academy_articles")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderStaffAcademyArticles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    if (!(await isAdmin(context))) throw new Error("Forbidden");
    // Sequential UPDATEs — small list, keeps it simple.
    for (let i = 0; i < data.ids.length; i++) {
      const { error } = await (context.supabase as any)
        .from("staff_academy_articles")
        .update({ sort_order: i })
        .eq("id", data.ids[i]);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export type ArticleHistoryRow = {
  id: string;
  article_id: string;
  action: "created" | "published" | "unpublished" | "status_changed" | "updated";
  from_status: string | null;
  to_status: string | null;
  title: string | null;
  slug: string | null;
  changed_by: string | null;
  changed_by_email: string | null;
  snapshot: any;
  created_at: string;
};

export const listStaffAcademyArticleHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ article_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<ArticleHistoryRow[]> => {
    if (!(await isAdmin(context))) throw new Error("Forbidden");
    const { data: rows, error } = await (context.supabase as any)
      .from("staff_academy_article_history")
      .select("id,article_id,action,from_status,to_status,title,slug,changed_by,snapshot,created_at")
      .eq("article_id", data.article_id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as any[];
    const ids = Array.from(new Set(list.map((r) => r.changed_by).filter(Boolean)));
    const emailMap = new Map<string, string>();
    if (ids.length > 0) {
      const { data: profs } = await (context.supabase as any)
        .from("profiles")
        .select("id,email")
        .in("id", ids);
      for (const p of profs ?? []) emailMap.set(p.id, p.email ?? "");
    }
    return list.map((r) => ({
      id: String(r.id),
      article_id: String(r.article_id),
      action: r.action,
      from_status: r.from_status ?? null,
      to_status: r.to_status ?? null,
      title: r.title ?? null,
      slug: r.slug ?? null,
      changed_by: r.changed_by ?? null,
      changed_by_email: r.changed_by ? emailMap.get(r.changed_by) ?? null : null,
      snapshot: r.snapshot ?? null,
      created_at: String(r.created_at ?? ""),
    }));
  });

export const recordStaffAcademyArticleView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().min(1).max(120),
        article_id: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await (context.supabase as any)
      .from("staff_academy_article_views")
      .insert({
        article_id: data.article_id ?? null,
        slug: data.slug,
        viewer_id: context.userId,
      });
    return { ok: true };
  });

export type ArticleViewStats = {
  views: number;
  unique_viewers: number;
  last_viewed_at: string | null;
  views_last_7d: number;
  views_last_30d: number;
  recent: { viewer_id: string | null; viewer_email: string | null; created_at: string }[];
};

export const getStaffAcademyArticleStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        article_id: z.string().uuid().nullable().optional(),
        slug: z.string().min(1).max(120).optional(),
      })
      .refine((v) => v.article_id || v.slug, "article_id or slug required")
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<ArticleViewStats> => {
    if (!(await isAdmin(context))) throw new Error("Forbidden");
    let query = (context.supabase as any)
      .from("staff_academy_article_views")
      .select("viewer_id,created_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (data.article_id) query = query.eq("article_id", data.article_id);
    else if (data.slug) query = query.eq("slug", data.slug);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as { viewer_id: string | null; created_at: string }[];
    const now = Date.now();
    const uniq = new Set<string>();
    let v7 = 0, v30 = 0;
    for (const r of list) {
      if (r.viewer_id) uniq.add(r.viewer_id);
      const t = new Date(r.created_at).getTime();
      if (now - t <= 7 * 864e5) v7++;
      if (now - t <= 30 * 864e5) v30++;
    }
    const last = list[0]?.created_at ?? null;

    const recentList: { viewer_id: string | null; created_at: string }[] = [];
    const seen = new Set<string>();
    for (const r of list) {
      const key = r.viewer_id ?? `anon-${r.created_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      recentList.push(r);
      if (recentList.length >= 10) break;
    }
    const ids = recentList.map((r) => r.viewer_id).filter(Boolean) as string[];
    const emailMap = new Map<string, string>();
    if (ids.length > 0) {
      const { data: profs } = await (context.supabase as any)
        .from("profiles")
        .select("id,email")
        .in("id", ids);
      for (const p of profs ?? []) emailMap.set(p.id, p.email ?? "");
    }

    return {
      views: list.length,
      unique_viewers: uniq.size,
      last_viewed_at: last,
      views_last_7d: v7,
      views_last_30d: v30,
      recent: recentList.map((r) => ({
        viewer_id: r.viewer_id,
        viewer_email: r.viewer_id ? emailMap.get(r.viewer_id) ?? null : null,
        created_at: r.created_at,
      })),
    };
  });


