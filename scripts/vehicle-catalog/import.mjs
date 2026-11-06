// Node 22+. Fetches licensed provider data into review; never publishes automatically.
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { fetchMotorcycles, normalizeMotorcycle } from './providers.mjs';

const { values } = parseArgs({ options: {
  provider: { type: 'string' }, make: { type: 'string' }, input: { type: 'string' },
  output: { type: 'string', default: 'vehicle-catalog-review.json' },
  'max-pages': { type: 'string', default: '100' },
  apply: { type: 'boolean', default: false }, 'license-reviewed': { type: 'boolean', default: false },
} });
if (!values['license-reviewed']) throw new Error('Confirm provider storage/display rights before fetching or importing: --license-reviewed');
let source;
if (values.input) {
  const input = JSON.parse(await readFile(values.input, 'utf8'));
  source = { rows: Array.isArray(input) ? input : input.results, complete: false, pages: 0 };
  if (!Array.isArray(source.rows)) throw new Error('Input must contain provider records');
} else {
  source = await fetchMotorcycles({ provider: values.provider, make: values.make,
    key: process.env.VEHICLE_CATALOG_API_KEY, maxPages: Number(values['max-pages']) });
}
const observed = new Date().toISOString().slice(0, 10);
const entries = source.rows.map(raw => normalizeMotorcycle(raw, values.provider, observed));
const deduped = [...new Map(entries.map(e => [`${e.source_key}:${e.external_id}:${e.market}`, e])).values()];
await writeFile(values.output, JSON.stringify({ provider: values.provider, make: values.make,
  fetchedOn: observed, complete: source.complete, pages: source.pages, count: deduped.length, entries: deduped }, null, 2));
if (values.apply) {
  const base = new URL(process.env.SUPABASE_URL);
  if (base.protocol !== 'https:' || !base.hostname.endsWith('.supabase.co')) throw new Error('Expected a Supabase HTTPS project URL');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('A server-only Supabase credential is required');
  for (let i = 0; i < deduped.length; i += 100) {
    const response = await fetch(new URL('/rest/v1/vehicle_catalog_entries?on_conflict=source_key,external_id,market', base), {
      method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(deduped.slice(i, i + 100)), signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Database HTTP ${response.status}; earlier batches may exist. Rerun safely; existing records are preserved.`);
  }
}
console.log(JSON.stringify({ staged: deduped.length, complete: source.complete, appliedForReview: values.apply, output: values.output }));
