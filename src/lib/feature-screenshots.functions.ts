/**
 * Feature screenshots — versioned captures of live app pages surfaced on /features.
 *
 * Screenshots are captured in the ADMIN'S BROWSER (via html-to-image against a
 * same-origin iframe) and uploaded here as base64. No external service and no
 * API key are required.
 *
 * Storage: private `feature-screenshots` bucket. We return signed URLs (1 week
 * TTL) rather than public URLs so the bucket doesn't need to be public.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BUCKET = "feature-screenshots";
const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

export type ScreenshotRow = {
  id: string;
  feature_id: string;
  route: string;
  storage_path: string | null;
  url: string;
  viewport: string;
  captured_at: string;
  captured_by: string | null;
  notes: string | null;
  is_pinned: boolean;
  sha256: string | null;
};

async function signIfNeeded(
  supabase: ReturnType<typeof createClient<Database>>,
  row: { url: string; storage_path: string | null },
): Promise<string> {
  if (row.storage_path) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path, SIGNED_URL_TTL_SEC);
    if (data?.signedUrl) return data.signedUrl;
  }
  return row.url ?? "";
}

function makePublicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

// -------- Public read (used by /features loader) --------

export const listLatestFeatureScreenshots = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = makePublicClient();
  const { data, error } = await supabase
    .from("feature_screenshots")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("captured_at", { ascending: false })
    .limit(500);
  if (error) return { screenshots: {} as Record<string, ScreenshotRow> };

  const byFeature: Record<string, ScreenshotRow> = {};
  for (const row of data ?? []) {
    if (!byFeature[row.feature_id]) {
      const signed = await signIfNeeded(supabase, row);
      byFeature[row.feature_id] = { ...(row as ScreenshotRow), url: signed };
    }
  }
  return { screenshots: byFeature };
});

// -------- History (drawer) --------

export const listFeatureScreenshotHistory = createServerFn({ method: "POST" })
  .inputValidator((d: { featureId: string }) => ({ featureId: z.string().min(1).parse(d.featureId) }))
  .handler(async ({ data }) => {
    const supabase = makePublicClient();
    const { data: rows, error } = await supabase
      .from("feature_screenshots")
      .select("*")
      .eq("feature_id", data.featureId)
      .order("captured_at", { ascending: false })
      .limit(60);
    if (error) return { history: [] as ScreenshotRow[] };
    const signed: ScreenshotRow[] = [];
    for (const r of rows ?? []) {
      signed.push({ ...(r as ScreenshotRow), url: await signIfNeeded(supabase, r) });
    }
    return { history: signed };
  });

// -------- Admin actions --------

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}

export const pinFeatureScreenshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; pinned: boolean }) => ({
    id: z.string().uuid().parse(d.id),
    pinned: z.boolean().parse(d.pinned),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.pinned) {
      const { data: row } = await context.supabase
        .from("feature_screenshots")
        .select("feature_id")
        .eq("id", data.id)
        .maybeSingle();
      if (row?.feature_id) {
        await context.supabase
          .from("feature_screenshots")
          .update({ is_pinned: false })
          .eq("feature_id", row.feature_id);
      }
    }
    const { error } = await context.supabase
      .from("feature_screenshots")
      .update({ is_pinned: data.pinned })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFeatureScreenshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: z.string().uuid().parse(d.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row } = await context.supabase
      .from("feature_screenshots")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.storage_path) {
      await context.supabase.storage.from(BUCKET).remove([row.storage_path]);
    }
    await context.supabase.from("feature_screenshots").delete().eq("id", data.id);
    return { ok: true };
  });

// -------- Upload (base64 from admin's browser) --------

async function sha256HexFromBytes(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const uploadFeatureScreenshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { featureId: string; route: string; contentType: string; base64: string; notes?: string }) => ({
    featureId: z.string().min(1).parse(d.featureId),
    route: z.string().min(1).parse(d.route),
    contentType: z.string().regex(/^image\//).parse(d.contentType),
    base64: z.string().min(100).parse(d.base64),
    notes: d.notes ? z.string().max(500).parse(d.notes) : null,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const hash = await sha256HexFromBytes(bytes);

    // Dedupe: skip when hash matches the latest capture for this feature.
    const { data: prev } = await context.supabase
      .from("feature_screenshots")
      .select("id, sha256")
      .eq("feature_id", data.featureId)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prev?.sha256 && prev.sha256 === hash) {
      return { skipped: true as const, reason: "unchanged" };
    }

    const ext = data.contentType === "image/png" ? "png" : "jpg";
    const path = `${data.featureId}/${Date.now()}.${ext}`;
    const { error: upErr } = await context.supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: data.contentType, cacheControl: "3600", upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: signed } = await context.supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SEC);
    const { data: row, error } = await context.supabase
      .from("feature_screenshots")
      .insert({
        feature_id: data.featureId,
        route: data.route,
        storage_path: path,
        url: signed?.signedUrl ?? "",
        viewport: "desktop",
        captured_by: (context as any).claims?.email ?? context.userId,
        notes: data.notes,
        sha256: hash,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { skipped: false as const, row };
  });
