import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId, recordTouch } from "@/lib/referral";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ArrowRight,
  Car,
  Check,
  MapPin,
  MessageSquare,
  QrCode,
  Search,
  Shield,
  Sparkles,
  Store,
  Truck,
  Users,
  Wrench,
  X,
} from "lucide-react";

import { siteOrigin } from "@/lib/site-config";
import { formatPHP } from "@/lib/format";
import carsAndMotorcyclesAsset from "@/assets/qr-landing-uploaded/365-cars-and-motorcycles.png.asset.json";
import partsAndAccessoriesAsset from "@/assets/qr-landing-uploaded/365-parts-and-accessories.png.asset.json";
import shopsAndBusinessesAsset from "@/assets/qr-landing-uploaded/365-shops-and-businesses.png.asset.json";
import towAndDeliveryAsset from "@/assets/qr-landing-uploaded/365-tow-and-delivery.png.asset.json";
import allPhRegionsAsset from "@/assets/qr-landing-uploaded/all-ph-regions.png.asset.json";
import createYourFreeAccountAsset from "@/assets/qr-landing-uploaded/create-your-free-account.png.asset.json";
import growingWeeklyAsset from "@/assets/qr-landing-uploaded/growing-weekly.png.asset.json";
import nationwideMapAsset from "@/assets/qr-landing-uploaded/nationwide-map.png.asset.json";
import verifiedAccountsAsset from "@/assets/qr-landing-uploaded/verified-accounts.png.asset.json";
import scanOrVisitAsset from "@/assets/qr-landing-uploaded/scan-or-visit.png.asset.json";
import findVehiclesBannerAsset from "@/assets/qr-landing-uploaded/find-vehicles-parts-services-faster.png.asset.json";
import discoverServicesBannerAsset from "@/assets/qr-landing-uploaded/discover-motor-services-near-you.png.asset.json";
import postConnectSellBannerAsset from "@/assets/qr-landing-uploaded/post-connect-sell.png.asset.json";
import onePlatformBannerAsset from "@/assets/qr-landing-uploaded/one-platform-many-opportunities.png.asset.json";

type Promo = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  percent_off: number | null;
  flat_amount_php: number | null;
  applies_to: string;
  ends_at: string | null;
  terms: string | null;
};

type ImagePanel = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  alt: string;
};

type VisualCard = {
  eyebrow?: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  icon?: typeof Car;
  badge?: string;
};

const VISITS_KEY = (code: string) => `mref_visits_${code}`;

const FEATURE_CHIPS = [
  "Cars",
  "Motorcycles",
  "Parts",
  "Businesses",
  "Map",
  "Tow & Deliver",
  "Education",
  "Shop Manager",
];

const AUDIENCE_PANELS: ImagePanel[] = [
  {
    eyebrow: "For buyers",
    title: "Find the right ride — without scrolling through memes",
    description:
      "Real vehicle filters, verified sellers, direct messaging, and serious listings for Philippine buyers who want to move faster.",
    image: carsAndMotorcyclesAsset.url,
    alt: "Blue car and red motorcycle with Philippine-inspired 365 styling.",
  },
  {
    eyebrow: "For sellers",
    title: "List once. Reach buyers all week.",
    description:
      "Create your account, verify once, then list vehicles, parts, or services with a clean profile buyers can trust.",
    image: createYourFreeAccountAsset.url,
    alt: "Mobile signup and verification artwork with a car, motorcycle, shield, and Philippine-inspired styling.",
  },
  {
    eyebrow: "For businesses",
    title: "Get found by people already shopping for motor",
    description:
      "Shops, towing, parts stores, and service businesses show up where people search, browse, and compare near them.",
    image: shopsAndBusinessesAsset.url,
    alt: "Auto shop and service businesses presented in 365 visual style.",
  },
];

