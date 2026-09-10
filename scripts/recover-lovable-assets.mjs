import fs from 'node:fs/promises';
import path from 'node:path';

const SOURCE_ROOT = new URL('https://motorsales365.lovable.app');
const SOURCE_PROJECT_ID = '0738c881-614d-4885-8d75-1b7c90e0835e';
const SEARCH_ROOT = path.resolve('src');
const STAGING_ROOT = path.resolve('.lovable-asset-recovery');
const dryRun = process.argv.includes('--dry-run');

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (entry.isFile() && entry.name.endsWith('.asset.json')) out.push(full);
  }
  return out;
}

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

async function validateExisting(target, manifest) {
  if (!(await exists(target))) return false;
  const stat = await fs.stat(target);
  return stat.size === manifest.size;
}

await fs.rm(STAGING_ROOT, { recursive: true, force: true });
await fs.mkdir(STAGING_ROOT, { recursive: true });

const manifests = await walk(SEARCH_ROOT);
if (!manifests.length) throw new Error('No .asset.json manifests found under src');

const staged = [];
const skipped = [];

for (const manifestPath of manifests.sort()) {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (manifest.project_id !== SOURCE_PROJECT_ID) {
    throw new Error(`${manifestPath}: unexpected Lovable project_id ${manifest.project_id}`);
  }
  if (!manifest.url?.startsWith('/__l5e/assets-v1/')) {
    throw new Error(`${manifestPath}: unexpected asset URL ${manifest.url}`);
  }
  if (!Number.isInteger(manifest.size) || manifest.size <= 0) {
    throw new Error(`${manifestPath}: invalid expected size`);
  }
  if (!String(manifest.content_type || '').startsWith('image/')) {
    throw new Error(`${manifestPath}: unexpected content type ${manifest.content_type}`);
  }

  const target = manifestPath.replace(/\.asset\.json$/, '');
  if (await validateExisting(target, manifest)) {
    skipped.push(path.relative(process.cwd(), target));
    continue;
  }

  const source = new URL(manifest.url, SOURCE_ROOT);
  const response = await fetch(source, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${manifestPath}: ${response.status} ${response.statusText} from ${source}`);

  const responseType = response.headers.get('content-type') || '';
  if (!responseType.toLowerCase().startsWith(manifest.content_type.toLowerCase())) {
    throw new Error(`${manifestPath}: content-type mismatch; expected ${manifest.content_type}, got ${responseType}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length !== manifest.size) {
    throw new Error(`${manifestPath}: size mismatch; expected ${manifest.size}, got ${bytes.length}`);
  }

  const relativeTarget = path.relative(process.cwd(), target);
  const stagedPath = path.join(STAGING_ROOT, relativeTarget);
  await fs.mkdir(path.dirname(stagedPath), { recursive: true });
  await fs.writeFile(stagedPath, bytes);
  staged.push({ stagedPath, target, relativeTarget, size: bytes.length });
  console.log(`validated ${relativeTarget} (${bytes.length} bytes)`);
}

console.log(`Lovable asset audit: ${manifests.length} manifests, ${staged.length} recoverable, ${skipped.length} already present and size-valid.`);

if (dryRun) {
  await fs.rm(STAGING_ROOT, { recursive: true, force: true });
  console.log('Dry run complete; repository files were not changed.');
  process.exit(0);
}

for (const item of staged) {
  await fs.mkdir(path.dirname(item.target), { recursive: true });
  await fs.copyFile(item.stagedPath, item.target);
}
await fs.rm(STAGING_ROOT, { recursive: true, force: true });
console.log(`Recovered ${staged.length} Lovable-managed image files into local standalone assets.`);
