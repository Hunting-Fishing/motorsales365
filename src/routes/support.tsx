import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  Search,
  Tag,
  UserCheck,
  Store,
  Mail,
  MessageCircle,
  LifeBuoy,
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
import { SupportTicketForm } from "@/components/support/support-ticket-form";

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
  {
    to: "/support/buying" as const,
    title: "Buying a vehicle",
    icon: Search,
    desc: "Search, filter, contact sellers safely.",
    examples: ["Search & filter", "Safe meetups", "Inspecting paperwork"],
  },
  {
    to: "/support/selling" as const,
    title: "Selling & boosting",
    icon: Tag,
    desc: "List, photograph, promote your vehicle.",
    examples: ["Post a listing", "Photo tips", "Boost & promote"],
  },
  {
    to: "/support/account" as const,
    title: "Account & verification",
    icon: UserCheck,
    desc: "Sign up, log in, reset password, verify.",
    examples: ["Reset password", "Verified badge", "Privacy & data"],
  },
  {
    to: "/support/business" as const,
    title: "Business, shop & payments",
    icon: Store,
    desc: "Business pages, affiliate shop, billing.",
    examples: ["List your business", "Manage shop links", "Billing & refunds"],
  },
];

export const Route = createFileRoute("/support")({
  component: SupportHubPage,
  head: () => ({
    meta: [
      { title: "Help & Support — 365 MotorSales Philippines" },
      {
        name: "description",
        content:
          "Step-by-step guides, FAQ and direct support for buying, selling, boosting and managing your 365 MotorSales account.",
      },
      { property: "og:title", content: "Help & Support — 365 MotorSales" },
      {
        property: "og:description",
        content:
          "How-tos with annotated screenshots, FAQ and a support ticket form for the Philippines' vehicle marketplace.",
      },
      { property: "og:url", content: "https://365motorsales.com/support" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://365motorsales.com/support" }],
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

function SupportHubPage() {
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
              Browse guides, search the FAQ, or message our team directly.
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
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4">
        {/* Topic cards */}
        <section className="py-10 sm:py-14">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Browse by topic</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each guide has annotated screenshots and step-by-step instructions.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {TOPICS.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <t.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-1 text-base font-semibold sm:text-lg">
                      {t.title}
                      <ArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {t.examples.map((e) => (
                        <li
                          key={e}
                          className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                        >
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

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
                {query
                  ? `${filteredFaqs.length} match${filteredFaqs.length === 1 ? "" : "es"} for "${query}"`
                  : "Quick answers to the most common questions."}
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
          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Still need help?</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Send our team a message. We typically reply within 1 business day — Filipino and
                English support.
              </p>
              <div className="mt-6 space-y-2">
                <Button asChild variant="outline" className="w-full justify-start">
                  <a href="mailto:support@365motorsales.com?subject=Support%20request">
                    <Mail className="h-4 w-4" /> support@365motorsales.com
                  </a>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start">
                  {/* TODO: replace # with real Messenger / WhatsApp link */}
                  <a href="#" aria-disabled="true">
                    <MessageCircle className="h-4 w-4" /> Messenger / WhatsApp
                  </a>
                </Button>
              </div>
            </div>
            <Card>
              <CardContent className="p-5 sm:p-6">
                <h3 className="text-lg font-semibold">Send a support request</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  We'll email you a confirmation right away.
                </p>
                <div className="mt-5">
                  <SupportTicketForm />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