const TRUST_CARDS: VisualCard[] = [
  {
    eyebrow: "Reach",
    title: "All PH regions",
    description: "Vehicles, bikes, businesses, delivery, and service demand visible across the country.",
    image: allPhRegionsAsset.url,
    alt: "Map of the Philippines with automotive coverage markers across regions.",
    icon: Car,
  },
  {
    eyebrow: "Momentum",
    title: "Growing weekly",
    description: "More verified shops, more listings, and more reasons for first-time scanners to stay and explore.",
    image: growingWeeklyAsset.url,
    alt: "Automotive business growth artwork with an upward trend line.",
    icon: Store,
  },
  {
    eyebrow: "Coverage",
    title: "Nationwide map",
    description: "Search by area and connect across Luzon, Visayas, and Mindanao in one motor-focused network.",
    image: nationwideMapAsset.url,
    alt: "Nationwide map with connected vehicle and motorcycle routes.",
    icon: MapPin,
  },
  {
    eyebrow: "Trust",
    title: "Verified accounts",
    description: "Identity and business checks help buyers and sellers see who they are really dealing with.",
    image: verifiedAccountsAsset.url,
    alt: "Verified account and security artwork for 365 Motor Sales.",
    icon: Shield,
  },
];

const HOW_IT_WORKS_CARDS: VisualCard[] = [
  {
    badge: "01",
    eyebrow: "Entry",
    title: "Scan or visit",
    description: "You arrived from a QR or link, so there is no app install barrier before browsing.",
    image: scanOrVisitAsset.url,
    alt: "Person scanning a QR code on a tricycle with a mobile phone.",
    icon: QrCode,
  },
  {
    badge: "02",
    eyebrow: "Account",
    title: "Create your free account",
    description: "Buyers, sellers, and businesses all start with one clean account and one verification flow.",
    image: createYourFreeAccountAsset.url,
    alt: "Create account visual with mobile verification and security styling.",
    icon: Users,
  },
  {
    badge: "03",
    eyebrow: "Marketplace",
    title: "List or browse",
    description: "Filter real vehicles, parts, and services or post your own listing in a marketplace built for motor.",
    image: carsAndMotorcyclesAsset.url,
    alt: "Cars and motorcycles marketplace artwork.",
    icon: Search,
  },
  {
    badge: "04",
    eyebrow: "Trust",
    title: "Message & close",
    description: "Talk directly with verified sellers and businesses, then move to inspection, meetup, and deal closing.",
    image: verifiedAccountsAsset.url,
    alt: "Verified marketplace and secure account artwork.",
    icon: MessageSquare,
  },
];

const CATEGORY_CARDS: VisualCard[] = [
  {
    eyebrow: "Marketplace",
    title: "Cars & Motorcycles",
    description: "Brand-new, used, and project units across the Philippines in one search experience.",
    image: carsAndMotorcyclesAsset.url,
    alt: "Cars and motorcycles category artwork.",
    icon: Car,
  },
  {
    eyebrow: "Catalog",
    title: "Parts & Accessories",
    description: "OEM, aftermarket, performance, and consumables presented in a cleaner parts-shopping flow.",
    image: partsAndAccessoriesAsset.url,
    alt: "Parts and accessories category artwork showing wheels, brakes, suspension, and tools.",
    icon: Wrench,
  },
  {
    eyebrow: "Directory",
    title: "Shops & Businesses",
    description: "Dealerships, repair shops, detailing, tire centers, and motor businesses that want real visibility.",
    image: shopsAndBusinessesAsset.url,
    alt: "Shops and businesses category artwork showing automotive businesses.",
    icon: Store,
  },
  {
    eyebrow: "Logistics",
    title: "Tow & Delivery",
    description: "On-demand towing and vehicle delivery presented in the same trusted 365 visual system.",
    image: towAndDeliveryAsset.url,
    alt: "Tow and delivery category artwork showing a flatbed truck carrying a car and motorcycle.",
    icon: Truck,
  },
];

