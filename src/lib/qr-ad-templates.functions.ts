import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdminRoleAudited } from "@/integrations/supabase/admin-middleware";
import { isValidCategory, isValidSubcategory } from "@/lib/qr-ads/categories";

export type CustomTemplateRow = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  image_url: string;
  width: number;
  height: number;
  qr_cx: number;
  qr_cy: number;
  qr_size: number;
  share_text: string;
  sort_order: number;
  active: boolean;
  category: string | null;
  subcategory: string | null;
};

export type BuiltinCategoryRow = {
  template_id: string;
  category: string | null;
  subcategory: string | null;
};


const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9_-]+$/),
  label: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  image_url: z.string().url().max(2000),
  width: z.number().int().min(100).max(8000),
  height: z.number().int().min(100).max(8000),
  qr_cx: z.number().min(0).max(1).default(0.85),
  qr_cy: z.number().min(0).max(1).default(0.85),
  qr_size: z.number().min(0.05).max(0.8).default(0.18),
  share_text: z.string().min(1).max(500).optional(),
  sort_order: z.number().int().min(0).max(10000).default(0),
  active: z.boolean().default(true),
});

const TPL_BUCKET = "share-kit-templates";
const TPL_PUBLIC_PREFIX = `/storage/v1/object/public/${TPL_BUCKET}/`;
const TPL_SIGNED_PREFIX = `/storage/v1/object/sign/${TPL_BUCKET}/`;

function extractTemplatePath(url: string): string | null {
  const i = url.indexOf(TPL_PUBLIC_PREFIX);
  if (i !== -1) return decodeURIComponent(url.slice(i + TPL_PUBLIC_PREFIX.length));
  const j = url.indexOf(TPL_SIGNED_PREFIX);
  if (j !== -1) {
    const rest = url.slice(j + TPL_SIGNED_PREFIX.length).split("?")[0];
    return decodeURIComponent(rest);
  }
  return null;
}

// List active custom templates + hidden built-in ids + admin builtin category overrides (any authed staff)
export const listQrAdTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as any;
    const [tplRes, hidRes, biRes] = await Promise.all([
      supabase
        .from("qr_ad_templates")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase.from("qr_ad_hidden_builtins").select("template_id"),
      supabase.from("qr_ad_builtin_categories").select("template_id, category, subcategory"),
    ]);
    if (tplRes.error) throw new Error(tplRes.error.message);
    if (hidRes.error) throw new Error(hidRes.error.message);
    if (biRes.error) throw new Error(biRes.error.message);

    // The share-kit-templates bucket is private; swap stored public URLs for
    // signed URLs so the client never issues 400s trying to load them.
    const rawTemplates = (tplRes.data ?? []) as CustomTemplateRow[];
    const paths = rawTemplates
      .map((r) => extractTemplatePath(r.image_url))
      .filter((p): p is string => !!p);
    let signedMap: Record<string, string> = {};
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage
        .from(TPL_BUCKET)
        .createSignedUrls(paths, 60 * 60);
      (signed ?? []).forEach((s: any, idx: number) => {
        if (s?.signedUrl) signedMap[paths[idx]] = s.signedUrl;
      });
    }
    const templates = rawTemplates.map((r) => {
      const p = extractTemplatePath(r.image_url);
      return p && signedMap[p] ? { ...r, image_url: signedMap[p] } : r;
    });

    return {
      templates,
      hiddenBuiltins: ((hidRes.data ?? []) as { template_id: string }[]).map((r) => r.template_id),
      builtinCategories: (biRes.data ?? []) as BuiltinCategoryRow[],
    };
  });



export const upsertQrAdTemplate = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("qrAds.upsertTemplate")])
  .inputValidator((input: unknown) => upsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const payload = { ...data, created_by: userId };
    if (data.id) {
      const { error } = await supabase
        .from("qr_ad_templates")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("qr_ad_templates")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteQrAdTemplate = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("qrAds.deleteTemplate")])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { error } = await supabase
      .from("qr_ad_templates")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setBuiltinHidden = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("qrAds.setBuiltinHidden")])
  .inputValidator((input: { templateId: string; hidden: boolean }) =>
    z.object({ templateId: z.string().min(1).max(100), hidden: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    if (data.hidden) {
      const { error } = await supabase
        .from("qr_ad_hidden_builtins")
        .upsert({ template_id: data.templateId, hidden_by: userId });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("qr_ad_hidden_builtins")
        .delete()
        .eq("template_id", data.templateId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// Update only QR placement on an existing custom template.
// Used by the auto-fit / re-detect flow so we don't have to resend image_url etc.
export const updateQrAdTemplateQrPlacement = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("qrAds.updateQrPlacement")])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        qr_cx: z.number().min(0).max(1),
        qr_cy: z.number().min(0).max(1),
        qr_size: z.number().min(0.05).max(0.8),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { error } = await supabase
      .from("qr_ad_templates")
      .update({ qr_cx: data.qr_cx, qr_cy: data.qr_cy, qr_size: data.qr_size })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


const categoryPayloadSchema = z.object({
  category: z.string().min(1).max(80).nullable(),
  subcategory: z.string().min(1).max(80).nullable(),
});

function validateCatPair(category: string | null, subcategory: string | null) {
  if (category !== null && !isValidCategory(category)) {
    throw new Error(`Unknown category: ${category}`);
  }
  if (subcategory !== null && !isValidSubcategory(subcategory)) {
    throw new Error(`Unknown subcategory: ${subcategory}`);
  }
}

export const setQrAdTemplateCategory = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("qrAds.setCustomCategory")])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
      })
      .merge(categoryPayloadSchema)
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    validateCatPair(data.category, data.subcategory);
    const { supabase } = context as any;
    const { error } = await supabase
      .from("qr_ad_templates")
      .update({ category: data.category, subcategory: data.subcategory })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setQrAdBuiltinCategory = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("qrAds.setBuiltinCategory")])
  .inputValidator((input: unknown) =>
    z
      .object({
        templateId: z.string().min(1).max(100),
      })
      .merge(categoryPayloadSchema)
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    validateCatPair(data.category, data.subcategory);
    const { supabase, userId } = context as any;
    if (data.category === null && data.subcategory === null) {
      const { error } = await supabase
        .from("qr_ad_builtin_categories")
        .delete()
        .eq("template_id", data.templateId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await supabase
      .from("qr_ad_builtin_categories")
      .upsert({
        template_id: data.templateId,
        category: data.category,
        subcategory: data.subcategory,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
