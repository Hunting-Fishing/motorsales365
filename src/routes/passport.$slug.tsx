/**
 * SYNC GROUP: vehicle-passport
 * Source of truth: .lovable/sync-groups.md#vehicle-passport
 * Siblings: src/components/passport-page.tsx, src/routes/dashboard.vehicles.tsx,
 *           src/lib/vehicles.functions.ts, src/components/passport-share-section.tsx
 * On change: bump VERSION + update sync-groups.md
 * VERSION: 3
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { PassportPage } from "@/components/passport-page";
import { getPublicPassport } from "@/lib/passport.functions";

export const Route = createFileRoute("/passport/$slug")({
  loader: async ({ params }) => {
    const result = await getPublicPassport({ data: { slug: params.slug } });
    if (!result.vehicle) throw notFound();
    return result;
  },
  head: ({ loaderData, params }) => {
    const v = loaderData?.vehicle as any;
    const url = `https://www.365motorsales.com/passport/${params.slug}`;
    if (!v) return { meta: [{ title: "Vehicle passport — 365 MotorSales" }] };
    const name = v.nickname || `${v.year ? v.year + " " : ""}${v.make} ${v.model}`;
    const title = `${name} — Vehicle passport | 365 MotorSales`;
    const desc = `Verified service history for ${v.make} ${v.model}${v.year ? ` (${v.year})` : ""}. Powered by 365 MotorSales Philippines.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        ...(v.cover_url ? [{ property: "og:image", content: v.cover_url }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container mx-auto p-12 text-center">
        <h1 className="font-display text-2xl font-semibold">Passport not found</h1>
        <p className="mt-2 text-muted-foreground">
          This vehicle passport is private or doesn't exist.
        </p>
      </div>
    </SiteLayout>
  ),
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="container mx-auto p-12 text-center">
        <h1 className="font-display text-xl font-semibold">Couldn't load passport</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={reset} className="mt-4 underline">
          Retry
        </button>
      </div>
    </SiteLayout>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { vehicle, records, photos } = Route.useLoaderData() as any;
  return <PassportPage vehicle={vehicle} records={records} photos={photos} />;
}