const SAFETY_CARDS: VisualCard[] = [
  {
    eyebrow: "Verification",
    title: "Verified identities",
    description: "Sellers and businesses verify by phone, email, ID, and documents before earning visible trust signals.",
    image: verifiedAccountsAsset.url,
    alt: "Verified identity and secure marketplace artwork.",
  },
  {
    eyebrow: "Safe start",
    title: "Meet in safe places",
    description: "Use mapped businesses, public locations, and known service points to keep inspections and meetups safer.",
    image: scanOrVisitAsset.url,
    alt: "Real-world QR scan and marketplace entry artwork.",
  },
  {
    eyebrow: "Support",
    title: "Report & moderation",
    description: "Every listing and conversation can be flagged so the platform can respond faster when something looks wrong.",
    image: createYourFreeAccountAsset.url,
    alt: "Secure account and moderation-support artwork.",
  },
];

const BOOST_SEARCH_PHP = 99;
const BOOST_PROVINCE_PHP = 199;

type CompareRow = {
  label: string;
  motorsales: { ok: boolean; note: string };
  facebook: { ok: boolean; note: string };
  google: { ok: boolean; note: string };
};

const COMPARE_ROWS: CompareRow[] = [
  {
    label: "Built for vehicles",
    motorsales: { ok: true, note: "Make, model, year, mileage, transmission, location filters." },
    facebook: { ok: false, note: "General feed — buried under everything else." },
    google: { ok: false, note: "Generic search results, not a marketplace." },
  },
  {
    label: "Verified sellers & businesses",
    motorsales: { ok: true, note: "ID + business verification badges." },
    facebook: { ok: false, note: "Anyone with an account, real or fake." },
    google: { ok: false, note: "No seller identity layer." },
  },
  {
    label: "Direct buyer ↔ seller messaging",
    motorsales: { ok: true, note: "In-app messages, listing context attached." },
    facebook: { ok: true, note: "Messenger — but mixed with everything else." },
    google: { ok: false, note: "You leave Google to talk to anyone." },
  },
  {
    label: "Local services map",
    motorsales: { ok: true, note: "Towing, parts, repair, car wash near you." },
    facebook: { ok: false, note: "No native services map." },
    google: { ok: true, note: "Maps — but pay-per-click to stand out." },
  },
  {
    label: "Cost to boost a listing",
    motorsales: { ok: true, note: `${formatPHP(BOOST_SEARCH_PHP)} – ${formatPHP(BOOST_PROVINCE_PHP)} for 7 days.` },
    facebook: { ok: false, note: "Typically ₱500–₱2,000 for similar reach." },
    google: { ok: false, note: "₱20–₱60 per click — adds up fast." },
  },
  {
    label: "Predictable reach",
    motorsales: { ok: true, note: "Listings stay searchable — no algorithm guessing." },
    facebook: { ok: false, note: "Reach changes daily based on the algorithm." },
    google: { ok: false, note: "Rank depends on bid wars and SEO." },
  },
];

export type QrLandingContentProps = {
  /** Live referral code to track against, or null for preview mode without a code. */
  code: string | null;
  /** Preview mode: skip tracking, skip lead inserts, show preview banner. */
  preview?: boolean;
};

