import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MapPin, Sparkles } from "lucide-react";
import { listTrainingPartners } from "@/lib/education.functions";

export const Route = createFileRoute("/partner-training")({
  loader: () => listTrainingPartners(),
  head: () => ({
    meta: [
      { title: "Partner Training Schools — 365 Motorsales" },
      {
        name: "description",
        content:
          "Independent automotive training facilities partnered with 365 Motorsales. Sponsored placements clearly labeled.",
      },
      { property: "og:title", content: "Partner Training Schools — 365 Motorsales" },
      {
        property: "og:description",
        content:
          "Discover external auto training schools — paid sponsored listings, clearly disclosed.",
      },
    ],
  }),
  component: PartnersPage,
});

function PartnersPage() {
  const data = Route.useLoaderData();
  const partners = (data?.partners ?? []) as any[];
  const featured = partners.filter((p) => p.tier === "featured");
  const standard = partners.filter((p) => p.tier !== "featured");

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-10">
        <Link to="/learn" className="text-sm text-muted-foreground hover:underline">
          ← 365 Learn
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Partner Training Schools
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Independent auto training facilities. Listings here are{" "}
          <strong>paid sponsored placements</strong> — 365 Motorsales does not certify or endorse
          the curriculum. Always verify accreditation before enrolling.
        </p>

        {featured.length > 0 && (
          <>
            <h2 className="mt-10 flex items-center gap-2 text-xl font-semibold">
              <Sparkles className="h-5 w-5 text-primary" /> Featured partners
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {featured.map((p) => (
                <PartnerCard key={p.id} p={p} />
              ))}
            </div>
          </>
        )}

        {standard.length > 0 && (
          <>
            <h2 className="mt-10 text-xl font-semibold">All partners</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {standard.map((p) => (
                <PartnerCard key={p.id} p={p} />
              ))}
            </div>
          </>
        )}

        {partners.length === 0 && (
          <div className="mt-12 rounded-xl border border-dashed p-12 text-center">
            <p className="text-sm text-muted-foreground">No partner schools listed yet.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/contact">Become a partner</Link>
            </Button>
          </div>
        )}

        <div className="mt-16 rounded-xl border bg-muted/50 p-6 text-sm">
          <h3 className="font-semibold">Want to be listed here?</h3>
          <p className="mt-1 text-muted-foreground">
            Sponsored partner placements are available to accredited training schools. Get in touch
            to discuss featured vs. standard slots and pricing.
          </p>
          <Button asChild variant="outline" className="mt-3">
            <Link to="/contact">Contact our partnerships team</Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}

function PartnerCard({ p }: { p: any }) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {p.logo_url ? (
            <img src={p.logo_url} alt={p.name} className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-secondary text-lg font-bold">
              {p.name[0]}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold">{p.name}</h3>
              <Badge variant="outline" className="text-[10px]">
                Sponsored
              </Badge>
            </div>
            {p.location && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {p.location}
              </p>
            )}
          </div>
        </div>
        {p.description && <p className="mt-3 text-sm text-muted-foreground">{p.description}</p>}
        {(p.specialties ?? []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {p.specialties.map((s: string) => (
              <Badge key={s} variant="secondary" className="text-[10px]">
                {s}
              </Badge>
            ))}
          </div>
        )}
        <Button asChild variant="outline" size="sm" className="mt-4 w-full">
          <a
            href={`/api/public/training-partners/${p.id}/click`}
            target="_blank"
            rel="noopener sponsored noreferrer"
          >
            Visit website <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
