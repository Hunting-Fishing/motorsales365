import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Mail,
  Phone,
  IdCard,
  FileCheck2,
  Crown,
  AlertTriangle,
  Flag,
  MapPin,
  Wallet,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/verified")({
  head: () => ({
    meta: [
      { title: "365 Verified — Trust levels & buyer safety | 365 MotorSales" },
      {
        name: "description",
        content:
          "What '365 Verified' means: email, phone, ID, document, and Premium Passport verification levels — plus the buyer safety tools 365 MotorSales gives every Filipino buyer.",
      },
      { property: "og:title", content: "365 Verified — Trust levels & buyer safety" },
      {
        property: "og:description",
        content:
          "Five verification levels plus scam reporting, safe meetup, and document checks for every PH vehicle deal.",
      },
      { property: "og:url", content: "https://www.365motorsales.com/verified" },
    ],
    links: [{ rel: "canonical", href: "https://www.365motorsales.com/verified" }],
  }),
  component: VerifiedPage,
});

const LEVELS = [
  {
    icon: Mail,
    label: "Email verified",
    color: "bg-blue-500/10 text-blue-600",
    desc: "Seller confirmed access to the email on file. Required to post any listing.",
  },
  {
    icon: Phone,
    label: "Phone verified",
    color: "bg-emerald-500/10 text-emerald-600",
    desc: "PH mobile number confirmed by SMS code. Required to receive buyer messages.",
  },
  {
    icon: IdCard,
    label: "ID verified",
    color: "bg-violet-500/10 text-violet-600",
    desc: "Government-issued ID checked against the seller profile by our trust team.",
  },
  {
    icon: FileCheck2,
    label: "Document verified",
    color: "bg-amber-500/10 text-amber-700",
    desc: "OR/CR and ownership documents checked for this specific vehicle. Adds a 'Documents checked' badge to the listing.",
  },
  {
    icon: Crown,
    label: "Premium Passport",
    color: "bg-yellow-500/15 text-yellow-700",
    desc: "Paid yearly upgrade unlocking extended service history, gold passport badge, and priority record retention. See /passport-premium.",
  },
];

const SAFETY_TOOLS = [
  {
    icon: Flag,
    title: "Report this listing",
    body: "Every listing has a Report button. Reports go straight to our trust team and we act within 24 hours on confirmed scams.",
    to: "/report" as const,
  },
  {
    icon: FileCheck2,
    title: "Request an OR/CR check",
    body: "Ask the seller to submit OR/CR documents to 365 for verification. Once approved, the listing gets the Documents Checked badge.",
    to: "/passport.$slug" as const,
  },
  {
    icon: MapPin,
    title: "Safe meetup guide",
    body: "Meet at a Pasalo-friendly LTO office, bank parking, or a 365-partner shop. Never hand over cash before chassis/engine/plate match the CR.",
  },
  {
    icon: Search,
    title: "Scam checklist",
    body: "Watch for: price far below market, refusal to show OR/CR, 'shipping company' middlemen, GCash-only deposits, urgent overseas owner.",
  },
  {
    icon: Wallet,
    title: "Never pay before documents",
    body: "Reservation fees are fine. Full payment only after OR/CR matches the unit and a deed of sale is signed in person.",
  },
];

function VerifiedPage() {
  return (
    <SiteLayout>
      <section className="border-b bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
          <Badge className="mb-3" variant="secondary">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Trust system
          </Badge>
          <h1 className="font-display text-3xl font-bold sm:text-5xl">
            What "365 Verified" really means
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Trust is the product. Every badge on 365 MotorSales is earned by a specific check — not
            a logo a seller can paste on their photo. Here is exactly what each level means and the
            buyer-safety tools we give you on every deal.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-4xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold">Verification levels</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sellers earn these badges in order. Higher levels appear on the listing card and on the
          seller profile.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {LEVELS.map((l) => (
            <Card key={l.label}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${l.color}`}
                  >
                    <l.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{l.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">{l.desc}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mx-auto max-w-4xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold">Buyer safety tools</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Use these on every transaction — even with a fully verified seller.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {SAFETY_TOOLS.map((t) => {
            const inner = (
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <t.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{t.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">{t.body}</CardContent>
              </Card>
            );
            return t.to ? (
              <Link key={t.title} to={t.to} className="block">
                {inner}
              </Link>
            ) : (
              <div key={t.title}>{inner}</div>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto max-w-4xl px-4 pb-16">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">
                365 is a marketplace, not a broker or escrow.
              </p>
              <p className="mt-1 text-muted-foreground">
                We verify documents and identity but we do not hold money, transport vehicles, or
                guarantee any transaction. Always inspect the unit in person, match chassis/engine
                numbers against the CR, and sign a deed of sale before paying in full. See our{" "}
                <Link to="/guidelines" className="underline">
                  Community Guidelines
                </Link>{" "}
                and{" "}
                <Link to="/terms" className="underline">
                  Terms
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
