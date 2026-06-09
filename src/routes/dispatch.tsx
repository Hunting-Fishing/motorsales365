import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Network, Siren, ShieldCheck, Truck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dispatch")({
  head: () => ({
    meta: [
      { title: "365 Dispatch — Nationwide Tow Provider Network" },
      {
        name: "description",
        content:
          "Join 365 Dispatch and get auto-matched to emergency tow requests across the Philippines. Plans from ₱499/mo.",
      },
      { property: "og:title", content: "365 Dispatch — Nationwide Tow Network" },
      {
        property: "og:description",
        content:
          "Subscribed tow providers get instant access to nearby emergency tow jobs nationwide.",
      },
    ],
  }),
  component: DispatchLanding,
});

const PLANS = [
  {
    slug: "dispatch_starter_monthly",
    name: "Dispatch Starter",
    price: 499,
    coverage: "Home region only",
    jobs: "Up to 3 active jobs",
    perks: ["Standard placement in dispatch queue", "In-app + email alerts", "Cancel anytime"],
    tone: "border-border",
  },
  {
    slug: "dispatch_pro_monthly",
    name: "Dispatch Pro",
    price: 1499,
    coverage: "Up to 4 regions",
    jobs: "Up to 10 active jobs",
    perks: ["High priority in dispatch queue", "Multi-region coverage", "Pro badge on profile"],
    tone: "border-primary ring-2 ring-primary/20",
    highlight: "Most popular",
  },
  {
    slug: "dispatch_fleet_monthly",
    name: "Dispatch Fleet",
    price: 2999,
    coverage: "Nationwide",
    jobs: "Unlimited active jobs",
    perks: [
      "Top priority in dispatch queue",
      "Nationwide auto-match",
      "Featured badge & profile boost",
    ],
    tone: "border-amber-400/60",
  },
];

function DispatchLanding() {
  return (
    <main>
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-secondary/30 to-background">
        <div className="container mx-auto px-4 py-16">
          <Badge className="mb-4 bg-primary text-primary-foreground">365 Dispatch</Badge>
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            Nationwide tow dispatch, automated.
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Subscribe your towing company to 365 Dispatch and we'll match you to nearby
            emergency tow requests instantly — ranked by location, rating, and response
            time. No commissions per job, just one flat monthly fee.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href="#plans">
                <Network className="mr-2 h-4 w-4" /> See dispatch plans
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/dashboard/tow">
                <Truck className="mr-2 h-4 w-4" /> Manage as provider
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: <Siren className="h-6 w-6" />,
              title: "Instant match",
              body: "New emergency tow requests are pushed to your dashboard within seconds.",
            },
            {
              icon: <Zap className="h-6 w-6" />,
              title: "5-minute accept window",
              body: "Top providers get first dibs. After 5 minutes the pool broadens automatically.",
            },
            {
              icon: <ShieldCheck className="h-6 w-6" />,
              title: "No per-job fees",
              body: "Flat monthly subscription — keep 100% of what you charge each customer.",
            },
          ].map((f) => (
            <Card key={f.title} className="p-6">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {f.icon}
              </div>
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="plans" className="container mx-auto px-4 py-12">
        <h2 className="font-display text-3xl font-bold">Pick your plan</h2>
        <p className="mt-1 text-muted-foreground">
          All plans are monthly, cancel anytime. Upgrades and downgrades are prorated.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => (
            <Card key={p.slug} className={`relative overflow-hidden p-6 ${p.tone}`}>
              {p.highlight && (
                <Badge className="absolute right-3 top-3 bg-primary text-primary-foreground">
                  {p.highlight}
                </Badge>
              )}
              <h3 className="font-display text-xl font-bold">{p.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold">₱{p.price.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
              <div className="mt-4 space-y-1 text-sm">
                <div className="font-medium">{p.coverage}</div>
                <div className="text-muted-foreground">{p.jobs}</div>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full" size="lg">
                <Link to="/dashboard/tow" hash="dispatch">
                  Subscribe
                </Link>
              </Button>
            </Card>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Subscribing requires an active tow provider profile. Set up your business and rates
          first under{" "}
          <Link to="/dashboard/tow" className="underline">
            Provider dashboard
          </Link>
          .
        </p>
      </section>

      <section className="border-t border-border bg-secondary/30">
        <div className="container mx-auto px-4 py-12">
          <h2 className="font-display text-2xl font-bold">How dispatch works</h2>
          <ol className="mt-4 grid gap-4 md:grid-cols-4">
            {[
              "A driver posts an emergency tow request.",
              "We instantly rank subscribed providers by tier, proximity, rating, and response time.",
              "The top matches get a 5-minute exclusive window to accept.",
              "First to accept wins the job — others see it close in real time.",
            ].map((step, i) => (
              <li key={i} className="rounded-lg border border-border bg-card p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Step {i + 1}
                </div>
                <div className="mt-1 text-sm">{step}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
