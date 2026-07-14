/**
 * Feature screenshots — versioned captures of live app pages surfaced on /features.
 *
 * Storage: private `feature-screenshots` bucket. We return signed URLs (1 week
 * TTL) rather than public URLs so the bucket doesn't need to be public.
 *
 * Auto-capture uses an external headless-browser API (ScreenshotOne by default)
 * because Cloudflare Workers cannot run Puppeteer/sharp.
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

// -------- Public read (used by /features loader) --------

export const listLatestFeatureScreenshots = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const supabase = createClient<Database>(url, key, {
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

  // Latest per feature_id — prefer pinned, else newest captured_at
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
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient<Database>(url, key, {
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
    // Unpin others in the same feature first, if pinning
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

// -------- Capture (external screenshot API) --------

const SITE_BASE = "https://www.365motorsales.com";

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function fetchScreenshotBytes(targetUrl: string): Promise<ArrayBuffer> {
  const key = process.env.SCREENSHOTONE_ACCESS_KEY;
  if (!key) throw new Error("SCREENSHOTONE_ACCESS_KEY is not configured");
  const api = new URL("https://api.screenshotone.com/take");
  api.searchParams.set("access_key", key);
  api.searchParams.set("url", targetUrl);
  api.searchParams.set("viewport_width", "1440");
  api.searchParams.set("viewport_height", "900");
  api.searchParams.set("full_page", "false");
  api.searchParams.set("block_ads", "true");
  api.searchParams.set("block_cookie_banners", "true");
  api.searchParams.set("format", "jpg");
  api.searchParams.set("image_quality", "82");
  api.searchParams.set("cache", "false");
  api.searchParams.set("delay", "2");
  const res = await fetch(api.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Screenshot API failed [${res.status}]: ${body.slice(0, 300)}`);
  }
  return await res.arrayBuffer();
}

async function captureOne(context: {
  supabase: any;
  userId: string;
  actor: string;
}, featureId: string, route: string) {
  const targetUrl = `${SITE_BASE}${route}?__screenshot=1`;
  const buf = await fetchScreenshotBytes(targetUrl);
  const hash = await sha256Hex(buf);

  // Dedupe: skip when hash matches the latest capture for this feature.
  const { data: prev } = await context.supabase
    .from("feature_screenshots")
    .select("id, sha256")
    .eq("feature_id", featureId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (prev?.sha256 && prev.sha256 === hash) {
    return { skipped: true, reason: "unchanged" as const };
  }

  const path = `${featureId}/${Date.now()}.jpg`;
  const { error: upErr } = await context.supabase.storage
    .from(BUCKET)
    .upload(path, new Uint8Array(buf), {
      contentType: "image/jpeg",
      cacheControl: "3600",
      upsert: false,
    });
  if (upErr) throw new Error(upErr.message);

  const { data: signed } = await context.supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);
  const url = signed?.signedUrl ?? "";

  const { data: row, error } = await context.supabase
    .from("feature_screenshots")
    .insert({
      feature_id: featureId,
      route,
      storage_path: path,
      url,
      viewport: "desktop",
      captured_by: context.actor,
      sha256: hash,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { skipped: false, row };
}

export const captureFeatureScreenshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { featureId: string; route: string }) => ({
    featureId: z.string().min(1).parse(d.featureId),
    route: z.string().min(1).parse(d.route),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const actor = context.claims?.email ?? context.userId;
    return captureOne({ supabase: context.supabase, userId: context.userId, actor }, data.featureId, data.route);
  });

// Bulk capture for cron. Callable only via /api/public/cron with the anon key,
// or by admins. It iterates a provided catalog + respects a cadence.
export const captureAllFeatureScreenshots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { features: { id: string; route: string }[]; minAgeDays?: number }) => ({
    features: z
      .array(z.object({ id: z.string().min(1), route: z.string().min(1) }))
      .min(1)
      .max(200)
      .parse(d.features),
    minAgeDays: z.number().int().min(0).max(90).optional().parse(d.minAgeDays),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return runBulkCapture(context.supabase, context.claims?.email ?? context.userId, data.features, data.minAgeDays ?? 7);
  });

export async function runBulkCapture(
  supabase: any,
  actor: string,
  features: { id: string; route: string }[],
  minAgeDays: number,
) {
  const cutoff = new Date(Date.now() - minAgeDays * 24 * 60 * 60 * 1000).toISOString();
  const results: { id: string; status: "captured" | "skipped" | "error"; message?: string }[] = [];
  for (const f of features) {
    try {
      const { data: last } = await supabase
        .from("feature_screenshots")
        .select("captured_at")
        .eq("feature_id", f.id)
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (last?.captured_at && last.captured_at > cutoff) {
        results.push({ id: f.id, status: "skipped", message: "within cadence" });
        continue;
      }
      const r = await captureOne({ supabase, userId: "cron", actor }, f.id, f.route);
      results.push({ id: f.id, status: r.skipped ? "skipped" : "captured" });
      // small throttle to be polite to the screenshot API
      await new Promise((res) => setTimeout(res, 1500));
    } catch (e) {
      results.push({ id: f.id, status: "error", message: (e as Error).message });
    }
  }
  return { results };
}

// Manual upload from admin UI (base64 encoded image).
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
    const ext = data.contentType === "image/png" ? "png" : "jpg";
    const path = `${data.featureId}/${Date.now()}-manual.${ext}`;
    const { error: upErr } = await context.supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: data.contentType, cacheControl: "3600", upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: signed } = await context.supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SEC);
    const hash = await sha256Hex(bytes.buffer);
    const { data: row, error } = await context.supabase
      .from("feature_screenshots")
      .insert({
        feature_id: data.featureId,
        route: data.route,
        storage_path: path,
        url: signed?.signedUrl ?? "",
        viewport: "desktop",
        captured_by: context.claims?.email ?? context.userId,
        notes: data.notes,
        sha256: hash,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
