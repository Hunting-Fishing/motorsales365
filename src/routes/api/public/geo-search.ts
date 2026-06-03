import { createFileRoute } from "@tanstack/react-router";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_UA =
  "365MotorSales/1.0 (https://365motorsales.com; support@365motorsales.com)";
const PH_VIEWBOX = "116.0,4.5,127.0,21.5";

type NominatimResult = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
};

export const Route = createFileRoute("/api/public/geo-search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const q = (url.searchParams.get("q") ?? "").trim();
          const limitRaw = Number(url.searchParams.get("limit") ?? "7");
          const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 7, 1), 10);
          if (q.length < 2 || q.length > 200) {
            return Response.json({ error: "Invalid query" }, { status: 400 });
          }

          const u = new URL(NOMINATIM_URL);
          u.searchParams.set("q", q);
          u.searchParams.set("format", "json");
          u.searchParams.set("addressdetails", "1");
          u.searchParams.set("limit", String(limit));
          u.searchParams.set("countrycodes", "ph");
          u.searchParams.set("viewbox", PH_VIEWBOX);
          u.searchParams.set("bounded", "1");

          const res = await fetch(u.toString(), {
            headers: { "User-Agent": NOMINATIM_UA, Accept: "application/json" },
          });
          if (!res.ok) {
            return Response.json(
              { error: `Geocoder error (${res.status})` },
              { status: 502 },
            );
          }
          const data = (await res.json()) as NominatimResult[];
          const results = data.map((r) => {
            const parts = r.display_name.split(", ");
            const primary = r.name || parts[0] || r.display_name;
            const secondary = parts.slice(primary === parts[0] ? 1 : 0).join(", ");
            return {
              id: String(r.place_id),
              primary,
              secondary,
              lat: Number(r.lat),
              lng: Number(r.lon),
              label: r.display_name,
            };
          });
          return Response.json(
            { results },
            { headers: { "Cache-Control": "public, max-age=300" } },
          );
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : "Geo search failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
