import { createFileRoute, redirect } from "@tanstack/react-router";
import { resolveBusinessMiniSiteSlug } from "@/lib/business-pages.functions";

/**
 * Short vanity URL: /b/<vanity>.
 *
 * Resolves the short slug to the canonical /businesses/:slug URL.
 * Looks up by vanity_slug first, then canonical slug, then slug history.
 */
export const Route = createFileRoute("/b/$slug")({
  beforeLoad: async ({ params }) => {
    const { business } = await resolveBusinessMiniSiteSlug({ data: { slug: params.slug } });
    if (!business) {
      // Truly suppressed (archived/hidden/etc.) → don't expose via direct link.
      // Pending businesses ARE exposed — they are the owner's mini-site.
      throw redirect({ to: "/businesses" });
    }
    throw redirect({ to: "/businesses/$slug", params: { slug: business.slug } });
  },
  component: () => null,
});
