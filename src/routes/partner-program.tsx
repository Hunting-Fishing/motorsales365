import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Share2,
  Coins,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

const TITLE = "365 Partner Program — Earn referral commissions";
const DESCRIPTION =
  "Promote 365 Motor Sales with your own QR code or referral link. Earn commissions on real, verified conversions. Independent partners only — no employment, no MLM, no downline.";

export const Route = createFileRoute("/partner-program")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PartnerProgramPage,
});

function copy(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success("Copied"));
}

function PartnerProgramPage() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto px-4 py-14 md:py-20">
          <Badge variant="secondary" className="mb-4">Independent partners · Philippines</Badge>
          <h1 className="font-display text-4xl font-bold md:text-5xl">365 Partner Program</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Earn referral commissions by promoting 365 Motor Sales through your own QR code,
            referral link, or content. Commission-only. No quotas, no schedule, no downline.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/partner-program/apply">Apply to become a Partner</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/partner-program/terms">Read the Partner Terms</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            This is a referral program for independent partners — not an employment offer.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold">How it works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { icon: QrCode, title: "Get your QR & link", body: "Once approved you receive a unique QR code and referral link tied to your account." },
            { icon: Share2, title: "Share it your way", body: "Post it, print it, wear it on optional swag. You choose when, where, and how — no scripts, no hours." },
            { icon: Coins, title: "Earn on real conversions", body: "When your referral becomes a paying seller, business, advertiser, or shop buyer, you earn commission." },
          ].map(({ icon: Icon, title, body }) => (
            <Card key={title} className="p-5">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Qualifying events */}
      <section className="border-t border-border bg-secondary/30">
        <div className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold">What you can earn on</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Commissions clear after our refund/chargeback window. Rates are set per program and shown in your dashboard.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Paid seller subscription",
              "Paid boost / promoted listing",
              "Verified business signup",
              "Advertiser or sponsor purchase",
              "Shop purchase (where enabled)",
              "Qualified premium account upgrade",
            ].map((label) => (
              <div key={label} className="flex items-center gap-2 rounded-md border border-border bg-card p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" /> {label}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Partners may earn commissions when qualified users sign up or purchase — earnings vary and are not guaranteed.
          </p>
        </div>
      </section>

      {/* Allowed / Not allowed */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold">What partners can and can't do</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Allowed</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {[
                "Share your unique QR / referral link online or in person",
                "Wear optional 365 Partner shirts, stickers, decals",
                "Create honest content about the platform",
                "Answer questions and point people to 365 for signup",
              ].map((l) => <li key={l}>• {l}</li>)}
            </ul>
          </Card>
          <Card className="p-5 border-destructive/40">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <h3 className="font-semibold">Not allowed</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {[
                "Claiming to be 365 staff, agent, employee, or authorized representative",
                "Collecting cash or payments from customers",
                "Guaranteeing income or making MLM-style claims",
                "Recruiting a 'downline' — no multi-tier commissions",
                "Uploading customer IDs, phones, or payment info on their behalf",
                "Misleading, spammy, or illegal promotions",
              ].map((l) => <li key={l}>• {l}</li>)}
            </ul>
          </Card>
        </div>
      </section>

      {/* Swag rules */}
      <section className="border-t border-border bg-secondary/30">
        <div className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold">Optional swag & branding</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Shirts, stickers, and decals are optional promotional materials — never a uniform.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <p className="text-xs font-medium text-primary">USE THIS WORDING</p>
              <p className="mt-2 font-semibold">365 Motor Sales Partner</p>
              <p className="text-sm text-muted-foreground">Scan my QR to list, sell, or promote your vehicle.</p>
            </Card>
            <Card className="p-5 border-destructive/40">
              <p className="text-xs font-medium text-destructive">NEVER USE</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• "365 Motor Sales Staff"</li>
                <li>• "Official Sales Agent"</li>
                <li>• "Employee" or "Authorized Representative"</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Disclosure snippets */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold">Required disclosure</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          When posting about 365 where you may earn commission, include one of these. Copy and paste.
        </p>
        <div className="mt-6 space-y-3">
          {[
            "I may earn a commission if you sign up through my 365 Motor Sales link.",
            "#365MotorSalesPartner #Affiliate #PaidPartner #CommissionLink",
          ].map((t) => (
            <div key={t} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
              <code className="text-sm">{t}</code>
              <Button size="sm" variant="ghost" onClick={() => copy(t)}>
                <Copy className="mr-1 h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Data privacy */}
      <section className="border-t border-border bg-secondary/30">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-6 w-6 text-primary" />
            <div>
              <h2 className="text-2xl font-bold">Data privacy</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Every QR code routes to a 365 landing page where our privacy notice is shown. Partners
                never handle customer IDs, phone numbers, documents, or payment details. Your dashboard
                only shows aggregated metrics and commission line items — no buyer PII.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Caution / no MLM */}
      <section className="container mx-auto px-4 py-12">
        <Card className="border-amber-500/50 bg-amber-50/50 p-5 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div className="text-sm">
              <p className="font-semibold">No downline. No pyramid. No guaranteed income.</p>
              <p className="mt-1 text-muted-foreground">
                Commissions come only from real customer activity (paid signups, purchases, ad buys).
                Recruiting other partners does not earn ongoing commission. Earnings vary and are never guaranteed.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border">
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold">Ready to partner with 365?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Applications are reviewed within a few business days.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/partner-program/apply">Apply now</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/partner-program/terms">Partner Terms</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
