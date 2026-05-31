import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Short vanity URL: /b/<vanity>.
 *
 * Resolves the short slug to the canonical /businesses/:slug URL.
 * Looks up by vanity_slug first, then canonical slug, then slug history.
 */
export const Route = createFileRoute("/b/$slug")({
  beforeLoad: async ({ params }) => {
    const lookup = params.slug.toLowerCase();

    // 1. vanity_slug
    let { data: biz } = await (supabase as any)
      .from("businesses")
      .select("slug,status")
      .eq("vanity_slug", lookup)
      .maybeSingle();

    // 2. canonical slug (rare — someone shared a /b/ link with the long slug)
    if (!biz) {
      const r = await (supabase as any)
        .from("businesses")
        .select("slug,status")
        .eq("slug", lookup)
        .maybeSingle();
      biz = r.data;
    }

    // 3. history (renamed slug or vanity)
    if (!biz) {
      const { data: hist } = await (supabase as any)
        .from("business_slug_history")
        .select("business_id")
        .ilike("old_slug", lookup)
        .limit(1)
        .maybeSingle();
      if (hist) {
        const r = await (supabase as any)
          .from("businesses")
          .select("slug,status")
          .eq("id", (hist as any).business_id)
          .maybeSingle();
        biz = r.data;
      }
    }

    if (!biz) {
      throw redirect({ to: "/businesses" });
    }
    throw redirect({ to: "/businesses/$slug", params: { slug: (biz as any).slug } });
  },
  component: () => null,
});
