import { createHash } from 'node:crypto';

export function parseCc(value) {
  if (typeof value === 'number') return value > 0 && value <= 100000 ? value : null;
  const match = typeof value === 'string' && value.match(/^\s*([\d]+(?:\.\d+)?)\s*(?:ccm|cc|cm3|cm³)(?=\s|$|\()/i);
  return match ? parseCc(Number(match[1])) : null;
}
export function normalizeMotorcycle(raw, provider, observedOn) {
  if (!['api-ninjas', 'dataandapis'].includes(provider)) throw new Error('Unsupported provider');
  const make = String(raw.make ?? raw.brand ?? '').trim();
  const model = String(raw.model ?? '').trim();
  const year = Number(raw.year);
  if (!make || make.length > 60 || !model || model.length > 120) throw new Error('Missing or invalid make/model');
  if (!Number.isInteger(year) || year < 1885 || year > 2100) throw new Error('Missing or invalid model year');
  const cc = parseCc(provider === 'api-ninjas' ? raw.displacement : raw.engine?.displacementCcm);
  const engine = provider === 'api-ninjas' ? raw.engine : raw.engine?.type;
  const label = [cc ? `${cc}cc` : null, typeof engine === 'string' ? engine.trim() : null].filter(Boolean).join(', ') || null;
  const externalId = raw.id != null ? String(raw.id) : createHash('sha256').update(JSON.stringify([make, model, year, raw.displacement, engine])).digest('hex');
  return {
    source_key: provider, external_id: externalId,
    source_url: provider === 'api-ninjas' ? 'https://api-ninjas.com/api/motorcycles' : 'https://dataandapis.com/apis/motorcycles',
    observed_on: observedOn, category: 'motorcycle', market: 'ZZ', make, model,
    aliases: [], year_start: year, year_end: year, year_verified: true,
    engine_label: label, engine_code: null, engine_cc: cc, nominal_cc: null,
    trim: null, chassis_code: null, status: 'review',
    notes: 'Provider-reported model year; regional availability and engine specification require review. ZZ means market unassigned. Not approved for parts fitment.',
  };
}

export async function fetchMotorcycles({ provider, make, key, maxPages = 100, fetchImpl = fetch }) {
  if (!key || !make?.trim()) throw new Error('A server-side provider key and make are required');
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 1000) throw new Error('maxPages must be 1–1000');
  if (!['api-ninjas', 'dataandapis'].includes(provider)) throw new Error('Unsupported provider');
  const rows = []; const seenPages = new Set();
  for (let page = 1; page <= maxPages; page++) {
    const url = new URL(provider === 'api-ninjas' ? 'https://api.api-ninjas.com/v1/motorcycles' : 'https://api-motorcycles.dataandapis.com/v1/motorcycles');
    url.searchParams.set(provider === 'api-ninjas' ? 'make' : 'brand', make);
    if (provider === 'api-ninjas') { if (page > 1) url.searchParams.set('offset', String((page - 1) * 30)); }
    else { url.searchParams.set('page', String(page)); url.searchParams.set('limit', '20'); }
    const response = await fetchImpl(url, { headers: { 'X-Api-Key': key }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Provider HTTP ${response.status}; stopped without claiming complete coverage`);
    const payload = await response.json();
    const batch = provider === 'api-ninjas' ? payload : payload.results;
    if (!Array.isArray(batch)) throw new Error('Unexpected provider response');
    const signature = createHash('sha256').update(JSON.stringify(batch)).digest('hex');
    if (batch.length && seenPages.has(signature)) throw new Error('Repeated page: pagination may be restricted by the subscription');
    seenPages.add(signature); rows.push(...batch);
    const complete = provider === 'api-ninjas' ? batch.length < 30 : typeof payload.total === 'number' ? rows.length >= payload.total : batch.length < 20;
    if (complete) return { rows, complete: true, pages: page };
    if (!batch.length) throw new Error('Pagination ended before the advertised total');
  }
  return { rows, complete: false, pages: maxPages };
}
