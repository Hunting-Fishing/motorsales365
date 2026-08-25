// TEMPORARY migration endpoint. Remove after standalone Supabase cutover.
// Normal export modes are token-gated. Push modes never return source rows;
// they send read-only source snapshots into the new Supabase write-only inbox.
import { createFileRoute } from "@tanstack/react-router";

const TARGET_SUPABASE_URL = "https://wjxaajgvddtrxxtocxen.supabase.co";
// Public legacy anon key for the target migration inbox. Intentionally not secret.
const TARGET_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqeGFhamd2ZGR0cnh4dG9jeGVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MTU0NDQsImV4cCI6MjEwMzE5MTQ0NH0.TP_FaqwQiP8V9RlhyIJWuwHpESO5pLh0cZmKVA2BO-E";

type PushKind = "inventory" | "auth" | "table" | "storage_list" | "storage_object";

async function pushMigrationBatch(record: {
  kind: PushKind;
  source_name?: string | null;
  source_offset?: number | null;
  source_count?: number | null;
  payload: unknown;
}) {
  const qs = new URLSearchParams({ on_conflict: "kind,source_name,source_offset" });
  const res = await fetch(`${TARGET_SUPABASE_URL}/rest/v1/migration_ingest?${qs}`, {
    method: "POST",
    headers: {
      apikey: TARGET_ANON_KEY,
      Authorization: `Bearer ${TARGET_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Target staging insert failed (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
}

function mapAuthUser(u: any) {
  return {
    id: u.id,
    email: u.email ?? null,
    phone: u.phone ?? null,
    created_at: u.created_at ?? null,
    updated_at: u.updated_at ?? null,
    last_sign_in_at: u.last_sign_in_at ?? null,
    email_confirmed_at: u.email_confirmed_at ?? null,
    phone_confirmed_at: u.phone_confirmed_at ?? null,
    confirmed_at: u.confirmed_at ?? null,
    banned_until: u.banned_until ?? null,
    is_anonymous: u.is_anonymous ?? false,
    role: u.role ?? null,
    app_metadata: u.app_metadata ?? null,
    user_metadata: u.user_metadata ?? null,
    identities: (u.identities ?? []).map((i: any) => ({
      id: i.id,
      user_id: i.user_id,
      provider: i.provider,
      identity_data: i.identity_data ?? null,
      created_at: i.created_at ?? null,
      updated_at: i.updated_at ?? null,
      last_sign_in_at: i.last_sign_in_at ?? null,
    })),
  };
}

export const Route = createFileRoute("/api/public/migration-export")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { verifyMigrationToken, listExposedTables, jsonNoStore, clampInt, safeMessage } =
          await import("@/lib/migration-export.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const url = new URL(request.url);
        const mode = url.searchParams.get("mode") ?? "inventory";
        const isPushMode = mode.startsWith("push-");

        // Push modes return metadata/status only, never production rows.
        if (!isPushMode && !(await verifyMigrationToken(request))) {
          return jsonNoStore({ error: "unauthorized" }, 401);
        }

        try {
          if (mode === "push-catalog") {
            const tables = await listExposedTables();
            const { data: buckets, error: bucketErr } = await supabaseAdmin.storage.listBuckets();
            const payload = {
              generated_at: new Date().toISOString(),
              table_count: tables.length,
              tables,
              buckets: bucketErr
                ? { error: safeMessage(bucketErr.message) }
                : (buckets ?? []).map((b: any) => ({
                    id: b.id,
                    name: b.name,
                    public: b.public,
                    file_size_limit: b.file_size_limit ?? null,
                    allowed_mime_types: b.allowed_mime_types ?? null,
                  })),
            };
            await pushMigrationBatch({ kind: "inventory", source_name: "catalog", source_offset: 0, source_count: tables.length, payload });
            return jsonNoStore({ ok: true, mode, table_count: tables.length });
          }

          if (mode === "push-count") {
            const table = url.searchParams.get("table") ?? "";
            const tables = await listExposedTables();
            if (!tables.includes(table)) return jsonNoStore({ error: "unknown_table" }, 400);
            const { count, error } = await (supabaseAdmin as any)
              .from(table)
              .select("*", { count: "exact", head: true });
            const payload = error
              ? { table, error: safeMessage(error.message) }
              : { table, count: count ?? 0 };
            await pushMigrationBatch({ kind: "inventory", source_name: `count:${table}`, source_offset: 0, source_count: error ? null : count ?? 0, payload });
            return jsonNoStore({ ok: true, mode, table, count: error ? null : count ?? 0, error: error ? safeMessage(error.message) : null });
          }

          if (mode === "push-auth") {
            const page = clampInt(url.searchParams.get("page"), 1, 1, 1_000_000);
            const perPage = clampInt(url.searchParams.get("perPage"), 200, 1, 500);
            const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
            if (error) return jsonNoStore({ error: safeMessage(error.message) }, 400);
            const users = (data?.users ?? []).map(mapAuthUser);
            const offset = (page - 1) * perPage;
            const payload = { page, perPage, returned: users.length, nextPage: users.length === perPage ? page + 1 : null, users };
            await pushMigrationBatch({ kind: "auth", source_name: "auth.users", source_offset: offset, source_count: users.length, payload });
            return jsonNoStore({ ok: true, mode, page, returned: users.length, nextPage: payload.nextPage });
          }

          if (mode === "push-table") {
            const table = url.searchParams.get("table") ?? "";
            const tables = await listExposedTables();
            if (!tables.includes(table)) return jsonNoStore({ error: "unknown_table" }, 400);
            const offset = clampInt(url.searchParams.get("offset"), 0, 0, 100_000_000);
            const limit = clampInt(url.searchParams.get("limit"), 200, 1, 200);
            const { data, error } = await (supabaseAdmin as any)
              .from(table)
              .select("*")
              .range(offset, offset + limit - 1);
            if (error) return jsonNoStore({ error: safeMessage(error.message) }, 400);
            const rows = data ?? [];
            const payload = { table, offset, limit, returned: rows.length, nextOffset: rows.length === limit ? offset + limit : null, rows };
            await pushMigrationBatch({ kind: "table", source_name: table, source_offset: offset, source_count: rows.length, payload });
            return jsonNoStore({ ok: true, mode, table, offset, returned: rows.length, nextOffset: payload.nextOffset });
          }

          if (mode === "push-storage-list") {
            const bucket = url.searchParams.get("bucket") ?? "";
            const path = url.searchParams.get("path") ?? "";
            const offset = clampInt(url.searchParams.get("offset"), 0, 0, 100_000_000);
            const limit = clampInt(url.searchParams.get("limit"), 500, 1, 500);
            const { data: buckets, error: bErr } = await supabaseAdmin.storage.listBuckets();
            if (bErr) return jsonNoStore({ error: safeMessage(bErr.message) }, 400);
            if (!(buckets ?? []).some((b: any) => b.id === bucket || b.name === bucket)) {
              return jsonNoStore({ error: "unknown_bucket" }, 400);
            }
            const { data, error } = await supabaseAdmin.storage.from(bucket).list(path, { limit, offset, sortBy: { column: "name", order: "asc" } });
            if (error) return jsonNoStore({ error: safeMessage(error.message) }, 400);
            const items = data ?? [];
            const sourceName = `${bucket}:${path}`.slice(0, 200);
            const payload = { bucket, path, offset, limit, returned: items.length, nextOffset: items.length === limit ? offset + limit : null, items };
            await pushMigrationBatch({ kind: "storage_list", source_name: sourceName, source_offset: offset, source_count: items.length, payload });
            return jsonNoStore({ ok: true, mode, bucket, path, offset, returned: items.length, nextOffset: payload.nextOffset });
          }

          // Token-gated direct inventory/export modes remain available for diagnostics.
          if (mode === "inventory") {
            const tables = await listExposedTables();
            const counts = await Promise.all(tables.map(async (table) => {
              const { count, error } = await (supabaseAdmin as any).from(table).select("*", { count: "exact", head: true });
              return error ? { table, error: safeMessage(error.message) } : { table, count: count ?? 0 };
            }));
            let authUsers = 0;
            for (let page = 1; page <= 200; page++) {
              const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
              if (error) break;
              const len = data?.users?.length ?? 0;
              authUsers += len;
              if (len < 1000) break;
            }
            const { data: buckets } = await supabaseAdmin.storage.listBuckets();
            return jsonNoStore({ mode, generated_at: new Date().toISOString(), table_count: tables.length, tables: counts, auth: { user_count: authUsers }, buckets: buckets ?? [] });
          }

          if (mode === "table") {
            const table = url.searchParams.get("table") ?? "";
            const tables = await listExposedTables();
            if (!tables.includes(table)) return jsonNoStore({ error: "unknown_table" }, 400);
            const offset = clampInt(url.searchParams.get("offset"), 0, 0, 100_000_000);
            const limit = clampInt(url.searchParams.get("limit"), 500, 1, 500);
            const { data, error } = await (supabaseAdmin as any).from(table).select("*").range(offset, offset + limit - 1);
            if (error) return jsonNoStore({ error: safeMessage(error.message) }, 400);
            const rows = data ?? [];
            return jsonNoStore({ table, offset, limit, rows, returned: rows.length, nextOffset: rows.length === limit ? offset + limit : null });
          }

          if (mode === "auth") {
            const page = clampInt(url.searchParams.get("page"), 1, 1, 1_000_000);
            const perPage = clampInt(url.searchParams.get("perPage"), 1000, 1, 1000);
            const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
            if (error) return jsonNoStore({ error: safeMessage(error.message) }, 400);
            const users = (data?.users ?? []).map(mapAuthUser);
            return jsonNoStore({ mode, page, perPage, returned: users.length, nextPage: users.length === perPage ? page + 1 : null, users });
          }

          if (mode === "buckets") {
            const { data, error } = await supabaseAdmin.storage.listBuckets();
            if (error) return jsonNoStore({ error: safeMessage(error.message) }, 400);
            return jsonNoStore({ mode, buckets: data ?? [] });
          }

          if (mode === "storage-list" || mode === "storage-signed-url") {
            const bucket = url.searchParams.get("bucket") ?? "";
            const { data: buckets, error: bErr } = await supabaseAdmin.storage.listBuckets();
            if (bErr) return jsonNoStore({ error: safeMessage(bErr.message) }, 400);
            if (!(buckets ?? []).some((b: any) => b.id === bucket || b.name === bucket)) return jsonNoStore({ error: "unknown_bucket" }, 400);
            if (mode === "storage-list") {
              const path = url.searchParams.get("path") ?? "";
              const offset = clampInt(url.searchParams.get("offset"), 0, 0, 100_000_000);
              const limit = clampInt(url.searchParams.get("limit"), 1000, 1, 1000);
              const { data, error } = await supabaseAdmin.storage.from(bucket).list(path, { limit, offset, sortBy: { column: "name", order: "asc" } });
              if (error) return jsonNoStore({ error: safeMessage(error.message) }, 400);
              const items = data ?? [];
              return jsonNoStore({ mode, bucket, path, offset, limit, returned: items.length, nextOffset: items.length === limit ? offset + limit : null, items });
            }
            const objectPath = url.searchParams.get("path") ?? "";
            if (!objectPath) return jsonNoStore({ error: "missing_path" }, 400);
            const expires = clampInt(url.searchParams.get("expires"), 300, 1, 300);
            const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(objectPath, expires);
            if (error) return jsonNoStore({ error: safeMessage(error.message) }, 400);
            return jsonNoStore({ mode, bucket, path: objectPath, expires_in: expires, signedUrl: data?.signedUrl ?? null });
          }

          return jsonNoStore({ error: "unknown_mode" }, 400);
        } catch (e) {
          return jsonNoStore({ error: safeMessage(e) }, 500);
        }
      },
    },
  },
});
