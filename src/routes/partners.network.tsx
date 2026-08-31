import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, Store, Globe2, Network } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listNetworkPartners } from "@/lib/partner-network.functions";

const TITLE = "365 Associate Network Directory — Parts Stores & Repair Shops";
const DESCRIPTION =
  "Browse verified 365 MotorSales Associates: parts stores, wholesalers, surplus dealers, and repair shops with published storefronts.";
const URL = "https://www.365motorsales.com/partners/network";

export const Route = createFileRoute("/partners/network")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: NetworkDirectory,
});

function NetworkDirectory() {
  const run = useServerFn(listNetworkPartners);
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["partner-network", term],
    queryFn: () => run({ data: { q: term } }),
  });
  const partners = data ?? [];

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Network className="h-3.5 w-3.5" /> Associate directory
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold">365 Associate businesses</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Verified parts stores, wholesalers, and repair shops with a published 365 storefront.
          Every Associate here passed document review before going live.
        </p>

        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTerm(q.trim());
          }}
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search partner name…"
            aria-label="Search partner name"
          />
          <Button type="submit">
            <Search className="mr-1 h-4 w-4" /> Search
          </Button>
        </form>

        <div className="mt-6">
          {isLoading ? (
            <p className="text-muted-foreground">Loading partners…</p>
          ) : partners.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="font-medium">No published partners match yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We're onboarding stores and repair shops now—apply to be one of the first in your
                city.
              </p>
              <Button asChild className="mt-4">
                <Link to="/partners">Choose an Associate track</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {partners.map((p) => (
                <Link
                  key={p.storefront_slug}
                  to="/parts/partners/store/$slug"
                  params={{ slug: p.storefront_slug }}
                  className="flex flex-col rounded-xl border border-border bg-card p-4 transition hover:border-primary hover:shadow-md"
                >
                  <div className="flex items-center gap-2">
                    {p.storefront_logo_url ? (
                      <img
                        src={p.storefront_logo_url}
                        alt={`${p.company_name} logo`}
                        loading="lazy"
                        className="h-9 w-9 rounded-md object-cover"
                      />
                    ) : (
                      <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
                        <Store className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.company_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.business_kind} · {p.country}
                      </p>
                    </div>
                  </div>
                  {p.storefront_blurb && (
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {p.storefront_blurb}
                    </p>
                  )}
                  {p.storefront_categories && p.storefront_categories.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {p.storefront_categories.slice(0, 4).map((c) => (
                        <span
                          key={c}
                          className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                  {p.website && (
                    <span className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Globe2 className="h-3 w-3" /> Has own website
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-10 rounded-xl border border-border bg-muted/30 p-6">
          <h2 className="font-display text-xl font-bold">Want your store listed here?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit your business documents once. On approval we publish your storefront and switch
            on network + affiliate tools.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/partners/associate/apply">Join the Associate Network</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/partners">Associate overview</Link>
            </Button>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
