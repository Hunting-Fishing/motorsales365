#!/usr/bin/env node

/**
 * Read-only inventory for the live Lovable/Supabase source.
 *
 * Required environment variables:
 *   SOURCE_SUPABASE_URL
 *   SOURCE_SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   SOURCE_SCHEMA=public
 *   OUT_FILE=migration-output/source-inventory.json
 *
 * This script never writes to the source project and never prints the key.
 */

import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const sourceUrl = process.env.SOURCE_SUPABASE_URL?.replace(/\/$/, '');
const serviceKey = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY;
const schema = process.env.SOURCE_SCHEMA || 'public';
const outFile = process.env.OUT_FILE || 'migration-output/source-inventory.json';

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
    if (name === 'rpc') continue;
    tables.add(name);
  }
  return [...tables].sort();
}

async function exactCount(table) {
  const res = await fetch(`${sourceUrl}/rest/v1/${encodeURIComponent(table)}?select=*`, {
    method: 'HEAD',
    headers: { ...headers, Prefer: 'count=exact' },
  });
  const range = res.headers.get('content-range');
  if (!res.ok) return { ok: false, status: res.status, error: range || 'count failed' };
  const total = range?.split('/')[1];
  return { ok: true, count: total && total !== '*' ? Number(total) : null };
}

async function countAuthUsers() {
  let page = 1;
  const perPage = 1000;
  let total = 0;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) return { ok: false, error: error.message };
    const users = data?.users || [];
    total += users.length;
    if (users.length < perPage) return { ok: true, count: total };
    page += 1;
  }
}

async function inventoryStorage() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) return { ok: false, error: error.message, buckets: [] };

  const result = [];
  for (const bucket of buckets || []) {
    let topLevelCount = null;
    let listError = null;
    const { data: objects, error: objectError } = await supabase.storage
      .from(bucket.id)
      .list('', { limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } });
    if (objectError) listError = objectError.message;
    else topLevelCount = objects?.length ?? 0;

    result.push({
      id: bucket.id,
      name: bucket.name,
      public: bucket.public,
      file_size_limit: bucket.file_size_limit ?? null,
      allowed_mime_types: bucket.allowed_mime_types ?? null,
      top_level_entries: topLevelCount,
      list_error: listError,
    });
  }
  return { ok: true, buckets: result };
}

const startedAt = new Date().toISOString();
const openApi = await fetchOpenApi();
const tables = discoverTables(openApi);
const tableCounts = {};

for (const table of tables) {
  tableCounts[table] = await exactCount(table);
  const c = tableCounts[table];
  process.stdout.write(`${schema}.${table}: ${c.ok ? c.count : `ERROR ${c.status}`}\n`);
}

const authUsers = await countAuthUsers();
const storage = await inventoryStorage();

const inventory = {
  source_url: sourceUrl,
  schema,
  generated_at: new Date().toISOString(),
  started_at: startedAt,
  table_count: tables.length,
  tables: tableCounts,
  auth_users: authUsers,
  storage,
  notes: [
    'Read-only inventory generated with service-role access.',
    'No service-role key is written to this file.',
    'Storage top_level_entries is not a recursive object count; perform recursive export/count during the Storage copy phase.',
    'Auth Admin API inventory does not provide password hashes. Preserve passwords only if a supported database-level auth export becomes available.',
  ],
};

await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
console.log(`\nInventory written to ${outFile}`);
console.log(`Discovered ${tables.length} ${schema} tables; Auth users: ${authUsers.ok ? authUsers.count : 'ERROR'}.`);
