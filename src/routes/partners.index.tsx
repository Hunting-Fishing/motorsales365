import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Building2,
  Cable,
  Check,
  CircleDot,
  ClipboardList,
  FileSpreadsheet,
  Handshake,
  MapPin,
  Network,
  PackageCheck,
  Radio,
  Search,
  ShieldCheck,
  Store,
  Wrench,
} from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const TITLE = "365 MotorSales Associate Network — Parts Stores & Repair Shops";
const DESCRIPTION =
  "Join the 365 MotorSales Associate Network. Connect parts inventory, reach nearby repair shops, and run your business with Shop Manager tools built for the Philippines.";
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
  component: AssociateNetworkPage,
});

const WORKFLOW = [
  {
    icon: Search,
    title: "Identify the vehicle",
    body: "Start with year, make, model, engine, or part number. VIN and Philippine chassis-number catalog matching is the next catalog layer being built.",
  },
  {
    icon: Boxes,
    title: "Check connected inventory",
    body: "See your own available stock first, then search inventory that approved Associate locations choose to expose to the network.",
  },
  {
    icon: MapPin,
    title: "Find the best nearby source",
    body: "Compare store, location, available quantity, listed price, and compatibility without exposing another business's costs or customer data.",
  },
  {
    icon: Radio,
    title: "Request or reserve",
    body: "Send the supplying store a structured inquiry or place a short stock hold while price, quantity, pickup, or delivery is confirmed.",
  },
  {
    icon: ClipboardList,
    title: "Move it into the repair",
    body: "Bring the part into a Shop Manager quote, purchase order, work order, and customer invoice instead of entering the same information repeatedly.",
  },
  {
    icon: PackageCheck,
    title: "Receive, sell, and track",
    body: "Update stock as parts are received and issued. Orders, transfers, returns, warranties, and installed-part records will build on this same inventory foundation.",
  },
];

const CAPABILITIES = [
  {
    status: "Available now",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    title: "Business pages and Shop Manager",
    body: "Create a discoverable business presence and use inventory, quotes, work orders, invoices, purchase orders, and vendor tools.",
  },
  {
    status: "Internal test",
    tone: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    title: "Opt-in network stock search",
    body: "Approved inventory can appear in the live network search with year, make, model, category, brand, and province filters.",
  },
  {
    status: "Early access",
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    title: "Supplier feeds and storefronts",
    body: "Verified suppliers can be onboarded for hosted storefronts, catalog feeds, buyer inquiries, and network exposure review.",
  },
  {
    status: "Building next",
    tone: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    title: "VIN/chassis catalog and ordering",
    body: "Canonical part numbers, supersessions, stronger fitment evidence, shop-to-store ordering, transfers, returns, and warranty workflows.",
  },
];

const CONNECTIONS = [
  {
    icon: FileSpreadsheet,
    title: "Spreadsheet or catalog feed",
    body: "Begin with the inventory format you already maintain. We map the fields before publishing anything to the network.",
  },
  {
    icon: Cable,
    title: "API integration",
    body: "Larger distributors can connect product, price, and availability data so updates do not depend on duplicate manual entry.",
  },
  {
    icon: Building2,
    title: "Shop Manager inventory",
    body: "Smaller stores and repair shops can manage stock directly inside 365 and selectively request network exposure.",
  },
];

