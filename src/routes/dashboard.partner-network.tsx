import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Network, ExternalLink } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { myPartnerApplications } from "@/lib/partner-network.functions";

export const Route = createFileRoute("/dashboard/partner-network")({
  head: () => ({
    meta: [
      { title: "My Partner Network Status — 365 MotorSales" },
      {
        name: "description",
        content:
          "Track your 365 partner network application, verification status, and published storefront.",
      },
      { property: "og:title", content: "My Partner Network Status — 365 MotorSales" },
      {
        property: "og:description",
        content: "Track your 365 partner application and published storefront.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyPartnerNetwork,
});

function MyPartnerNetwork() {
  const run = useServerFn(myPartnerApplications);
  const { data, isLoading } = useQuery({
    queryKey: ["my-partner-applications"],
    queryFn: () => run({}),
  });
  const apps = data ?? [];

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Network className="h-3.5 w-3.5" /> Partner network
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold">My partner applications</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Applications submitted with your account email appear here. We review documents before any
          storefront or network tool goes live.
        </p>

        <div className="mt-6 space-y-3">
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : apps.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="font-medium">No partner application yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Join the 365 network as a parts vendor, shop, or franchise partner.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/partners/parts/onboarding">Start an application</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/partners">Partner overview</Link>
                </Button>
              </div>
            </Card>
          ) : (
            apps.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{a.company_name}</p>
                      <Badge variant="outline" className="capitalize">
                        {a.status}
                      </Badge>
                      {a.storefront_published && <Badge variant="secondary">Live</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.business_kind} · {a.partnership_type} · {a.country} · submitted{" "}
                      {new Date(a.created_at).toLocaleDateString()}
                    </p>
                    {a.admin_notes && (
                      <p className="mt-2 text-sm text-muted-foreground">{a.admin_notes}</p>
                    )}
                  </div>
                  {a.storefront_published && a.storefront_slug && (
                    <Button asChild size="sm" variant="outline">
                      <Link
                        to="/parts/partners/store/$slug"
                        params={{ slug: a.storefront_slug }}
                      >
                        View storefront <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
