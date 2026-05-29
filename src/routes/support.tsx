import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search,
  Tag,
  UserCheck,
  Store,
  Mail,
  MessageCircle,
  LifeBuoy,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AnnotatedScreenshot } from "@/components/support/annotated-screenshot";
import { SupportStep, SupportSteps } from "@/components/support/support-step";
import { TopicSection } from "@/components/support/topic-section";

import homeShot from "@/assets/support/home.png";
import browseShot from "@/assets/support/browse.png";
import pricingShot from "@/assets/support/pricing.png";
import shopShot from "@/assets/support/shop.png";
import businessesShot from "@/assets/support/businesses.png";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How much does it cost to list a vehicle?",
    a: "Posting a vehicle as a private seller is completely free. You get up to 20 photos and 1 video, with your listing live for 60 days. Paid boosts and business plans are optional upgrades for more reach.",
  },
  {
    q: "Do I need an account to browse listings?",
    a: "No. Browsing, searching and viewing listings is free and does not require an account. You only need to sign up if you want to post a listing, save favorites, contact a seller, or manage a business page.",
  },
  {
    q: "How do I contact a seller?",
    a: "Open the listing and use the contact buttons on the seller card — message, call or WhatsApp where available. For safety, keep early conversations on-platform and meet in a public place to inspect the vehicle.",
  },
  {
    q: "How do I boost my listing?",
    a: "From your Dashboard → My listings, open the listing and click Boost. Pick Search Boost (₱99), Province Boost (₱199) or Homepage Spotlight (₱499). Payment is processed securely via Stripe.",
  },
  {
    q: "How do I get the Verified badge?",
    a: "Go to Dashboard → Verification and upload a valid government ID plus a short selfie. Our team reviews verifications within 24–48 hours. Verified accounts get a blue badge and higher trust in search.",
  },
  {
    q: "I forgot my password. What do I do?",
    a: "On the Login page click Forgot password. We will email you a secure reset link. The link expires in 1 hour — request a new one if needed.",
  },
  {
    q: "How do refunds work for paid boosts and subscriptions?",
    a: "Unused boosts can be refunded within 24 hours of purchase if the listing has not yet been promoted. Business subscriptions are pro-rated. See our Refund Policy page for full details.",
  },
  {
    q: "How are Shop products priced and shipped?",
    a: "Shop products are sold by partner marketplaces (Shopee, Lazada, AliExpress) and brand stores. Pricing, shipping, returns and payment are handled by the seller — we only refer you via outbound links and earn a small commission.",
  },
  {
    q: "How do I report a suspicious listing or user?",
    a: "Every listing has a Report button. Choose a reason (scam, stolen vehicle, wrong category, offensive content). Our team reviews reports within 48 hours and may remove the listing or suspend the account.",
  },
  {
    q: "Can I edit or delete my listing after posting?",
    a: "Yes. Go to Dashboard → My listings and click the listing. You can edit photos, price and description any time, mark it as Sold, or delete it entirely.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Boosts and business subscriptions are paid with credit/debit card, GCash or Maya through Stripe. We never store your card details.",
  },
  {
    q: "Is my personal data safe?",
    a: "Yes. We are DPA-compliant and only share contact details when you initiate a message. You can request data export or deletion at any time from Dashboard → Profile.",
  },
];

const TOPICS = [
  { id: "buying", title: "Buying a vehicle", icon: Search, desc: "Search, compare, contact sellers safely." },
  { id: "selling", title: "Selling & boosting", icon: Tag, desc: "List, photograph and promote your vehicle." },
  { id: "account", title: "Account & verification", icon: UserCheck, desc: "Sign up, log in, reset password, verify." },
  { id: "business", title: "Business, shop & payments", icon: Store, desc: "Business pages, affiliate shop, billing." },
];

