import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BenefitsGrid } from "@/components/franchise/benefits-grid";
import { TierCompareTable } from "@/components/franchise/tier-compare-table";
import { HowItWorks } from "@/components/franchise/how-it-works";
import { FranchiseFaq } from "@/components/franchise/franchise-faq";
import { listActiveTiers } from "@/lib/franchise.functions";
import { Handshake, ShieldCheck, TrendingUp } from "lucide-react";

const TITLE = "365 Franchise & Partner Program — Grow your shop with the 365 network";
const DESCRIPTION =
  "Join the 365 network as a Partner or Franchise. Get parts discounts, shared customer CRM, network stock visibility, marketing boost, and bundled Shop Manager tools.";
const URL = "https://www.365motorsales.com/franchise";

export const Route = createFileRoute("/franchise/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: FranchisePage,
});

function FranchisePage() {
  const fn = useServerFn(listActiveTiers);
  const { data: tiers = [] } = useQuery({
    queryKey: ["franchise", "tiers", "active"],
    queryFn: () => fn(),
  });

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4">
              <Handshake className="mr-1 h-3 w-3" /> Now accepting applications
            </Badge>
            <h1 className="font-display text-4xl font-bold sm:text-5xl">
              Join the 365 network. <span className="text-primary">Grow faster.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Two ways to join. Keep your brand as a <strong>365 Partner</strong>, or operate under
              the 365 banner as a full <strong>365 Franchise</strong>. Either way, you get parts
              discounts, marketing lift, shared customer CRM, and our Shop Manager suite — the same
              playbook NAPA uses with its independent AutoCare shops, built for the Philippines.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/franchise/apply">Apply now</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#compare">Compare tiers</a>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Verified network
              </span>
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Discounted parts & ads
              </span>
              <span className="flex items-center gap-2">
                <Handshake className="h-4 w-4 text-primary" /> Independent-friendly
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8 max-w-2xl">
          <h2 className="font-display text-3xl font-bold">What you get</h2>
          <p className="mt-2 text-muted-foreground">
            Four pillars, every tier. The tier you pick decides how deep the integration and the
            discounts go.
          </p>
        </div>
        <BenefitsGrid />
      </section>

      {/* Compare */}
      <section id="compare" className="border-y border-border bg-secondary/30">
        <div className="container mx-auto px-4 py-16">
          <div className="mb-8 max-w-2xl">
            <h2 className="font-display text-3xl font-bold">Partner vs Franchise</h2>
            <p className="mt-2 text-muted-foreground">
              Start as a Partner, upgrade to Franchise when you're ready for full network branding
              and lead routing.
            </p>
          </div>
          <TierCompareTable tiers={tiers} />
          {tiers.length ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {tiers.map((t) => (
                <Card key={t.slug} className="p-6">
                  <h3 className="font-display text-xl font-semibold">{t.name}</h3>
                  <p className="text-sm text-muted-foreground">{t.tagline}</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="mt-6 w-full">
                    <Link to="/franchise/apply" search={{ tier: t.slug } as any}>
                      Apply as {t.name}
                    </Link>
                  </Button>
                </Card>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8 max-w-2xl">
          <h2 className="font-display text-3xl font-bold">How it works</h2>
        </div>
        <HowItWorks />
      </section>

      {/* Positioning */}
      <section className="border-t border-border bg-secondary/30">
        <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="font-display text-2xl font-bold">Independent, but never alone.</h2>
          <p className="mt-3 text-muted-foreground">
            You keep the customers you built. We add the buying power, software, and trust badge of
            a nationwide network on top. Every franchise fee and membership dollar goes back into
            the tools, marketing, and support that keep partner shops competitive.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto max-w-3xl px-4 py-16">
        <h2 className="mb-6 font-display text-3xl font-bold">Frequently asked questions</h2>
        <FranchiseFaq />
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/franchise/apply">Apply to join</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/contact">Talk to our team</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
