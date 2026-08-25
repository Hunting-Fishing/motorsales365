#!/usr/bin/env node

/**
 * Guarded importer for a previously exported Lovable/Supabase source archive.
 *
 * This importer is intentionally conservative:
 * - DRY RUN is the default.
 * - It NEVER imports Auth users through auth.admin.createUser because that API
 *   does not provide a documented way to preserve an existing UUID.
 * - Before any public-table writes, every source Auth UUID must already exist
 *   on the target. This protects all auth.users foreign keys from silent remaps.
 * - It never enables cron jobs and never imports secrets.
 *
 * Required environment variables:
 *   TARGET_SUPABASE_URL
 *   TARGET_SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   EXPORT_DIR=migration-output/source-export
 *   TARGET_SCHEMA=public
 *   BATCH_SIZE=200
 *   ALLOW_WRITE=NO          # set exactly to I_UNDERSTAND to write
 *   MAX_PASSES=8
 */

import { createClient } from '@supabase/supabase-js';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

const targetUrl = process.env.TARGET_SUPABASE_URL?.replace(/\/$/, '');
const serviceKey = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY;
const exportDir = process.env.EXPORT_DIR || 'migration-output/source-export';
const schema = process.env.TARGET_SCHEMA || 'public';
const batchSize = Math.max(1, Math.min(500, Number(process.env.BATCH_SIZE || 200)));
const maxPasses = Math.max(1, Math.min(20, Number(process.env.MAX_PASSES || 8)));
const allowWrite = process.env.ALLOW_WRITE === 'I_UNDERSTAND';

if (!targetUrl || !serviceKey) {
  console.error('Missing TARGET_SUPABASE_URL or TARGET_SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(2);
}

const target = createClient(targetUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  db: { schema },
});

const manifestPath = join(exportDir, 'manifest.json');
const sourceManifest = JSON.parse(await readFile(manifestPath, 'utf8'));

async function listAllTargetAuthUsers() {
  const users = [];
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await target.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Unable to inventory target Auth: ${error.message}`);
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < perPage) return users;
    page += 1;
  }
}

async function loadSourceAuthUsers() {
  const path = join(exportDir, 'auth', 'users.json');
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`Source Auth export is required before table import: ${path}`);
  }
}

function compareAuthIds(sourceUsers, targetUsers) {
  const targetIds = new Set(targetUsers.map((u) => u.id));
  const missing = sourceUsers.filter((u) => !targetIds.has(u.id));
  const sourceIds = new Set(sourceUsers.map((u) => u.id));
  const targetOnly = targetUsers.filter((u) => !sourceIds.has(u.id));
  return { missing, targetOnly };
}

async function getTableFiles() {
  const dir = join(exportDir, 'tables');
  const files = (await readdir(dir))
    .filter((f) => f.endsWith('.json'))
    .sort();
  return files.map((file) => ({
    file,
    table: basename(file, '.json').replace(`${schema}.`, ''),
    path: join(dir, file),
  }));
}

async function targetCount(table) {
  const { count, error } = await target
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) return { ok: false, error: error.message, count: null };
  return { ok: true, count: count ?? 0 };
}

async function upsertRows(table, rows) {
  let imported = 0;
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const chunk = rows.slice(offset, offset + batchSize);
    // Use default PK/unique conflict detection. Tables without a compatible
    // unique key may fail and remain pending for explicit review.
    const { error } = await target.from(table).upsert(chunk, { ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    imported += chunk.length;
  }
  return imported;
}

const sourceAuth = await loadSourceAuthUsers();
const targetAuth = await listAllTargetAuthUsers();
const authDiff = compareAuthIds(sourceAuth, targetAuth);

const report = {
  target_url: targetUrl,
  source_url: sourceManifest.source_url || null,
  generated_at: new Date().toISOString(),
  mode: allowWrite ? 'WRITE' : 'DRY_RUN',
  auth: {
    source_count: sourceAuth.length,
    target_count: targetAuth.length,
    missing_source_ids_on_target: authDiff.missing.map((u) => ({ id: u.id, email: u.email ?? null })),
    target_only_ids: authDiff.targetOnly.map((u) => ({ id: u.id, email: u.email ?? null })),
  },
  tables: {},
  unresolved: [],
};

console.log(`Mode: ${report.mode}`);
console.log(`Source Auth users: ${sourceAuth.length}; target Auth users: ${targetAuth.length}`);

if (authDiff.missing.length > 0) {
  console.error(`BLOCKED: ${authDiff.missing.length} source Auth UUID(s) do not exist on target.`);
  console.error('Do not import dependent tables until Auth UUID preservation is resolved.');
  report.blocked_reason = 'source_auth_uuid_mismatch';
  await mkdir(join(exportDir, 'validation'), { recursive: true });
  await writeFile(
    join(exportDir, 'validation', 'target-import-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
  process.exit(3);
}

const tableFiles = await getTableFiles();
const pending = [];

for (const item of tableFiles) {
  const rows = JSON.parse(await readFile(item.path, 'utf8'));
  const before = await targetCount(item.table);
  report.tables[item.table] = {
    source_rows: rows.length,
    target_before: before,
    status: allowWrite ? 'pending' : 'dry_run_ready',
  };
  if (allowWrite && rows.length) pending.push({ ...item, rows });
}

if (!allowWrite) {
  console.log(`DRY RUN ready: ${tableFiles.length} table archive(s) inspected.`);
  console.log('No target rows were written. Set ALLOW_WRITE=I_UNDERSTAND only after Auth UUID validation and cutover safeguards are approved.');
} else {
  let current = pending;
  for (let pass = 1; pass <= maxPasses && current.length; pass += 1) {
    console.log(`Import pass ${pass}: ${current.length} table(s) pending.`);
    const next = [];
    let progress = 0;

    for (const item of current) {
      try {
        const imported = await upsertRows(item.table, item.rows);
        const after = await targetCount(item.table);
        report.tables[item.table] = {
          ...report.tables[item.table],
          status: 'imported',
          imported_attempted: imported,
          target_after: after,
          pass,
        };
        progress += 1;
        console.log(`  ${item.table}: imported/verified (${item.rows.length} source rows)`);
      } catch (error) {
        next.push({ ...item, lastError: error instanceof Error ? error.message : String(error) });
      }
    }

    if (!progress) {
      current = next;
      break;
    }
    current = next;
  }

  for (const item of current) {
    report.tables[item.table] = {
      ...report.tables[item.table],
      status: 'unresolved',
      error: item.lastError || 'unknown import failure',
    };
    report.unresolved.push({ table: item.table, error: item.lastError || 'unknown import failure' });
  }
}

await mkdir(join(exportDir, 'validation'), { recursive: true });
const reportFile = join(exportDir, 'validation', 'target-import-report.json');
await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Report: ${reportFile}`);
if (report.unresolved.length) {
  console.error(`Unresolved table imports: ${report.unresolved.length}`);
  process.exitCode = 1;
}