export function QrLandingContent({ code, preview = false }: QrLandingContentProps) {
  const navigate = useNavigate();
  const [staffName, setStaffName] = useState<string | null>(null);
  const [staffEmail, setStaffEmail] = useState<string | null>(null);
  const [active, setActive] = useState<boolean | null>(preview ? true : null);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(!preview);
  const [counted, setCounted] = useState<boolean | null>(null);
  const [visitCount, setVisitCount] = useState<number>(0);
  const [firstSeenAt, setFirstSeenAt] = useState<string | null>(null);

  useEffect(() => {
    if (preview || !code) return;
    let cancelled = false;

    const withTimeout = async <T,>(promise: Promise<T>, ms: number) => {
      return await Promise.race<T>([
        promise,
        new Promise<T>((_, reject) => {
          window.setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
        }),
      ]);
    };

    (async () => {
      try {
        const visitorId = getVisitorId();
        const ua = navigator.userAgent;
        const landing = `${siteOrigin()}${window.location.pathname}${window.location.search}`;

        let scanData: any = null;
        try {
          const scanResult = await withTimeout(
            (supabase.rpc as any)("record_qr_scan", {
              _code: code,
              _visitor_id: visitorId,
              _user_agent: ua,
              _landing: landing,
            }),
            8000,
          );
          if (!cancelled) {
            const { data, error } = scanResult as { data?: any; error?: any };
            if (!error && data?.ok) {
              scanData = data;
              setStaffName(data.first_name || data.staff_name || null);
              setActive(Boolean(data.active));
              setCounted(data.active ? Boolean(data.counted) : null);
              if (data.active) recordTouch(code);
            } else {
              setActive(true);
            }
          }
        } catch {
          if (!cancelled) setActive(true);
        }

        try {
          const raw = localStorage.getItem(VISITS_KEY(code));
          const prev = raw ? JSON.parse(raw) : { count: 0, first: null as string | null };
          const next = {
            count: (prev.count || 0) + 1,
            first: prev.first || new Date().toISOString(),
          };
          localStorage.setItem(VISITS_KEY(code), JSON.stringify(next));
          if (!cancelled) {
            setVisitCount(next.count);
            setFirstSeenAt(next.first);
          }
        } catch {
          if (!cancelled) setVisitCount(1);
        }

        try {
          const contactResult = (await withTimeout(
            (supabase.rpc as any)("get_referrer_contact", { _code: code }),
            8000,
          )) as any;
          const contact = contactResult?.data;
          const first = Array.isArray(contact) ? contact[0] : contact;
          if (!cancelled) {
            if (first?.email) setStaffEmail(first.email);
            if (first?.full_name && !scanData?.first_name && !scanData?.staff_name) {
              setStaffName(first.full_name);
            }
          }
        } catch {}

        try {
          const sb = supabase as any;
          const staffResult = (await withTimeout(
            sb.from("staff_referrals").select("id").eq("referral_code", code).maybeSingle(),
            8000,
          )) as any;
          const staff = staffResult?.data;
          if (staff?.id) {
            const nowIso = new Date().toISOString();
            const promoResult = (await withTimeout(
              sb
                .from("staff_promotions")
                .select(
                  "id,title,description,kind,percent_off,flat_amount_php,applies_to,ends_at,terms,starts_at,active",
                )
                .eq("staff_referral_id", staff.id)
                .eq("active", true),
              8000,
            )) as any;
            const pr = promoResult?.data;
            const filtered = ((pr as any[]) || []).filter(
              (p) => (!p.starts_at || p.starts_at <= nowIso) && (!p.ends_at || p.ends_at >= nowIso),
            );
            if (!cancelled) setPromos(filtered as Promo[]);
          }
        } catch {}
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, preview]);


  return (
    <TooltipProvider delayDuration={150}>
      <div className="container mx-auto max-w-7xl px-4 py-6 sm:py-10">



        {loading ? (
          <p className="text-center text-muted-foreground">Loading…</p>
        ) : active === false ? (
          <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-6 sm:p-8 text-center">
            <h1 className="font-display text-xl sm:text-2xl font-bold">Link unavailable</h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              This QR link isn&apos;t active. You can still create an account and browse.
            </p>
            <Button className="mt-6" onClick={() => navigate({ to: "/" })}>
              Continue to site
            </Button>
          </div>
        ) : (
          <>

            <section className="mt-6 sm:mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
              <div>
                <SectionBanner
                  image={findVehiclesBannerAsset.url}
                  alt="365 Motor Sales — Find vehicles, parts and services faster across the Philippines."
                  className="mb-4"
                />
                <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] sm:tracking-[0.26em] text-primary">
                  The motor marketplace for the Philippines
                </p>
                <h1 className="font-display mt-3 text-3xl font-bold leading-[1.1] sm:text-4xl md:text-5xl lg:text-6xl">
                  Buy, sell, and grow — without fighting an algorithm.
                </h1>
                <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base lg:text-lg">
                  365 Motor Sales is built for vehicles, parts, and motor businesses. Real filters,
                  verified sellers, fair pricing, and boosts that cost a fraction of Facebook or
                  Google ads.
                </p>


                <div className="mt-6 flex flex-wrap gap-2">
                  {FEATURE_CHIPS.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground"
                    >
                      {chip}
                    </span>
                  ))}
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Button size="lg" onClick={() => navigate({ to: "/signup" })}>
                    Create free account
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate({ to: "/" })}>
                    Browse listings
                  </Button>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Verified sellers · PH-based support · No bidding wars
                </p>
              </div>

              <FeatureImage
                image={AUDIENCE_PANELS[0].image}
                alt={AUDIENCE_PANELS[0].alt}
                eyebrow={AUDIENCE_PANELS[0].eyebrow}
                title={AUDIENCE_PANELS[0].title}
                description={AUDIENCE_PANELS[0].description}
                priority
              />
            </section>

            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {TRUST_CARDS.map((card) => (
                <ImageInfoCard key={card.title} {...card} />
              ))}
            </section>

            <section className="mt-12">
              <div className="mb-6 flex flex-wrap items-start gap-4 max-w-3xl">
                <SectionBanner
                  image={postConnectSellBannerAsset.url}
                  alt="Post. Connect. Sell. — Create an account, post listings and connect with buyers."
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    How it works
                  </p>
                  <h2 className="font-display mt-2 text-2xl font-bold sm:text-3xl">
                    From scan to sale in four steps.
                  </h2>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {HOW_IT_WORKS_CARDS.map((card) => (
                  <ImageInfoCard key={card.title} {...card} />
                ))}
              </div>
            </section>

            <section className="mt-12">
              <div className="mb-6 flex flex-wrap items-start gap-4 max-w-3xl">
                <SectionBanner
                  image={onePlatformBannerAsset.url}
                  alt="One platform, many opportunities — Marketplace, services, logistics, learning and growth."
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    What&apos;s on 365
                  </p>
                  <h2 className="font-display mt-2 text-2xl font-bold sm:text-3xl">
                    Every part of the motor world — under one roof.
                  </h2>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {CATEGORY_CARDS.map((card) => (
                  <ImageInfoCard key={card.title} {...card} />
                ))}
              </div>
            </section>

            <section className="mt-12">
              <div className="mb-6 flex flex-wrap items-start gap-4 max-w-3xl">
                <SectionBanner
                  image={discoverServicesBannerAsset.url}
                  alt="Discover motor services near you — from towing to parts stores, nationwide."
                />
                <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Why 365 beats the alternatives
                </p>
                <h2 className="font-display mt-2 text-2xl font-bold sm:text-3xl">
                  Facebook is a feed. Google is a search box. 365 is a motor marketplace.
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Side-by-side, here is what you actually get when you list, search, or advertise on
                  each.
                </p>
                </div>
              </div>


              <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
                <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] border-b border-border bg-muted/40 text-sm font-semibold">
                  <div className="p-4">&nbsp;</div>
                  <div className="p-4 text-primary">365 Motor Sales</div>
                  <div className="p-4 text-muted-foreground">Facebook</div>
                  <div className="p-4 text-muted-foreground">Google</div>
                </div>
                {COMPARE_ROWS.map((row, i) => (
                  <div
                    key={row.label}
                    className={
                      "grid grid-cols-[1.2fr_1fr_1fr_1fr] text-sm " +
                      (i % 2 ? "bg-background" : "bg-card")
                    }
                  >
                    <div className="border-t border-border p-4 font-medium">{row.label}</div>
                    <CompareCell ok={row.motorsales.ok} note={row.motorsales.note} highlight />
                    <CompareCell ok={row.facebook.ok} note={row.facebook.note} />
                    <CompareCell ok={row.google.ok} note={row.google.note} />
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:hidden">
                {(["motorsales", "facebook", "google"] as const).map((col) => (
                  <div key={col} className="rounded-xl border border-border bg-card p-4">
                    <p
                      className={
                        "text-sm font-bold " +
                        (col === "motorsales" ? "text-primary" : "text-muted-foreground")
                      }
                    >
                      {col === "motorsales"
                        ? "365 Motor Sales"
                        : col === "facebook"
                          ? "Facebook"
                          : "Google"}
                    </p>
                    <ul className="mt-3 space-y-2 text-sm">
                      {COMPARE_ROWS.map((row) => {
                        const cell = row[col];
                        return (
                          <li key={row.label} className="flex gap-2">
                            {cell.ok ? (
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            ) : (
                              <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            <span>
                              <span className="font-medium">{row.label}: </span>
                              <span className="text-muted-foreground">{cell.note}</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Boosts & advertising
                </p>
                <h2 className="font-display mt-2 text-2xl font-bold sm:text-3xl">
                  A week of real reach for less than one Facebook boost.
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Our boost prices are fixed — no daily bidding, no surprise spend.
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border-2 border-primary bg-primary/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    365 — Search Boost
                  </p>
                  <p className="mt-2 font-display text-3xl font-bold">
                    {formatPHP(BOOST_SEARCH_PHP)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    7 days · higher placement in search
                  </p>
                </div>
                <div className="rounded-xl border-2 border-primary bg-primary/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    365 — Province Boost
                  </p>
                  <p className="mt-2 font-display text-3xl font-bold">
                    {formatPHP(BOOST_PROVINCE_PHP)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    7 days · featured top of your province
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Typical Facebook / Google
                  </p>
                  <p className="mt-2 font-display text-3xl font-bold text-muted-foreground">
                    ₱500–₱2,000
                  </p>
                  <p className="text-sm text-muted-foreground">
                    FB Boost for comparable reach · Google Ads ₱20–₱60 per click
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Facebook and Google figures are typical Philippine market ranges for motor-related
                campaigns, not official quotes.
              </p>
            </section>

            <section className="mt-12 grid gap-6 lg:grid-cols-2">
              <FeatureImage
                image={AUDIENCE_PANELS[1].image}
                alt={AUDIENCE_PANELS[1].alt}
                eyebrow={AUDIENCE_PANELS[1].eyebrow}
                title={AUDIENCE_PANELS[1].title}
                description={AUDIENCE_PANELS[1].description}
              />
              <FeatureImage
                image={AUDIENCE_PANELS[2].image}
                alt={AUDIENCE_PANELS[2].alt}
                eyebrow={AUDIENCE_PANELS[2].eyebrow}
                title={AUDIENCE_PANELS[2].title}
                description={AUDIENCE_PANELS[2].description}
              />
            </section>


            <section className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
              <div className="max-w-3xl">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  <Shield className="h-3.5 w-3.5" /> Safer transactions
                </p>
                <h2 className="font-display mt-2 text-2xl font-bold sm:text-3xl">
                  Built-in safety for every deal.
                </h2>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {SAFETY_CARDS.map((card) => (
                  <ImageInfoCard key={card.title} {...card} />
                ))}
              </div>
            </section>


            <section className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
              <div className="mb-4 max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Common questions
                </p>
                <h2 className="font-display mt-2 text-2xl font-bold sm:text-3xl">
                  Quick answers before you sign up.
                </h2>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {[
                  { q: "Is it really free?", a: "Yes — creating an account, browsing, and posting listings is free. You only pay if you choose a paid boost or a business plan." },
                  { q: "How are sellers verified?", a: "Sellers verify their phone and email. Businesses additionally submit IDs and business documents to earn a verification badge." },
                  { q: "Do you charge commission on sales?", a: "No. 365 does not take a cut of your private sale. Buyers and sellers transact directly." },
                  { q: "Can I use 365 on mobile without an app?", a: "Yes. The site is mobile-first — no app install needed. You can also add it to your home screen." },
                  { q: "What's the difference between Search Boost and Province Boost?", a: `Search Boost (${formatPHP(BOOST_SEARCH_PHP)}) lifts your listing in search results. Province Boost (${formatPHP(BOOST_PROVINCE_PHP)}) features it at the top of your entire province. Both run for 7 days at a fixed price.` },
                  { q: "How is my data handled?", a: "We only collect what's needed to run your account and listings. See our Privacy Policy for full details. We never sell your data." },
                ].map((item, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>

            <section className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Join the marketplace built for motor
                  </p>
                  <h2 className="font-display mt-3 text-2xl font-bold sm:text-3xl">
                    Free to join. Free to list. Boost only when you want to.
                  </h2>
                  <p className="mt-3 max-w-3xl text-muted-foreground">
                    Whether you&apos;re looking for your next ride, selling one, or running a motor
                    business — start here.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 lg:justify-end">
                  <Button size="lg" onClick={() => navigate({ to: "/signup" })}>
                    Sign up free <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate({ to: "/businesses" })}>
                    List my business
                  </Button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

function ImageInfoCard({ eyebrow, title, description, image, alt, icon: Icon, badge }: VisualCard) {
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="shrink-0 rounded-lg bg-muted/30 p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`View full image: ${alt}`}
              >
                <img
                  src={image}
                  alt={alt}
                  className="h-10 w-10 object-contain sm:h-12 sm:w-12"
                  loading="lazy"
                />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl border-none bg-background/95 p-2 sm:p-4">
              <VisuallyHidden>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
              </VisuallyHidden>
              <img src={image} alt={alt} className="h-auto max-h-[85vh] w-full object-contain" />
            </DialogContent>
          </Dialog>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {badge ? (
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">
                  {badge}
                </span>
              ) : null}
              {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
              {eyebrow ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  {eyebrow}
                </p>
              ) : null}
            </div>
            <h3 className="font-display mt-1 text-lg font-bold leading-tight sm:text-xl">{title}</h3>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    </article>
  );
}

function FeatureImage({
  image,
  alt,
  eyebrow,
  title,
  description,
  priority = false,
}: ImagePanel & { priority?: boolean }) {
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="shrink-0 rounded-lg bg-muted/30 p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`View full image: ${alt}`}
              >
                <img
                  src={image}
                  alt={alt}
                  className="h-10 w-10 object-contain sm:h-14 sm:w-14"
                  loading={priority ? "eager" : "lazy"}
                />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl border-none bg-background/95 p-2 sm:p-4">
              <VisuallyHidden>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
              </VisuallyHidden>
              <img src={image} alt={alt} className="h-auto max-h-[85vh] w-full object-contain" />
            </DialogContent>
          </Dialog>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
            <h2 className="font-display text-xl font-bold leading-tight sm:text-2xl">{title}</h2>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">{description}</p>
      </div>
    </article>
  );
}

function SectionBanner({ image, alt, className = "" }: { image: string; alt: string; className?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`View full image: ${alt}`}
          className={
            "group block overflow-hidden rounded-lg border border-border bg-card shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
            className
          }
          style={{ cursor: "zoom-in" }}
        >
          <img
            src={image}
            alt={alt}
            loading="lazy"
            className="h-16 w-auto object-contain sm:h-20 md:h-24"
          />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl border-none bg-background/95 p-2 sm:p-4">
        <VisuallyHidden>
          <DialogTitle>{alt}</DialogTitle>
          <DialogDescription>{alt}</DialogDescription>
        </VisuallyHidden>
        <img src={image} alt={alt} className="h-auto max-h-[85vh] w-full object-contain" />
      </DialogContent>
    </Dialog>
  );
}


function CompareCell({ ok, note, highlight = false }: { ok: boolean; note: string; highlight?: boolean }) {
  return (
    <div className={"border-t border-border p-4 " + (highlight ? "bg-primary/5" : "")}>
      <div className="flex items-start gap-2">
        {ok ? (
          <Check className={"mt-0.5 h-4 w-4 shrink-0 " + (highlight ? "text-primary" : "text-foreground")} />
        ) : (
          <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className={highlight ? "text-foreground" : "text-muted-foreground"}>{note}</span>
      </div>
    </div>
  );
}
