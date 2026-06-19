import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CustomTemplateRow } from "@/lib/share-kit-templates.functions";

const BUCKET = "share-kit-templates";
const PUBLIC_PREFIX = `/storage/v1/object/public/${BUCKET}/`;
const SIGNED_PREFIX = `/storage/v1/object/sign/${BUCKET}/`;

function extractPath(url: string): string | null {
  const i = url.indexOf(PUBLIC_PREFIX);
  if (i !== -1) return decodeURIComponent(url.slice(i + PUBLIC_PREFIX.length));
  const j = url.indexOf(SIGNED_PREFIX);
  if (j !== -1) {
    const rest = url.slice(j + SIGNED_PREFIX.length).split("?")[0];
    return decodeURIComponent(rest);
  }
  return null;
}

/**
 * The share-kit-templates bucket is private (workspace blocks public buckets),
 * so the public URLs stored on rows return "Bucket not found". This hook
 * batch-creates signed URLs and returns rows with `image_url` swapped out.
 */
export function useSignedCustomTemplates(rows: CustomTemplateRow[] | undefined) {
  const key = (rows ?? []).map((r) => r.id).join(",");
  return useQuery({
    queryKey: ["share-kit-custom-signed", key],
    enabled: !!rows && rows.length > 0,
    staleTime: 50 * 60 * 1000,
    queryFn: async (): Promise<CustomTemplateRow[]> => {
      const list = rows ?? [];
      const paths = list
        .map((r) => extractPath(r.image_url))
        .filter((p): p is string => !!p);
      if (paths.length === 0) return list;
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(paths, 60 * 60);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((d, i) => {
        if (d?.signedUrl) map[paths[i]] = d.signedUrl;
      });
      return list.map((r) => {
        const p = extractPath(r.image_url);
        return p && map[p] ? { ...r, image_url: map[p] } : r;
      });
    },
  });
}
