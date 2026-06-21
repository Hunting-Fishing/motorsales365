import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  Clock,
  CreditCard,
  Smartphone,
  Landmark,
  Wallet,
  Banknote,
  QrCode,
  ShoppingBag,
  Store,
  ArrowLeftRight,
  Car,
} from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Payments — 365 MotorSales Philippines" },
      {
        name: "description",
        content:
          "Pay listing fees, boosts, and subscriptions with GCash, Maya, GrabPay, cards, and bank transfer. Track which methods are live.",
      },
    ],
  }),
  component: PaymentsPage,
});

type Status = "live" | "soon" | "planned";

type Method = {
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  status: Status;
  provider?: string;
};

const METHODS: { group: string; items: Method[] }[] = [
  {
    group: "Cards",
    items: [
      {
        name: "Visa / Mastercard",
        desc: "Credit and debit cards, local and international. 3D Secure supported.",
        icon: CreditCard,
        status: "planned",
        provider: "Stripe",
      },
      {
        name: "JCB / AMEX",
        desc: "Additional card networks accepted at checkout.",
        icon: CreditCard,
        status: "planned",
        provider: "Stripe",
      },
    ],
  },
  {
    group: "E-wallets (Philippines)",
    items: [
      {
        name: "GCash (direct to our wallet)",
        desc: "Send straight to our GCash 09696063830 (365 MotorSales) and upload your receipt — funds land in our wallet instantly. We confirm within 1 business day.",
        icon: Smartphone,
        status: "live",
        provider: "Direct GCash",
      },
      {
        name: "GCash (via Stripe)",
        desc: "Pay GCash from inside the Stripe card sheet — funds settle to our bank in 2–3 days. Pick GCash at checkout.",
        icon: Smartphone,
        status: "live",
        provider: "Stripe",
      },
      {
        name: "GrabPay",
        desc: "Pay using your GrabPay balance.",
        icon: Wallet,
        status: "live",
        provider: "Stripe",
      },
      {
        name: "Maya",
        desc: "Pay with Maya wallet or Maya credit.",
        icon: Wallet,
        status: "soon",
        provider: "Stripe",
      },
      {
        name: "ShopeePay",
        desc: "Pay from your ShopeePay wallet.",
        icon: Wallet,
        status: "planned",
      },
    ],
  },
  {
    group: "Bank & QR",
    items: [
      {
        name: "QR Ph",
        desc: "Scan-to-pay using the national QR standard.",
        icon: QrCode,
        status: "planned",
        provider: "Stripe",
      },
      {
        name: "InstaPay / PESONet",
        desc: "Direct bank transfer from any PH bank.",
        icon: ArrowLeftRight,
        status: "planned",
      },
      {
        name: "Online Banking (BPI, BDO, UnionBank)",
        desc: "Log in to your bank to pay.",
        icon: Landmark,
        status: "planned",
      },
    ],
  },
  {
    group: "Cash & Over-the-Counter",
    items: [
      {
        name: "7-Eleven / Cebuana / M Lhuillier",
        desc: "Pay cash at any partner outlet.",
        icon: Banknote,
        status: "planned",
      },
      {
        name: "Manual Bank Deposit",
        desc: "Deposit to our bank account and upload proof.",
        icon: Banknote,
        status: "planned",
      },
    ],
  },
];

const STATUS_META: Record<
  Status,
  { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }
> = {
  live: { label: "Live", cls: "bg-primary/15 text-primary border-primary/30", icon: Check },
  soon: {
    label: "Coming soon",
    cls: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
    icon: Clock,
  },
  planned: { label: "Roadmap", cls: "bg-muted text-muted-foreground border-border", icon: Clock },
};

function MethodCard({ m }: { m: Method }) {
  const meta = STATUS_META[m.status];
  const Icon = m.icon;
  const StatusIcon = meta.icon;
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-secondary p-1.5">
            <Icon className="h-4 w-4" />
          </div>
          <div className="font-display text-sm font-semibold leading-tight">{m.name}</div>
        </div>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${meta.cls}`}>
          <StatusIcon className="mr-0.5 h-2.5 w-2.5" />
          {meta.label}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground leading-snug">{m.desc}</p>
      {m.provider && <p className="mt-1 text-[10px] text-muted-foreground">via {m.provider}</p>}
    </div>
  );
}

function PaymentsPage() {
  const all = METHODS.flatMap((g) => g.items);
  const live = all.filter((m) => m.status === "live").length;
  const soon = all.filter((m) => m.status === "soon").length;
  const planned = all.filter((m) => m.status === "planned");

  // Visible groups only show live + soon methods. Planned items get their own
  // "Roadmap" expander so the main page reads as a shipped product.
  const visibleGroups = METHODS.map((g) => ({
    ...g,
    items: g.items.filter((m) => m.status !== "planned"),
  })).filter((g) => g.items.length > 0);

  return (
    <SiteLayout>
      <section className="bg-secondary/40 py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Payments</h1>
          <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
            Pay listing fees, boosts, and subscriptions on 365 MotorSales using cards and Philippine
            e-wallets. All payments are processed securely by Stripe.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Badge variant="outline" className={STATUS_META.live.cls}>
              {live} live
            </Badge>
            {soon > 0 && (
              <Badge variant="outline" className={STATUS_META.soon.cls}>
                {soon} coming soon
              </Badge>
            )}
            {planned.length > 0 && (
              <Badge variant="outline" className={STATUS_META.planned.cls}>
                {planned.length} on roadmap
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* GCash direct-to-wallet hero — fastest path, funds land in our GCash instantly. */}
      <section className="container mx-auto px-4 pt-8">
        <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-primary/15 p-3">
                <Smartphone className="h-7 w-7 text-primary" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl font-bold sm:text-2xl">
                    Pay direct to our GCash
                  </h2>
                  <Badge className="bg-primary text-primary-foreground">Recommended</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fastest path — funds land in our GCash wallet instantly. Send to:
                </p>
                <div className="mt-2 text-base">
                  <span className="font-semibold">365 MotorSales</span> ·{" "}
                  <span className="font-mono font-semibold tracking-tight">09696063830</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <Button asChild size="lg">
                <Link to="/help/pay-with-gcash">How to pay with GCash</Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Or pick GCash inside any checkout below
              </p>
            </div>
          </div>
        </div>
      </section>


      <section className="container mx-auto px-4 py-12 space-y-10">
        {visibleGroups.map((group) => (
          <div key={group.group}>
            <h2 className="mb-4 font-display text-xl font-semibold">{group.group}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((m) => (
                <MethodCard key={m.name} m={m} />
              ))}
            </div>
          </div>
        ))}

        {planned.length > 0 && (
          <Accordion type="single" collapsible className="rounded-xl border border-border bg-card">
            <AccordionItem value="roadmap" className="border-b-0">
              <AccordionTrigger className="px-5 py-4 hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-display font-semibold">
                    On the roadmap ({planned.length})
                  </span>
                  <span className="hidden text-sm text-muted-foreground sm:inline">
                    — payment rails we plan to add next
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {planned.map((m) => (
                    <MethodCard key={m.name} m={m} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <h3 className="font-display text-lg font-semibold">Ready to upgrade?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            See plans and pricing, or post a free listing to get started.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/pricing">See pricing</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/sell">Post a free listing</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/contact">Contact support</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
