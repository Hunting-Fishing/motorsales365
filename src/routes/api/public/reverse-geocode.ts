import { createFileRoute } from "@tanstack/react-router";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_UA =
  "365MotorSales/1.0 (https://365motorsales.com; support@365motorsales.com)";

export const Route = createFileRoute("/api/public/reverse-geocode")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const lat = Number(url.searchParams.get("lat"));
          const lng = Number(url.searchParams.get("lng"));
          const zoomRaw = Number(url.searchParams.get("zoom") ?? "18");
          if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
            return Response.json({ error: "Invalid lat" }, { status: 400 });
          }
          if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
            return Response.json({ error: "Invalid lng" }, { status: 400 });
          }
          const zoom = Math.min(
            Math.max(Number.isFinite(zoomRaw) ? Math.round(zoomRaw) : 18, 1),
            18,
          );

          const u = new URL(NOMINATIM_URL);
          u.searchParams.set("format", "jsonv2");
          u.searchParams.set("lat", String(lat));
          u.searchParams.set("lon", String(lng));
          u.searchParams.set("zoom", String(zoom));
          u.searchParams.set("addressdetails", "1");
          u.searchParams.set("accept-language", "en");

          const res = await fetch(u.toString(), {
            headers: { "User-Agent": NOMINATIM_UA, Accept: "application/json" },
          });
          if (!res.ok) {
            return Response.json(
              { error: `Geocoder error (${res.status})` },
              { status: 502 },
            );
          }
          const data = (await res.json()) as {
            address?: Record<string, string>;
            display_name?: string;
          };
          return Response.json(
            { address: data.address ?? {}, displayName: data.display_name ?? null },
            { headers: { "Cache-Control": "public, max-age=300" } },
          );
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : "Reverse geocoding failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
