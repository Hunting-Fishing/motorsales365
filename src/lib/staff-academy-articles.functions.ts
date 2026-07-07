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

async function isAdmin(context: any): Promise<boolean> {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  return !!data;
}

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
