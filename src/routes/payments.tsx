import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Clock, Landmark, Store, ArrowLeftRight } from "lucide-react";
import {
  SiVisa,
  SiMastercard,
  SiJcb,
  SiAmericanexpress,
  SiGrab,
  SiShopee,
  SiStripe,
} from "react-icons/si";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import gcashLogo from "@/assets/payments/gcash.webp.asset.json";
import stripeLogo from "@/assets/payments/stripe.jpg.asset.json";

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

type IconCmp = React.ComponentType<{ className?: string }>;

type Method = {
  name: string;
  desc: string;
  icon: IconCmp;
  /** Tailwind text color class for the brand mark, e.g. "text-[#1A1F71]". */
  iconColor?: string;
  status: Status;
  provider?: string;
  /** Full brand logo image (used for hero/live tiles). */
  imageSrc?: string;
  /** Optional caption shown beneath a hero brand tile. */
  tag?: string;
};

// Small lettered brand badges for marks not available as SVG icons.
// Use explicit pixel-ish sizes (not em/h-full) so they render reliably inside
// any container — em-based sizes collapse when the parent has no font-size,
// and h-full collapses inside an inline-flex parent with no explicit height.
const makeLetterBrand = (letter: string, bg: string): IconCmp =>
  function LetterBrand({ className }: { className?: string }) {
    return (
      <span
        className={`inline-flex h-full w-full items-center justify-center rounded-sm text-[10px] font-bold leading-none text-white ${bg} ${className ?? ""}`}
        aria-hidden
      >
        {letter}
      </span>
    );
  };

const GCashMark = makeLetterBrand("G", "bg-[#007DFE]");
const MayaMark = makeLetterBrand("M", "bg-[#00C566]");
const QrPhMark: IconCmp = ({ className }) => (
  <span
    className={`inline-flex h-full w-full items-center justify-center rounded-sm bg-[#E03A3E] text-[8px] font-bold leading-none tracking-tight text-white ${className ?? ""}`}
    aria-hidden
  >
    QR
  </span>
);

const CardsMark: IconCmp = ({ className }) => (
  <span className={`inline-flex items-center gap-0.5 ${className ?? ""}`}>
    <SiVisa className="h-2.5 w-auto text-[#1A1F71]" />
    <SiMastercard className="h-2.5 w-auto text-[#EB001B]" />
  </span>
);

const JcbAmexMark: IconCmp = ({ className }) => (
  <span className={`inline-flex items-center gap-0.5 ${className ?? ""}`}>
    <SiJcb className="h-2.5 w-auto text-[#0E4C96]" />
    <SiAmericanexpress className="h-2.5 w-auto text-[#2E77BB]" />
  </span>
);

const METHODS: { group: string; items: Method[] }[] = [
  {
    group: "Cards",
    items: [
      {
        name: "Visa / Mastercard",
        desc: "Credit and debit cards, local and international. 3D Secure supported.",
        icon: CardsMark,
        status: "planned",
        provider: "Stripe",
      },
      {
        name: "JCB / AMEX",
        desc: "Additional card networks accepted at checkout.",
        icon: JcbAmexMark,
        status: "planned",
        provider: "Stripe",
      },
    ],
  },
  {
    group: "E-wallets (Philippines)",
    items: [
      {
        name: "GCash",
        desc: "Send to 365 MotorSales · 09696063830 and upload your receipt.",
        icon: GCashMark,
        status: "live",
        imageSrc: gcashLogo.url,
        tag: "Direct to our wallet · 09696063830",
      },
      {
        name: "GrabPay",
        desc: "Pay using your GrabPay balance.",
        icon: SiGrab,
        iconColor: "text-[#00B14F]",
        status: "planned",
        provider: "Stripe",
      },
      {
        name: "Maya",
        desc: "Pay with Maya wallet or Maya credit.",
        icon: MayaMark,
        status: "planned",
        provider: "Stripe",
      },
      {
        name: "ShopeePay",
        desc: "Pay from your ShopeePay wallet.",
        icon: SiShopee,
        iconColor: "text-[#EE4D2D]",
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
        icon: QrPhMark,
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
        icon: Store,
        status: "planned",
      },
      {
        name: "Manual Bank Deposit",
        desc: "Deposit to our bank account and upload proof.",
        icon: Landmark,
        status: "planned",
      },
    ],
  },
  {
    group: "Cards & international",
    items: [
      {
        name: "Stripe",
        desc: "Pay with Visa, Mastercard, JCB, or AMEX. 3D Secure supported.",
        icon: SiStripe,
        iconColor: "text-[#635BFF]",
        status: "live",
        imageSrc: stripeLogo.url,
        tag: "Cards · 3D Secure",
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

  // Live/featured methods: render the full brand image with no card chrome,
  // just a small caption underneath.
  if (m.imageSrc) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="w-full overflow-hidden rounded-xl">
          <img
            src={m.imageSrc}
            alt={`${m.name} logo`}
            className="block aspect-[16/9] w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="font-display text-base font-semibold">{m.name}</span>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${meta.cls}`}>
            <StatusIcon className="mr-0.5 h-2.5 w-2.5" />
            {meta.label}
          </Badge>
        </div>
        {m.tag && (
          <p className="mt-1 text-xs text-muted-foreground">{m.tag}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary">
            <Icon className={`h-4 w-4 ${m.iconColor ?? ""}`} />
          </div>
          <div className="font-display text-sm font-semibold leading-tight">{m.name}</div>
        </div>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${meta.cls}`}>
          <StatusIcon className="mr-0.5 h-2.5 w-2.5" />
          {meta.label}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground leading-snug">{m.desc}</p>
      {m.provider && (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
          via {m.provider === "Stripe" ? <SiStripe className="h-2.5 w-auto text-[#635BFF]" /> : null}
          {m.provider !== "Stripe" && m.provider}
        </p>
      )}
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
