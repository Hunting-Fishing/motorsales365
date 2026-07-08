// Shared CORS headers for /api/public/* endpoints.
//
// Same-origin browser calls do not need these, but subdomains, native app
// wrappers, and partner integrations do. The signup surface must accept
// pre-flighted POSTs from every published origin, so we allow "*" for
// GET/POST/OPTIONS with a small, explicit header allow-list (no cookies).
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  "Access-Control-Max-Age": "86400",
};

export function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
