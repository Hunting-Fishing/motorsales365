#!/usr/bin/env node

/**
 * Read-only export of the live Lovable/Supabase source.
 *
 * Required environment variables:
 *   SOURCE_SUPABASE_URL
 *   SOURCE_SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   SOURCE_SCHEMA=public
 *   OUT_DIR=migration-output/source-export
 *   PAGE_SIZE=500
 *   EXPORT_STORAGE=true
 *
 * Security:
 * - Never prints or persists the service-role key.
 * - Performs no source writes.
 * - Auth Admin API does not expose password hashes; this exports user metadata only.
 */

import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const sourceUrl = process.env.SOURCE_SUPABASE_URL?.replace(/\/$/, '');
const serviceKey = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY;
const schema = process.env.SOURCE_SCHEMA || 'public';
const outDir = process.env.OUT_DIR || 'migration-output/source-export';
const pageSize = Math.max(50, Math.min(1000, Number(process.env.PAGE_SIZE || 500)));
const exportStorage = (process.env.EXPORT_STORAGE || 'true').toLowerCase() !== 'false';

if (!sourceUrl || !serviceKey) {
  console.error('Missing SOURCE_SUPABASE_URL or SOURCE_SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(2);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Accept-Profile': schema,
  'Content-Profile': schema,
};

const supabase = createClient(sourceUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  db: { schema },
});

const safeName = (value) => value.replace(/[^a-zA-Z0-9._-]+/g, '_');

async function fetchOpenApi() {
  const res = await fetch(`${sourceUrl}/rest/v1/`, {
    headers: { ...headers, Accept: 'application/openapi+json' },
  });
  if (!res.ok) throw new Error(`OpenAPI discovery failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function discoverTables(openApi) {
  const tables = new Set();
  for (const path of Object.keys(openApi.paths || {})) {
    const match = path.match(/^\/([^/]+)$/);
    if (!match) continue;
    const name = decodeURIComponent(match[1]);
    if (name !== 'rpc') tables.add(name);
  }
  return [...tables].sort();
}

async function exportTable(table) {
  const rows = [];
  let offset = 0;
  for (;;) {
    const endpoint = `${sourceUrl}/rest/v1/${encodeURIComponent(table)}?select=*&offset=${offset}&limit=${pageSize}`;
    const res = await fetch(endpoint, {
      headers: { ...headers, Prefer: 'count=exact' },
    });
    if (!res.ok) {
      return { ok: false, error: `${res.status} ${(await res.text()).slice(0, 500)}`, count: rows.length };
    }
    const page = await res.json();
    if (!Array.isArray(page)) return { ok: false, error: 'Unexpected non-array response', count: rows.length };
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += page.length;
  }

  const file = join(outDir, 'tables', `${safeName(schema)}.${safeName(table)}.json`);
  await writeFile(file, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
  return { ok: true, count: rows.length, file };
}

async function exportAuthUsers() {
  const users = [];
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) return { ok: false, error: error.message, count: users.length };
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }
  const file = join(outDir, 'auth', 'users.json');
  await writeFile(file, `${JSON.stringify(users, null, 2)}\n`, 'utf8');
  return { ok: true, count: users.length, file };
}

async function listBucketRecursive(bucketId, prefix = '') {
  const found = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(bucketId)
      .list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`${bucketId}/${prefix}: ${error.message}`);
    const entries = data || [];
    for (const entry of entries) {
      const objectPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id || entry.metadata) {
        found.push({ path: objectPath, metadata: entry.metadata || null });
      } else {
        found.push(...(await listBucketRecursive(bucketId, objectPath)));
      }
    }
    if (entries.length < 1000) break;
    offset += entries.length;
  }
  return found;
}

async function exportStorageBuckets() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) return { ok: false, error: error.message, buckets: [] };

  const manifest = [];
  for (const bucket of buckets || []) {
    const bucketDir = join(outDir, 'storage', safeName(bucket.id));
    await mkdir(bucketDir, { recursive: true });
    let objects = [];
    let bucketError = null;
    try {
      objects = await listBucketRecursive(bucket.id);
      for (const object of objects) {
        const { data, error: downloadError } = await supabase.storage.from(bucket.id).download(object.path);
        if (downloadError) throw new Error(`${object.path}: ${downloadError.message}`);
        const bytes = new Uint8Array(await data.arrayBuffer());
        const local = join(bucketDir, ...object.path.split('/').map(safeName));
        const parts = local.split('/');
        await mkdir(parts.slice(0, -1).join('/'), { recursive: true });
        await writeFile(local, bytes);
      }
    } catch (error) {
      bucketError = error instanceof Error ? error.message : String(error);
    }

    manifest.push({
      id: bucket.id,
      name: bucket.name,
      public: bucket.public,
      object_count: objects.length,
      error: bucketError,
      objects,
    });
  }

  const file = join(outDir, 'storage', 'manifest.json');
  await writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return { ok: manifest.every((b) => !b.error), buckets: manifest, file };
}

await mkdir(join(outDir, 'tables'), { recursive: true });
await mkdir(join(outDir, 'auth'), { recursive: true });
await mkdir(join(outDir, 'storage'), { recursive: true });

const startedAt = new Date().toISOString();
const openApi = await fetchOpenApi();
const tables = discoverTables(openApi);
const tableResults = {};

for (const table of tables) {
  process.stdout.write(`Exporting ${schema}.${table}... `);
  const result = await exportTable(table);
  tableResults[table] = result;
  console.log(result.ok ? `${result.count} rows` : `FAILED: ${result.error}`);
}

process.stdout.write('Exporting Auth users... ');
const auth = await exportAuthUsers();
console.log(auth.ok ? `${auth.count} users` : `FAILED: ${auth.error}`);

let storage = { ok: true, skipped: true, buckets: [] };
if (exportStorage) {
  process.stdout.write('Exporting Storage...\n');
  storage = await exportStorageBuckets();
}

const manifest = {
  source_url: sourceUrl,
  schema,
  started_at: startedAt,
  completed_at: new Date().toISOString(),
  page_size: pageSize,
  table_count: tables.length,
  tables: tableResults,
  auth,
  storage,
  limitations: [
    'Auth Admin API export does not include password hashes.',
    'Only schemas exposed through the source PostgREST API can be exported by this script.',
    'Use a direct database dump/restore instead if Lovable provides database-level credentials; it is more complete for Auth and non-exposed schemas.',
  ],
};

const manifestFile = join(outDir, 'manifest.json');
await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const failures = Object.values(tableResults).filter((x) => !x.ok).length + (auth.ok ? 0 : 1) + (storage.ok ? 0 : 1);
console.log(`\nExport manifest: ${manifestFile}`);
console.log(`Tables discovered: ${tables.length}; failures: ${failures}.`);
process.exitCode = failures ? 1 : 0;
