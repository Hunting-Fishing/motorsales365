import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const reverseGeocode = createServerFn({ method: "POST" })
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return { address: null as string | null };
    }

    const url =
      "https://maps.googleapis.com/maps/api/geocode/json" +
      `?latlng=${encodeURIComponent(`${data.lat},${data.lng}`)}` +
      `&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) return { address: null };
    const json: any = await res.json();
    const first = json?.results?.[0];
    return { address: (first?.formatted_address as string | undefined) ?? null };
  });
