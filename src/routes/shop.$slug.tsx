import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { Store, ExternalLink, MapPin } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { getPartnerStorefront } from "@/lib/partner-applications.functions";

export const Route = createFileRoute("/shop/$slug")({
  loader: async ({ params }) => {
    const sf = await getPartnerStorefront({ data: { slug: params.slug } });
    if (!sf) throw notFound();
    return { sf };
  },
  head: ({ loaderData, params }) => {
    const sf = loaderData?.sf;
    if (!sf) return { meta: [{ title: "Shop — 365 MotorSales" }] };
    const title = `${sf.company_name} — Parts partner | 365 MotorSales`;
    const desc =
      sf.storefront_blurb?.slice(0, 155) ??
      `${sf.company_name} is a 365 MotorSales parts partner. ${sf.business_kind} based in ${sf.country}.`;
    const url = `https://www.365motorsales.com/shop/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        ...(sf.storefront_logo_url
          ? [
              { property: "og:image", content: sf.storefront_logo_url },
              { name: "twitter:image", content: sf.storefront_logo_url },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-12 text-center">
        <h1 className="font-display text-2xl font-bold">Storefront not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This partner shop isn't published yet.
        </p>
        <Link to="/parts" className="mt-4 inline-block text-primary hover:underline">
          ← Back to Parts
        </Link>
      </div>
    </SiteLayout>
  ),
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-12 text-center text-sm text-destructive">
        {String(error?.message ?? "Failed to load")}
      </div>
    </SiteLayout>
  ),
  component: ShopPage,
});

function ShopPage() {
  const { sf } = Route.useLoaderData();
  const goUrl = `/api/public/go/partner-${encodeURIComponent(sf.storefront_slug)}`;

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
          <div className="flex flex-wrap items-start gap-4">
            {sf.storefront_logo_url ? (
              <img
                src={sf.storefront_logo_url}
                alt={`${sf.company_name} logo`}
                className="h-20 w-20 shrink-0 rounded-xl border border-border bg-background object-contain p-2"
              />
            ) : (
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-border bg-background">
                <Store className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-primary">
                <Store className="h-3 w-3" /> Parts partner
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{sf.company_name}</h1>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {sf.country} · {sf.business_kind}
              </p>
            </div>
            <Button asChild size="lg">
              <a href={goUrl} target="_blank" rel="nofollow sponsored noopener">
                Visit shop <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>

          {sf.storefront_blurb && (
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-foreground/90">
              {sf.storefront_blurb}
            </p>
          )}

          {sf.storefront_categories && sf.storefront_categories.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {sf.storefront_categories.map((c: string) => (
                <span
                  key={c}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground">
          365 MotorSales may earn a commission on purchases made via this partner.
        </p>

        <div className="mt-6">
          <Link to="/parts" className="text-sm text-primary hover:underline">
            ← Back to Parts
          </Link>
        </div>
      </div>
    </SiteLayout>
  );
}
