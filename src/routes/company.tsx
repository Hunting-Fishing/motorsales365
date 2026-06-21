import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  ShieldCheck,
  Mail,
  Megaphone,
  Scale,
  FileCheck,
  AlertTriangle,
  Handshake,
  ScrollText,
  Eye,
} from "lucide-react";

const TITLE = "Company Verification — 365 MotorSales Philippines";
const DESCRIPTION =
  "Legal business identity, regulatory registrations, Data Protection Officer, support escalation, refund + takedown + complaint process, advertising & affiliate disclosure, and law-enforcement contact for 365 MotorSales Philippines.";
const URL = "https://www.365motorsales.com/company";

export const Route = createFileRoute("/company")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: CompanyPage,
});

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-border/60 py-3 last:border-0 sm:grid-cols-[220px_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function CompanyPage() {
  const lastUpdated = "June 8, 2026";

  return (
    <SiteLayout>
      <div className="bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-4xl px-4 py-12">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Legal proof</Badge>
            <Badge variant="outline">Last updated {lastUpdated}</Badge>
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Company verification
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Who we are, how we're registered, and how to reach the right team for support,
            takedowns, complaints, refunds, advertising, or law-enforcement matters. This page
            exists so buyers, sellers, partners, and regulators can verify 365 MotorSales
            Philippines is a real, contactable, accountable operator under{" "}
            <Link to="/terms" className="text-primary underline">
              Philippine e-commerce law
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl space-y-8 px-4 py-10">
        {/* Legal entity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Legal entity &amp; registrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <Row label="Legal business name" value="365 MotorSales Philippines" />
              <Row label="Trading name" value="365 MotorSales" />
              <Row
                label="Registration type"
                value={
                  <>
                    Philippine business registered under the{" "}
                    <em>Internet Transactions Act of 2023</em> (RA 11967) as an e-marketplace
                    operator. DTI / SEC / BIR documents available on request to{" "}
                    <a
                      className="text-primary underline"
                      href="mailto:legal@365motorsales.com"
                    >
                      legal@365motorsales.com
                    </a>
                    .
                  </>
                }
              />
              <Row label="Registered address" value="Metro Manila, Philippines" />
              <Row
                label="Website"
                value={
                  <a
                    className="text-primary underline"
                    href="https://www.365motorsales.com"
                  >
                    www.365motorsales.com
                  </a>
                }
              />
              <Row
                label="Customer hotline"
                value={
                  <a className="text-primary underline" href="tel:09696063830">
                    09696063830
                  </a>
                }
              />
            </dl>
            <p className="mt-4 rounded-md border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              We do not publish DTI / SEC / BIR registration numbers in plaintext on the public
              page to limit identity-spoofing risk. Verified copies of all certificates are shared
              by email with regulators, banks, payment processors, dealer applicants, and ad
              buyers on written request.
            </p>
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Who to contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <Row
                label="General support"
                value={
                  <>
                    <a className="text-primary underline" href="mailto:support@365motorsales.com">
                      support@365motorsales.com
                    </a>{" "}
                    · <Link className="text-primary underline" to="/support">Help Center</Link> ·{" "}
                    <Link className="text-primary underline" to="/contact">
                      Contact form
                    </Link>
                  </>
                }
              />
              <Row
                label="Legal &amp; compliance"
                value={
                  <a className="text-primary underline" href="mailto:legal@365motorsales.com">
                    legal@365motorsales.com
                  </a>
                }
              />
              <Row
                label="Data Protection Officer (DPO)"
                value={
                  <>
                    <a className="text-primary underline" href="mailto:privacy@365motorsales.com">
                      privacy@365motorsales.com
                    </a>{" "}
                    — for access, correction, erasure, objection, and complaints under RA 10173
                    (Data Privacy Act). See our{" "}
                    <Link className="text-primary underline" to="/privacy">
                      Privacy Policy
                    </Link>
                    .
                  </>
                }
              />
              <Row
                label="Trust &amp; safety / takedowns"
                value={
                  <>
                    <a className="text-primary underline" href="mailto:trust@365motorsales.com">
                      trust@365motorsales.com
                    </a>{" "}
                    · file a public report at{" "}
                    <Link className="text-primary underline" to="/report">
                      /report
                    </Link>
                  </>
                }
              />
              <Row
                label="Advertising / partnerships"
                value={
                  <>
                    <a
                      className="text-primary underline"
                      href="mailto:advertising@365motorsales.com"
                    >
                      advertising@365motorsales.com
                    </a>{" "}
                    · <Link className="text-primary underline" to="/advertise">Rate card</Link>
                  </>
                }
              />
              <Row
                label="Business partners (services, towing, inspection)"
                value={
                  <a
                    className="text-primary underline"
                    href="mailto:partners@365motorsales.com"
                  >
                    partners@365motorsales.com
                  </a>
                }
              />
              <Row
                label="Law enforcement / lawful disclosure"
                value={
                  <>
                    <a className="text-primary underline" href="mailto:legal@365motorsales.com">
                      legal@365motorsales.com
                    </a>{" "}
                    — please send a formal request on agency letterhead. We respond to lawful
                    process under RA 10175 (Cybercrime Prevention Act) and RA 10173 (Data Privacy
                    Act), and may require subpoena or court order for non-emergency disclosures of
                    user data.
                  </>
                }
              />
            </dl>
          </CardContent>
        </Card>

        {/* Support escalation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5 text-primary" />
              Support escalation path
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Start at the{" "}
                <Link className="text-primary underline" to="/support">
                  Help Center
                </Link>{" "}
                or submit a support ticket from{" "}
                <Link className="text-primary underline" to="/contact">
                  /contact
                </Link>
                . Standard reply target: <strong>1 business day</strong>.
              </li>
              <li>
                If you are not satisfied with the first response, reply on the same ticket and
                request <em>escalation to a supervisor</em>. A senior agent will respond within{" "}
                <strong>3 business days</strong>.
              </li>
              <li>
                Unresolved after escalation: email{" "}
                <a className="text-primary underline" href="mailto:legal@365motorsales.com">
                  legal@365motorsales.com
                </a>{" "}
                with the ticket reference for a final internal review within{" "}
                <strong>10 business days</strong>.
              </li>
              <li>
                External remedies (RA 11967): the{" "}
                <a
                  className="text-primary underline"
                  href="https://www.dti.gov.ph/konsyumer/e-commerce/"
                  target="_blank"
                  rel="noopener"
                >
                  DTI E-Commerce Bureau
                </a>{" "}
                accepts marketplace complaints, and the{" "}
                <a
                  className="text-primary underline"
                  href="https://privacy.gov.ph/complaints-assisted-by-ncc/"
                  target="_blank"
                  rel="noopener"
                >
                  National Privacy Commission
                </a>{" "}
                accepts data-privacy complaints.
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Refund process */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-primary" />
              Refund process
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              365 MotorSales is a marketplace operator. Vehicle, parts, and service transactions
              happen <strong>directly between buyer and seller</strong> off-platform, so we do not
              refund private-party sale prices. We do issue refunds for Platform fees we charge
              directly — boosts, dealer subscriptions, featured business profiles, sponsored ad
              placements, and inspection/transaction-assist add-ons — as set out in our{" "}
              <Link className="text-primary underline" to="/refund-policy">
                Refund Policy
              </Link>
              .
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Request a refund from{" "}
                <Link className="text-primary underline" to="/dashboard/billing">
                  Dashboard → Billing
                </Link>{" "}
                or by emailing{" "}
                <a className="text-primary underline" href="mailto:legal@365motorsales.com">
                  legal@365motorsales.com
                </a>{" "}
                with the receipt or payment ID.
              </li>
              <li>Reviewed within 5 business days; approved refunds return to the original payment method.</li>
              <li>
                Disputes can be escalated to your card issuer / GCash / Maya, and ultimately to
                the DTI under RA 11967 and RA 7394 (Consumer Act).
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Takedown + complaint */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              Takedown &amp; complaint process
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              We act on notices about scam listings, prohibited items, intellectual-property
              infringement, defamation, impersonation, stolen vehicles, and other unlawful content
              under RA 11967 §22 (notice-and-takedown duties of e-marketplaces).
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                File a report at{" "}
                <Link className="text-primary underline" to="/report">
                  /report
                </Link>{" "}
                or email{" "}
                <a className="text-primary underline" href="mailto:trust@365motorsales.com">
                  trust@365motorsales.com
                </a>
                . Include the listing URL, the alleged violation, and any evidence (screenshots,
                police reports, IP rights proof).
              </li>
              <li>Triaged within 1 business day. Clear violations are de-listed immediately; borderline cases get a 48-hour seller response window.</li>
              <li>
                Listing owners may appeal a takedown by replying to the notification email within
                10 days. Final decisions are made by our Trust &amp; Safety lead.
              </li>
              <li>Repeat offenders are permanently banned and, where required, reported to the DTI, NBI Cybercrime Division, or PNP-ACG.</li>
            </ol>
          </CardContent>
        </Card>

        {/* Advertising / affiliate disclosure */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Advertising &amp; affiliate disclosure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Paid placements (homepage hero, category banners, sidebar tiles, featured directory
              profiles, newsletter slots, sponsored Academy cards) are <strong>clearly labelled
              </strong> "Sponsored", "Featured", or "Ad". Editorial rankings and search results
              are not for sale. Our public rate card lives at{" "}
              <Link className="text-primary underline" to="/advertise">
                /advertise
              </Link>
              .
            </p>
            <p>
              Some links in our <Link className="text-primary underline" to="/shop">
                Shop
              </Link>{" "}
              and{" "}
              <Link className="text-primary underline" to="/learn">
                Academy
              </Link>{" "}
              are affiliate links — when you buy through them, 365 MotorSales may earn a small
              commission at no extra cost to you. Full details:{" "}
              <Link className="text-primary underline" to="/affiliate-disclosure">
                /affiliate-disclosure
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        {/* Trust commitments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Trust commitments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="grid gap-2 sm:grid-cols-2">
              <li className="flex items-start gap-2">
                <Eye className="mt-0.5 h-4 w-4 text-primary" />
                We do not sell user contact data to advertisers.
              </li>
              <li className="flex items-start gap-2">
                <Scale className="mt-0.5 h-4 w-4 text-primary" />
                We do not act as broker, escrow, shipper, financier, or insurer.
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                Verified business badges require checked DTI/SEC/BIR documents.
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-primary" />
                We publicly warn buyers about full-upfront-payment and off-platform pressure tactics.
              </li>
            </ul>
            <p className="rounded-md border border-border bg-muted/40 p-3 text-xs">
              Notice an inaccuracy on this page? Email{" "}
              <a className="text-primary underline" href="mailto:legal@365motorsales.com">
                legal@365motorsales.com
              </a>{" "}
              and we'll correct it within 5 business days and log the change in the "Last updated"
              date at the top of this page.
            </p>
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}
