import { createFileRoute } from "@tanstack/react-router";
import { geocodeAddress } from "@/lib/places.server";

export const Route = createFileRoute("/api/public/geocode")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const q = (url.searchParams.get("q") ?? "").trim();
          if (q.length < 2 || q.length > 200) {
            return Response.json({ error: "Invalid query" }, { status: 400 });
          }
          const result = await geocodeAddress(q);
          if (!result) {
            return Response.json({ error: "Location not found" }, { status: 404 });
          }
          return Response.json(result, {
            headers: { "Cache-Control": "public, max-age=300" },
          });
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : "Geocoding failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
