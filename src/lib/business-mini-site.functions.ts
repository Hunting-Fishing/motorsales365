import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_ALBUMS_PER_BUSINESS = 12;
const MAX_PHOTOS_PER_ALBUM = 30;

async function assertEditor(supabase: any, userId: string, businessId: string) {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, owner_id, organization_id")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Business not found");
  if ((data as any).owner_id === userId) return;
  if ((data as any).organization_id) {
    const { data: m } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", (data as any).organization_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (m) return;
  }
  throw new Error("Not authorized");
}

/* ============== ALBUMS ============== */

export const upsertGalleryAlbum = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        businessId: z.string().uuid(),
        title: z.string().min(1).max(80),
        description: z.string().max(400).nullable().optional(),
        cover_url: z.string().url().nullable().optional(),
        sort_order: z.number().int().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { businessId, id, ...payload } = data;
    if (id) {
      const { error } = await supabase
        .from("business_gallery_albums")
        .update(payload as any)
        .eq("id", id)
        .eq("business_id", businessId);
      if (error) throw new Error(error.message);
      return { id };
    }
    // enforce per-business album cap
    const { count } = await supabase
      .from("business_gallery_albums")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);
    if ((count ?? 0) >= MAX_ALBUMS_PER_BUSINESS) {
      throw new Error(`Maximum ${MAX_ALBUMS_PER_BUSINESS} albums per business`);
    }
    const { data: row, error } = await supabase
      .from("business_gallery_albums")
      .insert({ business_id: businessId, ...payload } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id };
  });

export const deleteGalleryAlbum = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ businessId: z.string().uuid(), id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { error } = await supabase
      .from("business_gallery_albums")
      .delete()
      .eq("id", data.id)
      .eq("business_id", data.businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============== PHOTOS ============== */

export const addGalleryPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        businessId: z.string().uuid(),
        albumId: z.string().uuid(),
        photos: z
          .array(
            z.object({
              url: z.string().url().max(1000),
              caption: z.string().max(300).nullable().optional(),
            }),
          )
          .min(1)
          .max(MAX_PHOTOS_PER_ALBUM),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);

    const { count } = await supabase
      .from("business_gallery_photos")
      .select("id", { count: "exact", head: true })
      .eq("album_id", data.albumId);
    const existing = count ?? 0;
    if (existing + data.photos.length > MAX_PHOTOS_PER_ALBUM) {
      throw new Error(`Maximum ${MAX_PHOTOS_PER_ALBUM} photos per album`);
    }

    const rows = data.photos.map((p, i) => ({
      business_id: data.businessId,
      album_id: data.albumId,
      url: p.url,
      caption: p.caption ?? null,
      sort_order: existing + i,
    }));
    const { error } = await supabase.from("business_gallery_photos").insert(rows as any);
    if (error) throw new Error(error.message);

    // If album has no cover yet, set the first uploaded as cover
    const { data: albumRow } = await supabase
      .from("business_gallery_albums")
      .select("cover_url")
      .eq("id", data.albumId)
      .maybeSingle();
    if (albumRow && !(albumRow as any).cover_url && rows[0]) {
      await supabase
        .from("business_gallery_albums")
        .update({ cover_url: rows[0].url })
        .eq("id", data.albumId);
    }
    return { ok: true };
  });

export const updateGalleryPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        businessId: z.string().uuid(),
        id: z.string().uuid(),
        caption: z.string().max(300).nullable().optional(),
        sort_order: z.number().int().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { businessId, id, ...patch } = data;
    const { error } = await supabase
      .from("business_gallery_photos")
      .update(patch as any)
      .eq("id", id)
      .eq("business_id", businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGalleryPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ businessId: z.string().uuid(), id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { error } = await supabase
      .from("business_gallery_photos")
      .delete()
      .eq("id", data.id)
      .eq("business_id", data.businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============== CONTACT CHANNELS ============== */

const CONTACT_KINDS = [
  "phone",
  "whatsapp",
  "viber",
  "telegram",
  "instagram",
  "tiktok",
  "email",
  "facebook",
  "x",
  "linkedin",
] as const;

export const upsertContactChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        businessId: z.string().uuid(),
        kind: z.enum(CONTACT_KINDS),
        label: z.string().max(40).nullable().optional(),
        value: z.string().min(1).max(200),
        sort_order: z.number().int().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { businessId, id, ...payload } = data;
    if (id) {
      const { error } = await supabase
        .from("business_contact_channels")
        .update(payload as any)
        .eq("id", id)
        .eq("business_id", businessId);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabase
      .from("business_contact_channels")
      .insert({ business_id: businessId, ...payload } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id };
  });

export const deleteContactChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ businessId: z.string().uuid(), id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { error } = await supabase
      .from("business_contact_channels")
      .delete()
      .eq("id", data.id)
      .eq("business_id", data.businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
