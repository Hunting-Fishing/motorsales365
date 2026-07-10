import { createFileRoute } from "@tanstack/react-router";

/**
 * Free IP-based geolocation fallback (used when browser geolocation is
 * blocked, e.g. in an embedded preview iframe with a Permissions-Policy).
 * Uses ip-api.com (free, no key, HTTPS via https://pro.ip-api.com would
 * require a key — we use the free https endpoint via ipwho.is which is
 * fully free + https).
 */
export const Route = createFileRoute("/api/public/ip-location")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const fwd =
            request.headers.get("cf-connecting-ip") ||
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            "";
          const url = fwd ? `https://ipwho.is/${fwd}` : "https://ipwho.is/";
          const res = await fetch(url, { headers: { Accept: "application/json" } });
          if (!res.ok) {
            return Response.json({ error: `Lookup failed (${res.status})` }, { status: 502 });
          }
          const data = (await res.json()) as {
            success?: boolean;
            latitude?: number;
            longitude?: number;
            city?: string;
            region?: string;
            country_code?: string;
            message?: string;
          };
          if (!data.success || typeof data.latitude !== "number") {
            return Response.json(
              { error: data.message ?? "No location for IP" },
              { status: 404 },
            );
          }
          return Response.json(
            {
              lat: data.latitude,
              lng: data.longitude,
              city: data.city ?? null,
              region: data.region ?? null,
              countryCode: data.country_code ?? null,
            },
            { headers: { "Cache-Control": "private, max-age=300" } },
          );
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : "IP lookup failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
