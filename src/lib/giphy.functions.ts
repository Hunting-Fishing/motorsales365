import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type GiphyItem = {
  id: string;
  title: string;
  preview_url: string;
  full_url: string;
  width: number;
  height: number;
};

type GiphyRaw = {
  data?: Array<{
    id: string;
    title: string;
    images: {
      fixed_width_small?: { url: string; width: string; height: string };
      fixed_width?: { url: string; width: string; height: string };
      original?: { url: string; width: string; height: string };
      downsized_medium?: { url: string; width: string; height: string };
    };
  }>;
  pagination?: { offset: number; total_count: number; count: number };
  meta?: { status: number; msg: string };
};

function mapItems(raw: GiphyRaw): GiphyItem[] {
  return (raw.data ?? []).map((g) => {
    const preview = g.images.fixed_width_small ?? g.images.fixed_width ?? g.images.original;
    const full = g.images.downsized_medium ?? g.images.original ?? g.images.fixed_width;
    return {
      id: g.id,
      title: g.title,
      preview_url: preview?.url ?? "",
      full_url: full?.url ?? preview?.url ?? "",
      width: Number(full?.width ?? preview?.width ?? 200),
      height: Number(full?.height ?? preview?.height ?? 200),
    };
  });
}

async function callGiphy(path: string, params: Record<string, string>): Promise<GiphyItem[]> {
  const key = process.env.GIPHY_API_KEY;
  if (!key) throw new Error("GIPHY_API_KEY not configured");
  const url = new URL(`https://api.giphy.com/v1/gifs/${path}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("rating", "pg-13");
  url.searchParams.set("bundle", "messaging_non_clips");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Giphy ${res.status}: ${body}`);
  }
  const raw = (await res.json()) as GiphyRaw;
  return mapItems(raw);
}

export const giphyTrending = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { offset?: number; limit?: number }) => d)
  .handler(async ({ data }) => {
    return callGiphy("trending", {
      limit: String(data.limit ?? 24),
      offset: String(data.offset ?? 0),
    });
  });

export const giphySearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { q: string; offset?: number; limit?: number }) => d)
  .handler(async ({ data }) => {
    const q = (data.q ?? "").trim();
    if (!q) return [] as GiphyItem[];
    return callGiphy("search", {
      q,
      limit: String(data.limit ?? 24),
      offset: String(data.offset ?? 0),
    });
  });
