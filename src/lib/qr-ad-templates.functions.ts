import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdminRoleAudited } from "@/integrations/supabase/admin-middleware";
import { isValidCategory, isValidSubcategory } from "@/lib/share-kit/categories";

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

// List active custom templates + hidden built-in ids + admin builtin category overrides (any authed staff)
export const listShareKitCustomTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as any;
    const [tplRes, hidRes, biRes] = await Promise.all([
      supabase
        .from("share_kit_custom_templates")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase.from("share_kit_hidden_builtins").select("template_id"),
      supabase.from("share_kit_builtin_categories").select("template_id, category, subcategory"),
    ]);
    if (tplRes.error) throw new Error(tplRes.error.message);
    if (hidRes.error) throw new Error(hidRes.error.message);
    if (biRes.error) throw new Error(biRes.error.message);
    return {
      templates: (tplRes.data ?? []) as CustomTemplateRow[],
      hiddenBuiltins: ((hidRes.data ?? []) as { template_id: string }[]).map((r) => r.template_id),
      builtinCategories: (biRes.data ?? []) as BuiltinCategoryRow[],
    };
  });


export const upsertShareKitCustomTemplate = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("shareKit.upsertTemplate")])
  .inputValidator((input: unknown) => upsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const payload = { ...data, created_by: userId };
    if (data.id) {
      const { error } = await supabase
        .from("share_kit_custom_templates")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("share_kit_custom_templates")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteShareKitCustomTemplate = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("shareKit.deleteTemplate")])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { error } = await supabase
      .from("share_kit_custom_templates")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setBuiltinHidden = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("shareKit.setBuiltinHidden")])
  .inputValidator((input: { templateId: string; hidden: boolean }) =>
    z.object({ templateId: z.string().min(1).max(100), hidden: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    if (data.hidden) {
      const { error } = await supabase
        .from("share_kit_hidden_builtins")
        .upsert({ template_id: data.templateId, hidden_by: userId });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("share_kit_hidden_builtins")
        .delete()
        .eq("template_id", data.templateId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// Update only QR placement on an existing custom template.
// Used by the auto-fit / re-detect flow so we don't have to resend image_url etc.
export const updateShareKitTemplateQrPlacement = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("shareKit.updateQrPlacement")])
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
      .from("share_kit_custom_templates")
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

export const setShareKitCustomCategory = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("shareKit.setCustomCategory")])
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
      .from("share_kit_custom_templates")
      .update({ category: data.category, subcategory: data.subcategory })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setShareKitBuiltinCategory = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("shareKit.setBuiltinCategory")])
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
        .from("share_kit_builtin_categories")
        .delete()
        .eq("template_id", data.templateId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await supabase
      .from("share_kit_builtin_categories")
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
