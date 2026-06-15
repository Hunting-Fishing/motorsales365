import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  X,
  Camera,
  DollarSign,
  Type,
  ShieldAlert,
  MessageCircle,
  Gavel,
  Award,
  Users,
} from "lucide-react";
import { SiteLayout } from "@/components/site-layout";

export const Route = createFileRoute("/help/posting-etiquette")({
  head: () => ({
    meta: [
      { title: "Posting Etiquette & Listing Guidelines — 365 MotorSales" },
      {
        name: "description",
        content:
          "How to post listings that build trust: photos, pricing honesty, titles, communication, and what triggers takedowns on 365 MotorSales Philippines.",
      },
      { property: "og:title", content: "Posting Etiquette & Listing Guidelines" },
      {
        property: "og:description",
        content:
          "Best practices, dos and don'ts, and what affects your trust score on 365 MotorSales.",
      },
    ],
  }),
  component: PostingEtiquettePage,
});

function DoDont({
  doItems,
  dontItems,
}: {
  doItems: string[];
  dontItems: string[];
}) {
  return (
    <div className="my-4 grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          <Check className="h-4 w-4" /> Do
        </div>
        <ul className="space-y-1.5 text-sm">
          {doItems.map((t, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-destructive">
          <X className="h-4 w-4" /> Don't
        </div>
        <ul className="space-y-1.5 text-sm">
          {dontItems.map((t, i) => (
            <li key={i} className="flex items-start gap-2">
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
  id,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-24">
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
        <Icon className="h-6 w-6 text-primary" />
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function ScreenshotPlaceholder({ caption }: { caption: string }) {
  return (
    <figure className="my-3 overflow-hidden rounded-lg border border-dashed border-border bg-muted/40">
      <div className="grid aspect-[16/9] place-items-center text-xs text-muted-foreground">
        Screenshot placeholder
      </div>
      <figcaption className="border-t border-border bg-background px-3 py-2 text-xs text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}

function PostingEtiquettePage() {
  return (
    <SiteLayout>
      <article className="container mx-auto max-w-3xl px-4 py-12">
        <header className="border-b border-border pb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Seller help
          </p>
          <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">
            Posting Etiquette &amp; Listing Guidelines
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            How to post listings that buyers trust — and keep your account in good standing.
            Listings that follow these guidelines sell faster, get fewer reports, and raise your
            trust score.
          </p>
          <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-900 dark:text-amber-200">
            <strong>Account owners:</strong> you are responsible for the conduct of every teammate
            posting under your business account. See{" "}
            <a href="#team-accounts" className="underline">
              multi-user accounts
            </a>
            .
          </div>
        </header>

        <Section icon={Award} title="Why this matters" id="why">
          <p>
            Every listing you post is a public reflection of your account. Buyers compare dozens of
            listings; the well-posted one wins. Repeated low-quality or misleading posts trigger
            buyer reports, lower your trust score, and can lead to takedowns or account
            suspension.
          </p>
        </Section>

        <Section icon={Camera} title="Photos that sell" id="photos">
          <p>Photos are 70% of the buying decision. Spend 5 extra minutes here.</p>
          <DoDont
            doItems={[
              "Take photos in daylight on a clean background.",
              "Include all four sides, interior, dashboard, engine bay, and odometer.",
              "Show real damage clearly — buyers reward honesty.",
              "Upload high-resolution images (≥ 1600px on the long edge).",
            ]}
            dontItems={[
              "Use stock photos, brochure renders, or other sellers' images.",
              "Re-shoot a screenshot of another listing.",
              "Heavy filters, watermarks, or text plastered over the photo.",
              "Cropped, dark, blurry, or sideways photos.",
            ]}
          />
          <ScreenshotPlaceholder caption="Example: good vs. bad first photo on a listing card." />
        </Section>

        <Section icon={Type} title="Titles & descriptions" id="titles">
          <DoDont
            doItems={[
              "Title: Year, Make, Model, Trim — e.g. '2018 Toyota Hilux G 4x4 AT'.",
              "Describe condition, service history, included items, known issues.",
              "Use plain sentences. Buyers skim.",
              "Mention OR/CR status, mileage, and registration expiry.",
            ]}
            dontItems={[
              "ALL CAPS TITLES OR EMOJI SPAM 🚗🔥💯🔥🚗.",
              "Keyword stuffing unrelated brands ('not Honda not Mazda not Ford').",
              "Vague descriptions like 'rush sale, msg me'.",
              "Promises you can't keep ('brand new', '0 issues') on a used unit.",
            ]}
          />
        </Section>

        <Section icon={DollarSign} title="Pricing honesty" id="pricing">
          <DoDont
            doItems={[
              "List your real asking price in PHP.",
              "Disclose if the price excludes transfer, LTO, or shipping fees.",
              "Update or close the listing if the price changes or the item sells.",
            ]}
            dontItems={[
              "Bait pricing (₱1 or ₱1,000 to top search results).",
              "Hidden fees revealed only after the buyer commits.",
              "Showing a finance monthly as the main price without flagging it.",
            ]}
          />
        </Section>

        <Section icon={ShieldAlert} title="Prohibited items" id="prohibited">
          <p>
            Listings that violate Philippine law or our policies are removed on sight and may lead
            to suspension. See the full list in our{" "}
            <Link to="/terms" className="text-primary underline">
              Terms &amp; Conditions
            </Link>{" "}
            and{" "}
            <Link to="/guidelines" className="text-primary underline">
              Community Guidelines
            </Link>
            . Common takedown triggers:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Stolen vehicles, parts, or documents.</li>
            <li>Units without valid OR/CR or proper import papers.</li>
            <li>Counterfeit branded parts.</li>
            <li>Weapons, drugs, or restricted goods.</li>
            <li>Scams, phishing, or off-platform payment requests.</li>
          </ul>
        </Section>

        <Section icon={MessageCircle} title="Communication standards" id="comms">
          <DoDont
            doItems={[
              "Reply to inquiries within 24 hours.",
              "Keep conversations on-platform until both parties agree to a meet.",
              "Be polite. Buyers compare sellers, not just listings.",
            ]}
            dontItems={[
              "Push buyers to WhatsApp/Messenger immediately to avoid platform protections.",
              "Ghost serious inquiries.",
              "Send unsolicited messages or use other listings to spam your own.",
            ]}
          />
        </Section>

        <Section icon={Gavel} title="Reports, strikes & takedowns" id="reports">
          <p>
            Any user can report a listing. Reports are reviewed by our trust &amp; safety team.
            Possible outcomes:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>Dismissed</strong> — no action; the listing stays up.
            </li>
            <li>
              <strong>Warning</strong> — you're notified and asked to fix the listing.
            </li>
            <li>
              <strong>Taken down</strong> — listing hidden; counts against your trust score.
            </li>
            <li>
              <strong>Account action</strong> — repeated taken-down listings can suspend your
              account.
            </li>
          </ul>
          <p>
            To appeal, reply to the takedown email or open a ticket from{" "}
            <Link to="/support" className="text-primary underline">
              Help &amp; Support
            </Link>
            .
          </p>
        </Section>

        <Section icon={Award} title="Trust score" id="trust-score">
          <p>
            Every account has an internal trust score (0–100) used by staff when reviewing reports
            and applications. What moves it:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
              <div className="font-semibold text-emerald-700 dark:text-emerald-400">Raises it</div>
              <ul className="mt-1 space-y-1">
                <li>Verified identity / business</li>
                <li>Good seller reviews (★ 4+)</li>
                <li>Healthy lifetime revenue on the platform</li>
                <li>Founding member status</li>
              </ul>
            </div>
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <div className="font-semibold text-destructive">Lowers it</div>
              <ul className="mt-1 space-y-1">
                <li>Listings taken down after a report</li>
                <li>Open unresolved reports</li>
                <li>Dismissed reports you filed against others (abuse)</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section icon={Users} title="Multi-user (team) accounts" id="team-accounts">
          <p>
            If your business has multiple teammates posting under one account, every teammate's
            behavior counts toward the account's standing. The account owner can see — and is
            responsible for — every teammate's reports and takedowns.
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Brief your team on this page before granting posting access.</li>
            <li>Remove inactive or problematic teammates promptly.</li>
            <li>
              One teammate with repeat violations can suspend the whole business account, not just
              their seat.
            </li>
          </ul>
        </Section>

        <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>
            Questions? Open a ticket via{" "}
            <Link to="/support" className="text-primary underline">
              Help &amp; Support
            </Link>
            . Last updated: June 15, 2026.
          </p>
        </footer>
      </article>
    </SiteLayout>
  );
}
