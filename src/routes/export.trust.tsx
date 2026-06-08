import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  FileCheck2,
  Eye,
  AlertTriangle,
  Phone,
  Mail,
  Globe,
  Users,
  ClipboardCheck,
  BadgeCheck,
  Search,
  MessageCircle,
} from "lucide-react";

export const Route = createFileRoute("/export/trust")({
  head: () => ({
    meta: [
      { title: "Trust & Verification — 365 Export Connect" },
      {
        name: "description",
        content:
          "How 365 Export Connect screens independent export partners and how buyers can confirm partner legitimacy before engaging.",
      },
      {
        property: "og:title",
        content: "Trust & Verification — 365 Export Connect",
      },
      {
        property: "og:description",
        content:
          "Learn how we screen brokers, inspectors, and shipping partners — and the steps you can take to verify them independently.",
      },
    ],
  }),
  component: ExportTrustPage,
});

function ExportTrustPage() {
  return (
    <SiteLayout>
      <div className="border-b bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto px-4 py-14 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-3">365 Export Connect</Badge>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
              Trust & Verification
            </h1>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              We introduce you to independent export partners — brokers,
              inspectors, and shipping lines. Here is how we screen them, what
              badges mean, and how you can confirm legitimacy before you engage.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
        {/* Role disclaimer */}
        <Card className="mb-10 border-primary/20 bg-primary/5">
          <CardContent className="flex gap-3 p-5 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <strong className="text-foreground">Our role.</strong> 365
              MotorSales is the listing and introduction venue. We are not the
              broker, escrow agent, shipper, exporter of record, or customs
              agent. Partners are independent businesses you choose to engage
              directly. All contracts, payments, inspections, and shipping
              arrangements are between you and the partner.
            </div>
          </CardContent>
        </Card>

        {/* How partners are screened */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold">
            How partners are screened
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Before an export partner can receive inquiries through 365 Export
            Connect, they pass a multi-step review.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              {
                Icon: FileCheck2,
                title: "Business registration check",
                desc: "We verify DTI / SEC registration, BIR Tax ID, and Mayor's Permit (or equivalent local business license).",
              },
              {
                Icon: ClipboardCheck,
                title: "Export track record",
                desc: "Partners must show prior export transactions, customs broker accreditation, or freight-forwarder credentials.",
              },
              {
                Icon: Phone,
                title: "Direct contact verification",
                desc: "We call the listed business phone and confirm the representative name, office address, and email domain.",
              },
              {
                Icon: Eye,
                title: "Ongoing monitoring",
                desc: "We periodically re-check credentials and remove partners who receive repeated complaints or lapse in licensing.",
              },
            ].map(({ Icon, title, desc }) => (
              <Card key={title}>
                <CardContent className="p-5">
                  <Icon className="mb-2 h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-sm">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Verification badges */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold">
            Partner badge meanings
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            When we introduce a partner, you may see one or more of these
            indicators.
          </p>
          <ul className="mt-6 space-y-4">
            {[
              {
                label: "Partner Verified",
                meaning:
                  "Business registration, tax ID, and contact details have been checked by 365 staff within the last 12 months.",
              },
              {
                label: "Documents Reviewed",
                meaning:
                  "Export permits, customs broker accreditation, or freight-forwarder license copies have been sighted and filed.",
              },
              {
                label: "Seller Recommended",
                meaning:
                  "At least one verified seller on 365 MotorSales has completed an export transaction with this partner and left positive feedback.",
              },
              {
                label: "PH-based Office",
                meaning:
                  "The partner maintains a physical office or registered address in the Philippines that we have confirmed.",
              },
            ].map((b) => (
              <li
                key={b.label}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
              >
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <span className="font-semibold text-sm">{b.label}</span>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {b.meaning}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* How to confirm legitimacy */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold">
            How to confirm a partner is legitimate
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Even after our screening, you should do your own due diligence
            before sending money or signing contracts.
          </p>
          <ol className="mt-6 space-y-4">
            {[
              {
                title: "Verify the business name with DTI / SEC",
                desc: "Search the DTI Business Name Registration or SEC Express System online. The legal name we provide should appear.",
              },
              {
                title: "Call the office landline during business hours",
                desc: "Independent phone confirmation beats email alone. Ask for the person named in the introduction email.",
              },
              {
                title: "Request a reference from a recent shipment",
                desc: "A legitimate broker or forwarder can provide a bill of lading number or reference from a past client (with permission).",
              },
              {
                title: "Check customs broker accreditation",
                desc: "If they claim to be a customs broker, ask for their accreditation number and verify it with the Bureau of Customs.",
              },
              {
                title: "Use traceable payment methods",
                desc: "Prefer bank transfers to a corporate account in the business name. Avoid personal mobile-wallet transfers to individuals you have never met.",
              },
              {
                title: "Request a written quote and contract",
                desc: "A professional partner provides a detailed quote (FOB, freight, insurance, documentation fees) and a simple contract before any payment.",
              },
            ].map((step, idx) => (
              <li
                key={step.title}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {idx + 1}
                </span>
                <div>
                  <span className="font-semibold text-sm">{step.title}</span>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Red flags */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold">
            Red flags to watch for
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              {
                Icon: AlertTriangle,
                title: "Requests full payment upfront",
                desc: "Legitimate partners typically ask for a deposit, with balance due on shipment or against documents.",
              },
              {
                Icon: Search,
                title: "No verifiable office address",
                desc: "Be cautious if the partner refuses to share a registered address or only communicates via personal mobile numbers.",
              },
              {
                Icon: Mail,
                title: "Generic email domains",
                desc: "A professional broker or shipper should use a company-domain email, not only free webmail.",
              },
              {
                Icon: MessageCircle,
                title: "Pressure to move off-platform quickly",
                desc: "If a partner insists on switching to private chat and avoiding written quotes, pause and verify first.",
              },
            ].map(({ Icon, title, desc }) => (
              <Card key={title}>
                <CardContent className="p-5">
                  <Icon className="mb-2 h-5 w-5 text-destructive" />
                  <h3 className="font-semibold text-sm">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* What to do if something feels wrong */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold">
            If something feels wrong
          </h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>
              Stop the transaction and contact us immediately at{" "}
              <a
                href="mailto:safety@365motorsales.com"
                className="text-primary underline"
              >
                safety@365motorsales.com
              </a>
              . Include the partner name, any emails or messages, and a brief
              summary of what happened. We investigate every report and will
              remove partners who no longer meet our standards.
            </p>
            <p>
              For urgent concerns involving large sums or suspected fraud, you
              may also file a report with the Philippine National Police
              Anti-Cybercrime Group (PNP-ACG) or the National Bureau of
              Investigation (NBI) Cybercrime Division.
            </p>
          </div>
        </section>

        {/* FAQ-ish mini-section */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold">
            Common questions
          </h2>
          <dl className="mt-6 space-y-5">
            <div>
              <dt className="font-semibold text-sm">
                Does 365 guarantee the partner will deliver?
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                No. 365 introduces you to independent partners; we do not underwrite
                their performance. We screen credentials and monitor feedback,
                but the commercial contract is directly between you and the
                partner.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-sm">
                Who holds the money during the transaction?
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                365 does not hold funds or act as escrow. Payment terms are
                negotiated directly with the partner. If you want an escrow
                arrangement, ask the partner whether they work with a licensed
                escrow or trade-finance provider.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-sm">
                Can I choose my own broker instead?
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                Absolutely. You are free to use any licensed customs broker or
                freight forwarder you prefer. The 365 introduction is optional
                and non-exclusive.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-sm">
                How often are partner credentials re-checked?
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                We review active partners at least once per year and after any
                complaint. Partners must promptly notify us of changes to their
                license, address, or contact details.
              </dd>
            </div>
          </dl>
        </section>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link to="/export">Back to Export Connect</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/terms">Read our Terms</Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
