import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StaffAcademyAsset = {
  id: string;
  title: string;
  description: string;
  kind: "infographic" | "script" | "image" | "video" | "document";
  storage_path: string;
  file_url: string;
  thumbnail_url: string | null;
  mime_type: string | null;
  file_size: number | null;
  tags: string[];
  status: "active" | "draft";
  sort_order: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

const COLS =
  "id,title,description,kind,storage_path,file_url,thumbnail_url,mime_type,file_size,tags,status,sort_order,uploaded_by,created_at,updated_at";

function mapRow(row: any): StaffAcademyAsset {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    kind: row.kind,
    storage_path: String(row.storage_path ?? ""),
    file_url: String(row.file_url ?? ""),
    thumbnail_url: row.thumbnail_url ?? null,
    mime_type: row.mime_type ?? null,
    file_size: row.file_size != null ? Number(row.file_size) : null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    status: row.status,
    sort_order: Number(row.sort_order ?? 0),
    uploaded_by: row.uploaded_by ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

const STAFF_DOMAIN = "@365motorsales.com";

function isStaffEmailAddr(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase().endsWith(STAFF_DOMAIN);
}

/** Admin + verified @365motorsales.com email — Staff Academy admin gate. */
async function isAdmin(context: any): Promise<boolean> {
  const email: string | undefined = context.claims?.email;
  const verifiedClaim =
    context.claims?.email_verified ??
    context.claims?.user_metadata?.email_verified;
  if (verifiedClaim === false) return false;
  if (!email || !isStaffEmailAddr(email)) return false;
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  return !!data;
}

const BUCKET = "staff-academy-assets";

/** Sign the storage_path so the private bucket asset can be viewed/downloaded. */
async function signRow(context: any, row: StaffAcademyAsset): Promise<StaffAcademyAsset> {
  if (!row.storage_path) return row;
  const { data } = await context.supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, 60 * 60);
  const signed = data?.signedUrl ?? row.file_url;
  return { ...row, file_url: signed };
}

export const listStaffAcademyAssets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffAcademyAsset[]> => {
    const { data, error } = await (context.supabase as any)
      .from("staff_academy_assets")
      .select(COLS)
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false });
    if (error) return [];
    const rows = (data ?? []).map(mapRow);
    return Promise.all(rows.map((r: StaffAcademyAsset) => signRow(context, r)));
  });

export const listAllStaffAcademyAssetsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffAcademyAsset[]> => {
    if (!(await isAdmin(context))) throw new Error("Forbidden");
    const { data, error } = await (context.supabase as any)
      .from("staff_academy_assets")
      .select(COLS)
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []).map(mapRow);
    return Promise.all(rows.map((r: StaffAcademyAsset) => signRow(context, r)));
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  kind: z.enum(["infographic", "script", "image", "video", "document"]),
  storage_path: z.string().min(1).max(500),
  file_url: z.string().min(1).max(1000),
  thumbnail_url: z.string().url().max(1000).nullable().optional(),
  mime_type: z.string().max(120).nullable().optional(),
  file_size: z.number().int().nonnegative().nullable().optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
  status: z.enum(["active", "draft"]).default("active"),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const upsertStaffAcademyAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => upsertSchema.parse(input))
  .handler(async ({ data, context }): Promise<StaffAcademyAsset> => {
    if (!(await isAdmin(context))) throw new Error("Forbidden");
    const payload = {
      ...data,
      thumbnail_url: data.thumbnail_url ?? null,
      mime_type: data.mime_type ?? null,
      file_size: data.file_size ?? null,
      uploaded_by: context.userId,
    };
    const { data: row, error } = await (context.supabase as any)
      .from("staff_academy_assets")
      .upsert(payload, { onConflict: "id" })
      .select(COLS)
      .single();
    if (error) throw new Error(error.message);
    return mapRow(row);
  });

export const deleteStaffAcademyAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    if (!(await isAdmin(context))) throw new Error("Forbidden");
    // Fetch storage_path to also remove the file.
    const { data: row } = await (context.supabase as any)
      .from("staff_academy_assets")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await (context.supabase as any)
      .from("staff_academy_assets")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row?.storage_path) {
      await context.supabase.storage.from(BUCKET).remove([row.storage_path]);
    }
    return { ok: true };
  });