export const Route = createFileRoute("/support")({
  component: SupportPage,
  head: () => ({
    meta: [
      { title: "Help & Support — 365 MotorSales Philippines" },
      {
        name: "description",
        content:
          "Step-by-step guides, FAQ and contact options for buying, selling, boosting and managing your 365 MotorSales account.",
      },
      { property: "og:title", content: "Help & Support — 365 MotorSales" },
      {
        property: "og:description",
        content:
          "How-tos with annotated screenshots, FAQ and contact options for the Philippines' vehicle marketplace.",
      },
      { property: "og:url", content: "https://365motorsales.com/support" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: "https://365motorsales.com/support" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
});

function SupportPage() {
  const [query, setQuery] = useState("");

  const filteredFaqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  }, [query]);

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
              <LifeBuoy className="h-3.5 w-3.5" /> Help Center
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-5xl">
              How can we help?
            </h1>
            <p className="mt-3 text-sm text-primary-foreground/85 sm:text-base">
              Step-by-step how-tos, answers to common questions and a direct line to our team.
            </p>
            <div className="relative mx-auto mt-6 max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the FAQ — e.g. boost, refund, verify"
                className="h-12 rounded-full border-0 bg-white pl-10 pr-4 text-foreground shadow-lg focus-visible:ring-2 focus-visible:ring-white/60"
              />
            </div>
          </div>

          {/* Topic quick-links */}
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
            {TOPICS.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                className="group flex flex-col items-start gap-2 rounded-xl bg-white/10 p-4 text-left backdrop-blur transition-colors hover:bg-white/20"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                  <t.icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold leading-tight">{t.title}</span>
                <span className="hidden text-xs text-primary-foreground/75 sm:block">
                  {t.desc}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4">
        {/* BUYING */}
        <TopicSection
          id="buying"
          icon={Search}
          title="Buying a vehicle"
          description="Find the right car, motorcycle or equipment — and meet sellers safely."
        >
          <div>
            <h3 className="text-lg font-semibold">Search and filter listings</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a category from the top nav, then narrow results with filters on the left.
            </p>
            <AnnotatedScreenshot
              src={browseShot}
              alt="Browse cars page with category tabs and filter panel"
              annotations={[
                { n: 1, x: 25, y: 39, label: "Category tabs", side: "bottom" },
                { n: 2, x: 14, y: 70, label: "Filter by make, model & year", side: "right" },
              ]}
            />
            <SupportSteps>
              <SupportStep n={1} title="Choose a category">
                Click <strong>Cars</strong>, <strong>Motorcycles</strong>, <strong>Boats</strong>,{" "}
                <strong>Airplanes</strong>, <strong>Equipment</strong> or <strong>Towing</strong> from the top nav.
              </SupportStep>
              <SupportStep n={2} title="Apply filters">
                Use the Filters panel to narrow by make, model, year, engine, price and location.
              </SupportStep>
              <SupportStep n={3} title="Save a search">
                Logged in? Click the bookmark icon to get notified when matching listings appear.
              </SupportStep>
            </SupportSteps>
          </div>

          <div>
            <h3 className="text-lg font-semibold">Contact a seller safely</h3>
            <SupportSteps>
              <SupportStep n={1} title="Use on-platform messaging first">
                Keep early conversations on 365 MotorSales — this protects both buyer and seller.
              </SupportStep>
              <SupportStep n={2} title="Inspect in person">
                Always view the vehicle in daylight at a public, well-lit location. Bring a friend or mechanic.
              </SupportStep>
              <SupportStep n={3} title="Verify the paperwork">
                Check that the OR/CR, chassis number and engine number match. Never pay a deposit before seeing the vehicle.
              </SupportStep>
              <SupportStep n={4} title="Use traceable payments">
                Bank transfer, GCash or Maya. Avoid large cash transactions.
              </SupportStep>
            </SupportSteps>
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>
                See our <Link to="/guidelines" className="font-semibold text-primary underline">Community Guidelines</Link>{" "}
                for the full safety checklist.
              </p>
            </div>
          </div>
        </TopicSection>

        {/* SELLING */}
        <TopicSection
          id="selling"
          icon={Tag}
          title="Selling & boosting"
          description="List your vehicle in minutes, then boost it for more reach."
        >
          <div>
            <h3 className="text-lg font-semibold">Post a listing</h3>
            <AnnotatedScreenshot
              src={homeShot}
              alt="365 MotorSales home page showing the Post a listing button"
              annotations={[
                { n: 1, x: 87, y: 39, label: "Click Post a listing", side: "left" },
              ]}
            />
            <SupportSteps>
              <SupportStep n={1} title="Click Post a listing">
                Top-right of every page. You'll be asked to sign in if you haven't already.
              </SupportStep>
              <SupportStep n={2} title="Pick a category and vehicle">
                Choose the type (Car, Motorcycle, etc.) and select make, model and year.
              </SupportStep>
              <SupportStep n={3} title="Add great photos">
                Up to 20 photos and 1 video. Use daylight, clean the vehicle, and shoot from all 4 sides plus interior and engine.
              </SupportStep>
              <SupportStep n={4} title="Set your price and location">
                Prices are in ₱ PHP. Pick the region and city — buyers filter by location.
              </SupportStep>
              <SupportStep n={5} title="Publish">
                Your listing goes live for 60 days. Free.
              </SupportStep>
            </SupportSteps>
          </div>

          <div>
            <h3 className="text-lg font-semibold">Boost your listing</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Boosts move your listing higher in search and add featured placements.
            </p>
            <AnnotatedScreenshot
              src={pricingShot}
              alt="Pricing page with Search Boost, Province Boost and Homepage Spotlight tiers"
              annotations={[
                { n: 1, x: 30, y: 81, label: "₱99 — Search Boost", side: "right" },
                { n: 2, x: 55, y: 81, label: "₱199 — Province", side: "right" },
                { n: 3, x: 80, y: 81, label: "₱499 — Homepage", side: "left" },
              ]}
            />
            <SupportSteps>
              <SupportStep n={1} title="Open Dashboard → My listings">
                Find the listing you want to promote.
              </SupportStep>
              <SupportStep n={2} title="Click Boost">
                Pick the plan that matches your goal. Stripe handles payment securely.
              </SupportStep>
              <SupportStep n={3} title="Track results">
                Your dashboard shows views and click-throughs while the boost is active.
              </SupportStep>
            </SupportSteps>
          </div>
        </TopicSection>

        {/* ACCOUNT */}
        <TopicSection
          id="account"
          icon={UserCheck}
          title="Account & verification"
          description="Sign up, log in, reset your password and earn the Verified badge."
        >
          <div>
            <h3 className="text-lg font-semibold">Sign up or log in</h3>
            <SupportSteps>
              <SupportStep n={1} title="Click Account → Sign up">
                Top-right of the header. Use email + password or continue with Google.
              </SupportStep>
              <SupportStep n={2} title="Verify your email">
                We send a confirmation link. Click it to activate your account.
              </SupportStep>
              <SupportStep n={3} title="Forgot password?">
                On the Login page click <strong>Forgot password</strong> — we email a secure reset link valid for 1 hour.
              </SupportStep>
            </SupportSteps>
          </div>

          <div>
            <h3 className="text-lg font-semibold">Get the Verified badge</h3>
            <SupportSteps>
              <SupportStep n={1} title="Open Dashboard → Verification">
                You'll see the checklist of what we need.
              </SupportStep>
              <SupportStep n={2} title="Upload a valid government ID">
                Driver's license, passport, UMID or PhilSys ID. Make sure all corners are visible and text is readable.
              </SupportStep>
              <SupportStep n={3} title="Take a selfie">
                A short selfie helps us confirm the ID belongs to you. We never publish this image.
              </SupportStep>
              <SupportStep n={4} title="Wait 24–48 hours">
                Our team reviews and applies the blue Verified badge. You'll get an email when it's live.
              </SupportStep>
            </SupportSteps>
          </div>
        </TopicSection>

        {/* BUSINESS */}
        <TopicSection
          id="business"
          icon={Store}
          title="Business, shop & payments"
          description="Set up a business page, manage shop links, and handle billing."
        >
          <div>
            <h3 className="text-lg font-semibold">Create a business page</h3>
            <AnnotatedScreenshot
              src={businessesShot}
              alt="Businesses directory with the List your business button highlighted"
              annotations={[
                { n: 1, x: 90, y: 56, label: "List your business", side: "left" },
                { n: 2, x: 25, y: 73, label: "Categories & filters", side: "right" },
              ]}
            />
            <SupportSteps>
              <SupportStep n={1} title="Click List your business">
                From the Businesses page (top-right). You'll need a logged-in account.
              </SupportStep>
              <SupportStep n={2} title="Fill in your details">
                Name, category (dealership, repair shop, parts, etc.), location, hours, photos and accepted payments.
              </SupportStep>
              <SupportStep n={3} title="Pick a plan">
                Free directory listing, or upgrade for leads, multiple staff seats and analytics.
              </SupportStep>
              <SupportStep n={4} title="Publish & manage leads">
                Inquiries land in Dashboard → Leads. Assign to staff and respond fast — buyers move quickly.
              </SupportStep>
            </SupportSteps>
          </div>

          <div>
            <h3 className="text-lg font-semibold">Shop products & affiliate links</h3>
            <AnnotatedScreenshot
              src={shopShot}
              alt="Shop page with vehicle fitment picker"
              annotations={[
                { n: 1, x: 50, y: 88, label: "Find parts that fit your vehicle", side: "top" },
              ]}
            />
            <SupportSteps>
              <SupportStep n={1} title="Pick your vehicle">
                Use the fitment picker so we only show parts compatible with your make and model.
              </SupportStep>
              <SupportStep n={2} title="Click through to buy">
                You'll be sent to Shopee, Lazada, AliExpress or the brand store. Pricing, shipping and returns are handled there.
              </SupportStep>
              <SupportStep n={3} title="How we earn">
                We may receive a small commission — your price doesn't change.{" "}
                <Link to="/affiliate-disclosure" className="font-semibold text-primary underline">
                  Read the full disclosure
                </Link>
                .
              </SupportStep>
            </SupportSteps>
          </div>

          <div>
            <h3 className="text-lg font-semibold">Billing, receipts & refunds</h3>
            <SupportSteps>
              <SupportStep n={1} title="Find your receipts">
                Dashboard → Billing lists every charge with downloadable PDF receipts.
              </SupportStep>
              <SupportStep n={2} title="Update payment method">
                From Billing, click Manage to add or change card / e-wallet.
              </SupportStep>
              <SupportStep n={3} title="Request a refund">
                Within 24 hours of an unused boost, click <strong>Refund</strong> next to the charge.
                See the <Link to="/refund-policy" className="font-semibold text-primary underline">Refund Policy</Link> for details.
              </SupportStep>
            </SupportSteps>
          </div>
        </TopicSection>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 border-t border-border py-10 sm:py-14">
          <div className="mb-6 flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HelpCircle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Frequently asked questions
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {query ? `${filteredFaqs.length} match${filteredFaqs.length === 1 ? "" : "es"} for "${query}"` : "Quick answers to the most common questions."}
              </p>
            </div>
          </div>
          {filteredFaqs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No FAQ matches "{query}". Try a different word, or{" "}
                <a href="#contact" className="font-semibold text-primary underline">
                  contact our team
                </a>
                .
              </CardContent>
            </Card>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredFaqs.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-base font-medium">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </section>

        {/* CONTACT */}
        <section id="contact" className="scroll-mt-24 border-t border-border py-10 sm:py-14">
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-6 sm:p-10">
              <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Still need help?
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                    Our support team typically replies within one business day. Filipino and English.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto">
                  <Button asChild size="lg">
                    <a href="mailto:support@365motorsales.com?subject=Support%20request">
                      <Mail className="h-4 w-4" /> Email support
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/contact">
                      Contact form <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="ghost">
                    {/* TODO: replace # with real Messenger / WhatsApp link */}
                    <a href="#" aria-disabled="true">
                      <MessageCircle className="h-4 w-4" /> Messenger / WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </SiteLayout>
  );
}
