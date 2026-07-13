import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type DocCheckCountry = {
  code: string;
  name: string;
  flag_emoji: string;
  region: string;
  slug: string;
  summary: string | null;
  currency: string | null;
  drives_on: string | null;
  sort_order: number;
  is_published: boolean;
};

export type DocCheckSection = {
  id: string;
  country_code: string;
  kind:
    | "quick_guide"
    | "buying"
    | "selling"
    | "import"
    | "export"
    | "insurance"
    | "documents";
  title: string;
  body_md: string;
  sort_order: number;
  is_published: boolean;
};

export type DocCheckDocument = {
  id: string;
  country_code: string;
  code: string;
  name: string;
  description_md: string;
  who_issues: string | null;
  typical_cost: string | null;
  validity: string | null;
  sort_order: number;
};

export type DocCheckLink = {
  id: string;
  country_code: string;
  section_kind: string | null;
  label: string;
  url: string;
  sort_order: number;
};

export const listDocCheckCountries = createServerFn({ method: "GET" }).handler(
  async (): Promise<DocCheckCountry[]> => {
    const sb = publicClient();
    const { data, error } = await sb
      .from("doc_check_countries")
      .select("*")
      .eq("is_published", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as DocCheckCountry[];
  },
);

export const getDocCheckCountry = createServerFn({ method: "GET" })
  .inputValidator((input: { code: string }) =>
    z.object({ code: z.string().min(2).max(4).toLowerCase() }).parse(input),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    const [country, sections, docs, links] = await Promise.all([
      sb.from("doc_check_countries").select("*").eq("code", data.code).maybeSingle(),
      sb
        .from("doc_check_sections")
        .select("*")
        .eq("country_code", data.code)
        .eq("is_published", true)
        .order("sort_order", { ascending: true }),
      sb
        .from("doc_check_documents")
        .select("*")
        .eq("country_code", data.code)
        .order("sort_order", { ascending: true }),
      sb
        .from("doc_check_agency_links")
        .select("*")
        .eq("country_code", data.code)
        .order("sort_order", { ascending: true }),
    ]);
    if (country.error) throw new Error(country.error.message);
    if (!country.data || !(country.data as any).is_published) {
      return null;
    }
    return {
      country: country.data as DocCheckCountry,
      sections: (sections.data ?? []) as DocCheckSection[],
      documents: (docs.data ?? []) as DocCheckDocument[],
      links: (links.data ?? []) as DocCheckLink[],
    };
  });

// ---------- ADMIN mutations ----------

async function assertAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const upsertDocCheckCountry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    code: string;
    name: string;
    flag_emoji: string;
    region: string;
    slug: string;
    summary?: string | null;
    currency?: string | null;
    drives_on?: string | null;
    sort_order?: number;
    is_published?: boolean;
  }) =>
    z
      .object({
        code: z.string().min(2).max(4).toLowerCase(),
        name: z.string().min(1),
        flag_emoji: z.string().min(1),
        region: z.string().min(1),
        slug: z.string().min(1),
        summary: z.string().nullable().optional(),
        currency: z.string().nullable().optional(),
        drives_on: z.string().nullable().optional(),
        sort_order: z.number().int().optional(),
        is_published: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("doc_check_countries")
      .upsert(data, { onConflict: "code" });
    if (error) throw new Error(error.message);
    await context.supabase.from("doc_check_audit_log").insert({
      actor_id: context.userId,
      country_code: data.code,
      entity: "country",
      entity_id: data.code,
      action: "upsert",
      details: data,
    });
    return { ok: true };
  });

export const upsertDocCheckSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id?: string;
    country_code: string;
    kind: string;
    title: string;
    body_md: string;
    sort_order?: number;
    is_published?: boolean;
  }) =>
    z
      .object({
        id: z.string().uuid().optional(),
        country_code: z.string().min(2).max(4).toLowerCase(),
        kind: z.enum([
          "quick_guide",
          "buying",
          "selling",
          "import",
          "export",
          "insurance",
          "documents",
        ]),
        title: z.string().min(1),
        body_md: z.string(),
        sort_order: z.number().int().optional(),
        is_published: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const row: any = { ...data };
    const { error } = await context.supabase.from("doc_check_sections").upsert(row);
    if (error) throw new Error(error.message);
    await context.supabase.from("doc_check_audit_log").insert({
      actor_id: context.userId,
      country_code: data.country_code,
      entity: "section",
      entity_id: data.id ?? null,
      action: "upsert",
      details: { kind: data.kind, title: data.title },
    });
    return { ok: true };
  });

export const deleteDocCheckSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("doc_check_sections")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertDocCheckDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id?: string;
    country_code: string;
    code: string;
    name: string;
    description_md: string;
    who_issues?: string | null;
    typical_cost?: string | null;
    validity?: string | null;
    sort_order?: number;
  }) =>
    z
      .object({
        id: z.string().uuid().optional(),
        country_code: z.string().min(2).max(4).toLowerCase(),
        code: z.string().min(1),
        name: z.string().min(1),
        description_md: z.string(),
        who_issues: z.string().nullable().optional(),
        typical_cost: z.string().nullable().optional(),
        validity: z.string().nullable().optional(),
        sort_order: z.number().int().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("doc_check_documents")
      .upsert(data, { onConflict: "country_code,code" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDocCheckDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("doc_check_documents")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertDocCheckLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id?: string;
    country_code: string;
    section_kind?: string | null;
    label: string;
    url: string;
    sort_order?: number;
  }) =>
    z
      .object({
        id: z.string().uuid().optional(),
        country_code: z.string().min(2).max(4).toLowerCase(),
        section_kind: z.string().nullable().optional(),
        label: z.string().min(1),
        url: z.string().url(),
        sort_order: z.number().int().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("doc_check_agency_links").upsert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDocCheckLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("doc_check_agency_links")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