function AssociateNetworkPage() {
  return (
    <SiteLayout>
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/15 via-background to-background">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="container relative mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <Badge variant="secondary" className="mb-4">
            <Handshake className="mr-1 h-3.5 w-3.5" /> 365 MotorSales Associate Network
          </Badge>
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr,0.9fr]">
            <div>
              <h1 className="max-w-4xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
                Keep your business. <span className="text-primary">Gain the network.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
                We are connecting independent parts stores, distributors, and repair shops through
                one inventory and service network—so a shop looking for a part can find the nearest
                Associate that has it, and a supplier can reach more real repair orders.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/partners/parts/onboarding">
                    Join as a parts business <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/franchise/apply" search={{ tier: "partner" }}>
                    Join as a repair shop
                  </Link>
                </Button>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {[
                  "Keep your own name and customers",
                  "Choose which stock is shared",
                  "One system for parts and repairs",
                ].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> {item}
                  </span>
                ))}
              </div>
            </div>

            <Card className="overflow-hidden border-primary/25 bg-card/95 shadow-lg">
              <div className="border-b border-border bg-muted/40 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  A connected parts request
                </p>
                <p className="mt-1 font-display text-xl font-bold">Brake pads · 2019 Toyota Vios</p>
              </div>
              <div className="space-y-3 p-5">
                {[
                  ["Your inventory", "Out of stock", "text-muted-foreground"],
                  ["Associate store · 3.2 km", "4 available", "text-emerald-600"],
                  ["Associate distributor · 18 km", "12 available", "text-emerald-600"],
                ].map(([name, stock, tone]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Store className="h-4 w-4" />
                      </span>
                      <span className="truncate text-sm font-medium">{name}</span>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold ${tone}`}>{stock}</span>
                  </div>
                ))}
                <Button asChild className="w-full">
                  <Link to="/parts/network">Open live network stock</Link>
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  Example workflow. Availability comes only from approved, opted-in inventory.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-14">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Built for both sides
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold">
            Parts suppliers and repair shops win together
          </h2>
          <p className="mt-3 text-muted-foreground">
            365 Associates remain independent. The network adds reach, software, and a faster way to
            locate parts; it does not take ownership of your shop or expose private business data.
          </p>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <Card className="flex flex-col p-6">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Boxes className="h-6 w-6" />
            </span>
            <h3 className="mt-4 font-display text-2xl font-bold">
              Parts stores, distributors, and suppliers
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Put selected inventory in front of nearby shops, accept structured requests, publish a
              verified storefront, and connect by Shop Manager, spreadsheet, feed, or API.
            </p>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {[
                "Opt-in stock visibility by location",
                "Catalog, SKU, brand, price, and quantity support",
                "Requests from shops that already need the part",
                "Future reservations, transfers, fulfilment, and returns",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {item}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-6 self-start">
              <Link to="/partners/parts/onboarding">Start supplier onboarding</Link>
            </Button>
          </Card>

          <Card className="flex flex-col p-6">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Wrench className="h-6 w-6" />
            </span>
            <h3 className="mt-4 font-display text-2xl font-bold">
              Repair shops and service centres
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Run the repair from one workspace and search the Associate network when your own
              inventory is short—without phoning every store in the province.
            </p>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {[
                "Customers, vehicles, quotes, work orders, and invoices",
                "Inventory, vendors, purchase orders, and stock alerts",
                "Nearby network-stock search and supplier inquiries",
                "Future direct part lookup from the work-order screen",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/franchise/apply" search={{ tier: "partner" }}>
                  Apply as a repair shop
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/shop-manager">See Shop Manager</Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="container mx-auto max-w-6xl px-4 py-14">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              The 365 parts loop
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold">From vehicle to installed part</h2>
            <p className="mt-3 text-muted-foreground">
              Our own parts-network workflow is being built directly on 365 inventory and Shop
              Manager. Each stage can grow without forcing shops into a separate ordering app.
            </p>
          </div>
          <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {WORKFLOW.map((step, index) => (
              <li key={step.title} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">0{index + 1}</span>
                </div>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 lg:grid-cols-[0.8fr,1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Honest rollout
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold">
              What is ready—and what comes next
            </h2>
            <p className="mt-3 text-muted-foreground">
              We will onboard early Associates against real capabilities, not promises. New ordering
              and catalog functions move from internal testing to pilot before broad release.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/parts/network">Test the network search</Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {CAPABILITIES.map((item) => (
              <Card key={item.title} className="p-5">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.tone}`}
                >
                  {item.status}
                </span>
                <h3 className="mt-3 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="container mx-auto max-w-6xl px-4 py-14">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Connect at your pace
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold">
              No expensive integration required to start
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {CONNECTIONS.map((item) => (
              <Card key={item.title} className="p-5">
                <item.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-14">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
          <div className="grid items-center gap-6 md:grid-cols-[1fr,auto]">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-semibold">Verified businesses only</span>
              </div>
              <h2 className="mt-2 font-display text-3xl font-bold">
                Become a founding 365 Associate
              </h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Start with one location and the tools you need. We review the business before
                publishing network inventory or a verified storefront. Early-release pricing,
                commissions, and commercial terms are confirmed during onboarding; earnings are not
                guaranteed.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild size="lg">
                <Link to="/partners/parts/onboarding">Parts business application</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/franchise/apply" search={{ tier: "partner" }}>
                  Repair shop application
                </Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link to="/dashboard/partner-network">Track an application</Link>
              </Button>
            </div>
          </div>
        </Card>

        <div className="mt-6 grid gap-4 text-sm md:grid-cols-3">
          <div className="flex items-start gap-3 rounded-lg border border-border p-4">
            <Network className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              <strong>Associate Network:</strong> verified parts and repair businesses using 365
              software and network tools.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-border p-4">
            <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              <strong>Promoter Program:</strong> a separate referral program for approved
              individuals sharing a QR or link.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-border p-4">
            <Store className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              <strong>Franchise:</strong> an optional deeper brand relationship—not required to be
              an independent Associate.
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
