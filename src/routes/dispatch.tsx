import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Minus, Network, Siren, ShieldCheck, Truck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dispatch")({
  head: () => ({
    meta: [
      { title: "365 Dispatch — PH Tow & Trucking Dispatch Software from ₱250/mo" },
      {
        name: "description",
        content:
          "The underdog dispatch software for Philippine tow and trucking operators. Solo ₱250 (1 driver), Team ₱500 (5 drivers), Unlimited drivers ₱1,000 per month. No per-job commissions.",
      },
      { property: "og:title", content: "365 Dispatch — PH Tow & Trucking Dispatch Software" },
      {
        property: "og:description",
        content:
          "Dispatch software for every PH tow and trucking operator. Solo ₱250, Team ₱500, Unlimited ₱1,000 per month.",
      },
    ],
  }),
  component: DispatchLanding,
});

const PLANS = [
  {
    slug: "dispatch_solo_monthly",
    name: "Solo",
    price: 250,
    tagline: "Owner-operator starter",
    coverage: "1 service region",
    jobs: "1 driver seat",
    perks: [
      "Free directory listing",
      "Dispatch inbox (web + PWA)",
      "Email + in-app job alerts",
      "Cancel anytime",
    ],
    tone: "border-border",
  },
  {
    slug: "dispatch_team_monthly",
    name: "Team",
    price: 500,
    tagline: "Most popular for small shops",
    coverage: "Up to 3 service regions",
    jobs: "Up to 5 drivers",
    perks: [
      "Priority placement in dispatch queue",
      "SMS + push job alerts",
      "Accept / decline + auto-route to nearest driver",
      "Team badge on your public profile",
    ],
    tone: "border-primary ring-2 ring-primary/20",
    highlight: "Most popular",
  },
  {
    slug: "dispatch_unlimited_monthly",
    name: "Unlimited",
    price: 1000,
    tagline: "Run your whole fleet",
    coverage: "Nationwide · multi-branch",
    jobs: "Unlimited drivers",
    perks: [
      "Live GPS truck tracking",
      "Multi-branch + role-based staff accounts",
      "White-label tracking link for your customer",
      "API access + webhooks",
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
            Dispatch software for PH tow &amp; trucking operators — from ₱250/month.
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            AAP, Motolite Res-Q, Shell Go+, and MPT DriveHub talk to drivers. We power the
            tow and trucking operators behind them. Pay per driver seat, no per-job
            commissions, no radios, no group chats.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href="#plans">
                <Network className="mr-2 h-4 w-4" /> See plans
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/dashboard/tow">
                <Truck className="mr-2 h-4 w-4" /> Provider dashboard
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
              title: "Get jobs",
              body: "Be discoverable to every stranded driver, insurer, and dealership in your service area.",
            },
            {
              icon: <Zap className="h-6 w-6" />,
              title: "Run the dispatch",
              body: "One inbox for SMS, web, and partner requests. Assign to drivers in two taps.",
            },
            {
              icon: <ShieldCheck className="h-6 w-6" />,
              title: "Look professional",
              body: "Branded tracking link, verified badge, and reviews you actually own.",
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

      <section className="container mx-auto px-4 py-8">
        <div className="rounded-xl border border-border bg-card p-6 md:p-8">
          <h3 className="font-display text-xl font-semibold">What changes as you grow</h3>
          <ul className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <strong className="text-foreground">Solo</strong> gets you listed and gives you a basic inbox
                for 1 driver — enough to start receiving jobs.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <strong className="text-foreground">Team</strong> adds priority placement, SMS alerts, and auto-routing
                across up to 5 drivers.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <strong className="text-foreground">Unlimited</strong> unlocks unlimited drivers, GPS tracking,
                multi-branch, white-label links, and API access.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                All tiers are cancel-anytime and keep 100% of what you charge the customer.
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section id="plans" className="container mx-auto px-4 py-12">
        <h2 className="font-display text-3xl font-bold">Underdog pricing.</h2>
        <p className="mt-1 text-muted-foreground">
          One tow job in Metro Manila averages ₱2,500–₱5,000. Our top tier costs ₱1,000/mo —
          a single completed job covers a full year of Unlimited.
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
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-primary">
                {p.tagline}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold">₱{p.price.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">/mo</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ≈ ${(p.price / 56).toFixed(2)} USD
                </span>
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
                <Link to="/dispatch/checkout" search={{ priceId: p.slug }}>
                  Subscribe
                </Link>
              </Button>
            </Card>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Annual billing (2 months free) is available under{" "}
          <Link to="/pricing" className="underline">
            /pricing
          </Link>{" "}
          for tow and trucking operators. Subscribing requires an active provider profile —
          set yours up under{" "}
          <Link to="/dashboard/tow" className="underline">
            Provider dashboard
          </Link>
          .
        </p>
        <div className="mt-6">
          <Button asChild variant="outline">
            <a href="#compare">Compare all features</a>
          </Button>
        </div>
      </section>

      <section id="compare" className="border-t border-border bg-background">
        <div className="container mx-auto px-4 py-12">
          <h2 className="font-display text-3xl font-bold">Compare every feature</h2>
          <p className="mt-1 text-muted-foreground">
            Every tier includes the basics. Upgrade when you outgrow the limits.
          </p>

          <FeatureMatrix />
        </div>
      </section>


      <section className="border-t border-border bg-secondary/30">
        <div className="container mx-auto px-4 py-12">
          <h2 className="font-display text-2xl font-bold">
            Why not just stay on AAP / Motolite / Shell?
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Those are consumer roadside memberships — the motorist pays ₱900–₱2,500/year
            and calls one hotline. The actual tow operator behind that hotline is invisible
            to the customer, paid per dispatch, and has no software of their own. That's
            where we fit: every independent and subcontracted tow + trucking operator in
            the Philippines needs a way to take jobs, dispatch a driver, and look
            legitimate. ₱49/month gets you on the map. ₱999/month replaces a ₱150,000
            fleet-management suite.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                t: "AAP / Motolite / Shell Go+",
                b: "Sell roadside memberships to drivers. You're a subcontractor on their hotline.",
              },
              {
                t: "Imported fleet software",
                b: "$200–$500/month, English-only, designed for US/EU dispatchers.",
              },
              {
                t: "365 Dispatch",
                b: "Built in PH for PH operators. ₱49 to start. GCash, Maya, card, bank.",
              },
            ].map((c) => (
              <Card key={c.t} className="p-4">
                <div className="text-sm font-semibold">{c.t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{c.b}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="container mx-auto px-4 py-12">
          <h2 className="font-display text-2xl font-bold">How dispatch works</h2>
          <ol className="mt-4 grid gap-4 md:grid-cols-4">
            {[
              "A driver, insurer, or dealership posts a job.",
              "We rank subscribed providers by tier, proximity, rating, and response time.",
              "Top matches get a 5-minute exclusive window to accept.",
              "First to accept wins. You keep 100% of what you charge the customer.",
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

type Cell = boolean | string;
const TIERS = ["Starter", "Pro", "Fleet"] as const;

const FEATURE_GROUPS: { group: string; rows: { label: string; values: [Cell, Cell, Cell] }[] }[] = [
  {
    group: "Visibility & jobs",
    rows: [
      { label: "Public directory listing", values: [true, true, true] },
      { label: "Priority placement in dispatch queue", values: [false, true, true] },
      { label: "Verified provider badge", values: ["Basic", "Pro badge", "Fleet badge"] },
      { label: "Job volume", values: ["Up to 20 / mo", "Unlimited", "Unlimited"] },
      { label: "Service coverage", values: ["1 region", "Up to 3 regions", "Nationwide + multi-branch"] },
    ],
  },
  {
    group: "Dispatch tools",
    rows: [
      { label: "Dispatch inbox (web + PWA)", values: [true, true, true] },
      { label: "Email + in-app alerts", values: [true, true, true] },
      { label: "SMS + push job alerts", values: [false, true, true] },
      { label: "Accept / decline + auto-route to nearest driver", values: [false, true, true] },
      { label: "Driver seats", values: ["1 truck", "Up to 5 drivers", "Unlimited drivers"] },
    ],
  },
  {
    group: "Operations & brand",
    rows: [
      { label: "Live GPS truck tracking", values: [false, false, true] },
      { label: "Multi-branch + role-based staff accounts", values: [false, false, true] },
      { label: "White-label customer tracking link", values: [false, false, true] },
      { label: "API access + webhooks", values: [false, false, true] },
    ],
  },
  {
    group: "Billing",
    rows: [
      { label: "Monthly price", values: ["₱49", "₱299", "₱999"] },
      { label: "Cancel anytime", values: [true, true, true] },
    ],
  },
];

function CellView({ value }: { value: Cell }) {
  if (value === true)
    return <Check className="mx-auto h-5 w-5 text-emerald-600" aria-label="Included" />;
  if (value === false)
    return <Minus className="mx-auto h-4 w-4 text-muted-foreground/60" aria-label="Not included" />;
  return <span className="text-sm">{value}</span>;
}

function FeatureMatrix() {
  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40">
            <th className="px-4 py-3 text-left font-display text-sm font-semibold">Feature</th>
            {TIERS.map((t, i) => (
              <th
                key={t}
                className={`px-4 py-3 text-center font-display text-sm font-semibold ${
                  i === 1 ? "text-primary" : ""
                }`}
              >
                {t}
                {i === 1 && (
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                    Popular
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURE_GROUPS.map((g) => (
            <FeatureGroupRows key={g.group} group={g} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeatureGroupRows({ group: g }: { group: (typeof FEATURE_GROUPS)[number] }) {
  return (
    <>
      <tr className="bg-muted/30">
        <td
          colSpan={4}
          className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {g.group}
        </td>
      </tr>
      {g.rows.map((r) => (
        <tr key={r.label} className="border-t border-border">
          <td className="px-4 py-3 text-foreground">{r.label}</td>
          {r.values.map((v, i) => (
            <td key={i} className={`px-4 py-3 text-center ${i === 1 ? "bg-primary/5" : ""}`}>
              <CellView value={v} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
