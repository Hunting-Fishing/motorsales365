import { createFileRoute, redirect } from "@tanstack/react-router";
import { resolveBusinessMiniSiteSlug } from "@/lib/business-pages.functions";

/**
 * Root-level business microsite URL: /<vanity-or-canonical-slug>.
 *
 * Enables shareable URLs like www.365motorsales.com/laoagtires.
 *
 * TanStack file-based routing matches static segments before dynamic ones,
 * so this only fires for slugs that don't collide with a named route
 * (`/dashboard`, `/businesses`, `/shop`, etc). The `business_reserved_slugs`
 * table blocks businesses from claiming those names as vanity slugs.
 *
 * Resolution order (via resolveBusinessMiniSiteSlug):
 *   1. vanity_slug   2. canonical slug   3. slug history (permanent redirect)
 */
export const Route = createFileRoute("/$slug")({
  beforeLoad: async ({ params }) => {
    const { business } = await resolveBusinessMiniSiteSlug({ data: { slug: params.slug } });
    if (!business) {
      // Unknown slug (or archived/hidden business) → send to directory.
      throw redirect({ to: "/businesses" });
    }
    throw redirect({ to: "/businesses/$slug", params: { slug: business.slug } });
  },
  component: () => null,
  notFoundComponent: () => null,
});
