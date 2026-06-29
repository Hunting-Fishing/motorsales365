import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { PARTS_CATEGORIES, findCategory } from "@/data/parts-categories";

function publicClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export type PartnerProductRow = {
  network: string;
  merchant_slug: string;
  sku: string;
  title: string;
  brand: string | null;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  deeplink: string;
  country: string;
  category_path: string | null;
};

/** Public: fetch partner products that match any of the category's keywords. */
export const getCategoryProducts = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string; country?: string; limit?: number }) =>
    z
      .object({
        slug: z.string().trim().min(1).max(80),
        country: z.string().trim().length(2).default("PH"),
        limit: z.number().int().min(1).max(60).default(36),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<PartnerProductRow[]> => {
    const cat = findCategory(data.slug);
    if (!cat) return [];
    const sb = publicClient();
    // OR-join keyword ILIKE tokens
    const orExpr = cat.keywords
      .map((k) => `title.ilike.%${k.replace(/[%_,()]/g, " ")}%`)
      .join(",");
    const { data: rows } = await sb
      .from("partner_products" as any)
      .select("network,merchant_slug,sku,title,brand,price,currency,image_url,deeplink,country,category_path")
      .eq("country", data.country.toUpperCase())
      .or(orExpr)
      .order("updated_at", { ascending: false })
      .limit(data.limit);
    return ((rows as any[]) ?? []) as PartnerProductRow[];
  });

/** Public: single product detail by network + sku. */
export const getPartnerProduct = createServerFn({ method: "GET" })
  .inputValidator((d: { network: string; sku: string }) =>
    z
      .object({
        network: z.string().trim().min(1).max(40),
        sku: z.string().trim().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<PartnerProductRow | null> => {
    const sb = publicClient();
    const { data: row } = await sb
      .from("partner_products" as any)
      .select("network,merchant_slug,sku,title,brand,price,currency,image_url,deeplink,country,category_path")
      .eq("network", data.network)
      .eq("sku", data.sku)
      .maybeSingle();
    return (row as any) ?? null;
  });

/** Public: related products from the same merchant (cheap "more like this"). */
export const getRelatedProducts = createServerFn({ method: "GET" })
  .inputValidator((d: { merchant_slug: string; excludeSku: string; limit?: number }) =>
    z
      .object({
        merchant_slug: z.string().trim().min(1).max(80),
        excludeSku: z.string().trim().min(1).max(200),
        limit: z.number().int().min(1).max(12).default(8),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<PartnerProductRow[]> => {
    const sb = publicClient();
    const { data: rows } = await sb
      .from("partner_products" as any)
      .select("network,merchant_slug,sku,title,brand,price,currency,image_url,deeplink,country,category_path")
      .eq("merchant_slug", data.merchant_slug)
      .neq("sku", data.excludeSku)
      .order("updated_at", { ascending: false })
      .limit(data.limit);
    return ((rows as any[]) ?? []) as PartnerProductRow[];
  });

export { PARTS_CATEGORIES };
