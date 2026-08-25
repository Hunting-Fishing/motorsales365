// TEMPORARY migration endpoint. Remove after standalone Supabase cutover.
// Normal export modes are token-gated. Push modes never return source rows;
// they send read-only source snapshots into the new Supabase write-only inbox.
import { createFileRoute } from "@tanstack/react-router";

const TARGET_SUPABASE_URL = "https://wjxaajgvddtrxxtocxen.supabase.co";
// Public legacy anon key for the target migration inbox. This is intentionally not a secret.
const TARGET_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqeGFhamd2ZGR0cnh4dG9jeGVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MTU0NDQsImV4cCI6MjEwMzE5MTQ0NH0.TP_FaqwQiP8V9RlhyIJWuwHpESO5pLh0cZmKVA2BO-E";

async function pushMigrationBatch(record: {
  kind: "inventory" | "auth" | "table" | "storage_list" | "storage_object";
  source_name?: string | null;
  source_offset?: number | null;
  source_count?: number | null;
  payload: unknown;
}) {
  const res = await fetch(`${TARGET_SUPABASE_URL}/rest/v1/migration_ingest`, {
    method: "POST",
    headers: {
      apikey: TARGET_ANON_KEY,
      Authorization: `Bearer ${TARGET_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Target staging insert failed (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
}

export const Route = createFileRoute("/api/public/migration-export")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const {
          verifyMigrationToken,
          listExposedTables,
          jsonNoStore,
          clampInt,
          safeMessage,
        } = await import("@/lib/migration-export.server");

        const url = new URL(request.url);
        const mode = url.searchParams.get("mode") ?? "inventory";
        const isPushMode = mode.startsWith("push-");

        // Push modes do not return source rows and write only into the target's
        // insert-only migration inbox. All direct export modes remain token-gated.
        if (!isPushMode && !(await verifyMigrationToken(request))) {
          return jsonNoStore({ error: "unauthorized" }, 401);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        try {
          const buildInventory = async () => {
            const tables = await listExposedTables();
            const counts = await Promise.all(
              tables.map(async (table) => {
                const { count, error } = await (supabaseAdmin as any)
                  .from(table)
                  .select("*", { count: "exact", head: true });
                return error
                  ? { table, error: safeMessage(error.message) }
                  : { table, count: count ?? 0 };
              }),
            );

            let authUsers = 0;
            let page = 1;
            let authError: string | null = null;
            for (;;) {
              const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
              if (error) {
                authError = safeMessage(error.message);
                break;
              }
              const len = data?.users?.length ?? 0;
              authUsers += len;
              if (len < 1000) break;
              page += 1;
              if (page > 200) break;
            }

            const { data: buckets, error: bucketErr } = await supabaseAdmin.storage.listBuckets();
            return {
              generated_at: new Date().toISOString(),
              table_count: tables.length,
              tables: counts,
              auth: { user_count: authUsers, error: authError },
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
          };

          if (mode === "push-inventory") {
            const inventory = await buildInventory();
            await pushMigrationBatch({
              kind: "inventory",
              source_name: "lovable-source",
              source_offset: 0,
              source_count: inventory.table_count,
              payload: inventory,
            });
            return jsonNoStore({ ok: true, mode, table_count: inventory.table_count });
          }

          if (mode === "inventory") {
            const inventory = await buildInventory();
            return jsonNoStore({ mode, ...inventory });
          }

          if (mode === "table") {
            const table = url.searchParams.get("table") ?? "";
            const tables = await listExposedTables();
            if (!tables.includes(table)) return jsonNoStore({ error: "unknown_table" }, 400);
            const offset = clampInt(url.searchParams.get("offset"), 0, 0, 100_000_000);
            const limit = clampInt(url.searchParams.get("limit"), 500, 1, 500);
            const { data, error } = await (supabaseAdmin as any)
              .from(table)
              .select("*")
              .range(offset, offset + limit - 1);
            if (error) return jsonNoStore({ error: safeMessage(error.message) }, 400);
            const rows = data ?? [];
            return jsonNoStore({ table, offset, limit, rows, returned: rows.length, nextOffset: rows.length === limit ? offset + limit : null });
          }

          if (mode === "auth") {
            const page = clampInt(url.searchParams.get("page"), 1, 1, 1_000_000);
            const perPage = clampInt(url.searchParams.get("perPage"), 1000, 1, 1000);
            const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
            if (error) return jsonNoStore({ error: safeMessage(error.message) }, 400);
            const users = (data?.users ?? []).map((u: any) => ({
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
            }));
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
            if (!(buckets ?? []).some((b: any) => b.id === bucket || b.name === bucket)) {
              return jsonNoStore({ error: "unknown_bucket" }, 400);
            }

            if (mode === "storage-list") {
              const path = url.searchParams.get("path") ?? "";
              const offset = clampInt(url.searchParams.get("offset"), 0, 0, 100_000_000);
              const limit = clampInt(url.searchParams.get("limit"), 1000, 1, 1000);
              const { data, error } = await supabaseAdmin.storage
                .from(bucket)
                .list(path, { limit, offset, sortBy: { column: "name", order: "asc" } });
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
