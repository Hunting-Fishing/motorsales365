import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Handshake,
  Boxes,
  Wrench,
  Store,
  Network,
  ShieldCheck,
  Megaphone,
  ArrowRight,
  BadgeCheck,
} from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const TITLE = "365 Partner Network — Join as a Parts Store, Shop or Vendor";
const DESCRIPTION =
  "Vendors, parts stores, and repair shops: join the 365 MotorSales partner network. Get a hosted storefront, network stock visibility, buyer inquiries, and affiliate earnings.";
const URL = "https://www.365motorsales.com/partners";

export const Route = createFileRoute("/partners/")({
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
  component: PartnersHub,
});

const TRACKS = [
  {
    icon: Boxes,
    title: "Parts store / vendor",
    blurb:
      "Wholesalers, retailers, surplus and salvage yards. List stock, plug in a catalog feed, and receive network inquiries from shops and buyers nationwide.",
    to: "/partners/parts" as const,
    cta: "Apply as a parts vendor",
  },
  {
    icon: Wrench,
    title: "Repair shop / service centre",
    blurb:
      "Join as a service partner: free Shop Manager tier, inventory + invoicing, and a hosted microsite that ranks for your town.",
    to: "/shop-manager" as const,
    cta: "Open Shop Manager",
  },
  {
    icon: Store,
    title: "Franchise & co-branded partner",
    blurb:
      "Keep your own brand as a 365 Partner, or go co-branded as a 365 Franchise outlet with network pricing and referral flow.",
    to: "/franchise" as const,
    cta: "See franchise tiers",
  },
  {
    icon: Megaphone,
    title: "Promoter (individual)",
    blurb:
      "Not a business? Earn per verified sign-up as an approved 365 promoter with your own QR code and referral link.",
    to: "/partner-program" as const,
    cta: "Apply as a promoter",
  },
];

const BENEFITS = [
  {
    icon: Network,
    title: "One network, shared stock",
    body: "Approved partners can expose selected inventory to the 365 network so shops and buyers see real availability across every partner store.",
  },
  {
    icon: BadgeCheck,
    title: "Hosted storefront + SEO",
    body: "Every approved partner gets a branded page at 365motorsales.com/parts/partners/store/your-slug, with optional custom domain.",
  },
  {
    icon: Handshake,
    title: "Affiliate earnings",
    body: "Earn on outbound traffic, referred sign-ups, and network fulfilment — tracked in your dashboard, paid on the published schedule.",
  },
  {
    icon: ShieldCheck,
    title: "Verified only",
    body: "Business permit, BIR registration, DTI/SEC, and a valid signatory ID are reviewed before anything goes live. No unverified sellers.",
  },
];

const STEPS = [
  "Create a free 365 account (or sign in).",
  "Pick your track and submit the partner application with your documents.",
  "We review and verify — usually within a few business days.",
  "On approval your storefront publishes and network + affiliate tools switch on.",
];

function PartnersHub() {
  return (
    <SiteLayout>
      <section className="border-b border-border bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto max-w-5xl px-4 py-12">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Handshake className="h-3.5 w-3.5" /> 365 Partner Network
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
            Network your parts store or shop with 365
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            One application connects your business to the 365 marketplace, the parts network, and the
            affiliate program — so buyers, shops, and other partners can find and order from you.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link to="/partners/parts/onboarding">
                Start a partner application <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/partners/network">Browse the network</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Early release — the platform is in an active testing phase. Program terms, commissions,
            and tiers may change while we roll out.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 py-10">
        <h2 className="font-display text-2xl font-bold">Choose your track</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {TRACKS.map((t) => (
            <Card key={t.title} className="flex flex-col p-5">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <t.icon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold">{t.title}</h3>
              </div>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{t.blurb}</p>
              <Button asChild variant="outline" size="sm" className="mt-4 self-start">
                <Link to={t.to}>{t.cta}</Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="container mx-auto max-w-5xl px-4 py-10">
          <h2 className="font-display text-2xl font-bold">What partners get</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <b.icon className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">{b.title}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 py-10">
        <h2 className="font-display text-2xl font-bold">How joining works</h2>
        <ol className="mt-5 space-y-3">
          {STEPS.map((s, i) => (
            <li key={s} className="flex gap-3 rounded-lg border border-border bg-card p-4">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="text-sm">{s}</span>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/partners/parts/onboarding">Apply now</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/dashboard/partner-network">Track my application</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
