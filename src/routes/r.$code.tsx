import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId, recordTouch } from "@/lib/referral";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowRight,
  CheckCircle2,
  Info,
  Mail,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { siteOrigin } from "@/lib/site-config";
import findVehiclesAsset from "@/assets/referral/referral-find-vehicles.png.asset.json";
import socialPostAsset from "@/assets/referral/referral-social-post.png.asset.json";
import everythingInOnePlaceAsset from "@/assets/referral/referral-everything-in-one-place.png.asset.json";
import servicesNearYouAsset from "@/assets/referral/referral-services-near-you.png.asset.json";
import postConnectSellAsset from "@/assets/referral/referral-post-connect-sell.png.asset.json";
import manyOpportunitiesAsset from "@/assets/referral/referral-many-opportunities.png.asset.json";
import comingSoonAsset from "@/assets/referral/referral-coming-soon.png.asset.json";
import whatsNextAsset from "@/assets/referral/referral-whats-next.png.asset.json";

export const Route = createFileRoute("/r/$code")({
  head: ({ params }) => ({
    meta: [
      { title: "365 Motor Sales Referral — Philippines Motor Marketplace" },
      {
        name: "description",
        content:
          "Discover 365 Motor Sales through a shared feature page for vehicles, businesses, services, future tools, and upcoming platform features in the Philippines.",
      },
      { property: "og:title", content: "365 Motor Sales — The Motor Marketplace Built for the Philippines" },
      {
        property: "og:description",
        content:
          "Search listings, discover services, connect with businesses, and explore the growing 365 motor ecosystem.",
      },
      { property: "og:url", content: `https://365motorsales.com/r/${params.code}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReferralLanding,
});

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

const PRIMARY_PANELS: ImagePanel[] = [
  {
    eyebrow: "Marketplace",
    title: "Find vehicles, parts, and services faster",
    description:
      "A structured motor marketplace built for search, discovery, and direct action across the Philippines.",
    image: findVehiclesAsset.url,
    alt: "365 Motor Sales feature graphic showing vehicle listings on desktop and mobile with create account and browse listings calls to action.",
  },
  {
    eyebrow: "Featured page",
    title: "More than just a social post",
    description:
      "Every QR code can lead into the same shared 365 showcase page while still keeping credit tied to the person whose QR was scanned.",
    image: socialPostAsset.url,
    alt: "365 Motor Sales promotional image highlighting organized categories, searchable listings, map discovery, business pages, and browse listings and create account actions.",
  },
  {
    eyebrow: "One ecosystem",
    title: "Everything motor in one place",
    description:
      "Marketplace, services, logistics, learning, export, shop tools, and business growth connected in one destination.",
    image: everythingInOnePlaceAsset.url,
    alt: "365 Motor Sales campaign image featuring listings, wanted board, tow and deliver, export, shop, learn, and shop manager platform sections.",
  },
];

const SECONDARY_PANELS: ImagePanel[] = [
  {
    eyebrow: "Services",
    title: "Discover motor services near you",
    description:
      "Show towing, parts stores, repairs, tire shops, aircon repair, car wash, and local businesses on a stronger featured page.",
    image: servicesNearYouAsset.url,
    alt: "365 Motor Sales map-based services image showing parts stores, towing, motorcycle repair, tire vulcanizing, car wash, and aircon repair across the Philippines.",
  },
  {
    eyebrow: "Sellers & buyers",
    title: "Post. Connect. Sell.",
    description:
      "Bring buyers and sellers into the same marketplace with trust signals, business pages, and listing-first calls to action.",
    image: postConnectSellAsset.url,
    alt: "365 Motor Sales signup and listing promotional image featuring sellers and buyers using desktop and mobile experiences.",
  },
  {
    eyebrow: "Growth",
    title: "One platform, many opportunities",
    description:
      "Use one shared destination page to explain the bigger 365 vision to buyers, sellers, shops, and future partners.",
    image: manyOpportunitiesAsset.url,
    alt: "365 Motor Sales platform overview image showing post listings, wanted board, tow and deliver, shop, learn, shop manager, and export opportunities.",
  },
  {
    eyebrow: "Coming soon",
    title: "Feature the roadmap clearly",
    description:
      "Highlight online parts ordering, shop software, education, games and rewards, and international learning standards.",
    image: comingSoonAsset.url,
    alt: "365 Motor Sales upcoming features image showing online parts ordering, shop management software, education and skills, mobile games and rewards, and international learning standards.",
  },
  {
    eyebrow: "Future",
    title: "What’s next for 365",
    description:
      "A shared QR destination can also sell the next chapter of the platform so every scan markets what is live and what is coming.",
    image: whatsNextAsset.url,
    alt: "365 Motor Sales future roadmap image showing online parts ordering, shop management software, education and skills, mobile games and rewards, and trust and verification.",
  },
];

function ReferralLanding() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [staffName, setStaffName] = useState<string | null>(null);
  const [staffEmail, setStaffEmail] = useState<string | null>(null);
  const [active, setActive] = useState<boolean | null>(null);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [counted, setCounted] = useState<boolean | null>(null);
  const [visitCount, setVisitCount] = useState<number>(0);
  const [firstSeenAt, setFirstSeenAt] = useState<string | null>(null);

  useEffect(() => {
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
            (supabase.rpc as any)("get_referrer_contact", {
              _code: code,
            }),
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
        } catch {
          // Non-blocking; page should still render even if contact lookup fails.
        }

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
        } catch {
          // Non-blocking; active promos are optional UI.
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  const referrer = staffName || "your referrer";
  const contactLine = staffEmail ? (
    <a
      href={`mailto:${staffEmail}`}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
    >
      <Mail className="h-3.5 w-3.5" />
      {staffEmail}
    </a>
  ) : null;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:py-10">
        {loading ? (
            <p className="text-center text-muted-foreground">Loading…</p>
          ) : active === false ? (
            <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-8 text-center">
              <h1 className="font-display text-2xl font-bold">Referral link unavailable</h1>
              <p className="mt-2 text-muted-foreground">
                This referral code isn&apos;t active. You can still create an account and browse.
              </p>
              <Button className="mt-6" onClick={() => navigate({ to: "/" })}>
                Continue to site
              </Button>
            </div>
          ) : (
            <>
              <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Referral credit
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <h2 className="font-display text-2xl font-bold sm:text-3xl">
                        {referrer} brought you to 365 Motor Sales
                      </h2>
                      {counted !== null && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={
                                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors " +
                                (counted
                                  ? "bg-primary/15 text-primary hover:bg-primary/20"
                                  : "bg-secondary text-muted-foreground hover:bg-secondary/80")
                              }
                              aria-label={counted ? "New scan counted" : "Repeat scan"}
                            >
                              {counted ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                              )}
                              <span>{counted ? "New scan counted" : "Repeat scan"}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" align="start" className="max-w-[260px] text-xs">
                            {counted ? (
                              <p>
                                First scan from this device — counted toward {referrer}&apos;s stats.
                                Repeat visits won&apos;t inflate their numbers.
                              </p>
                            ) : (
                              <p>
                                You&apos;ve already scanned this code from this device. We don&apos;t
                                count repeat scans, so {referrer}&apos;s stats stay accurate.
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <p className="mt-3 max-w-2xl text-muted-foreground">
                      This QR keeps {referrer}&apos;s referral credit, but the page now works like a
                      shared featured destination for every 365 user — one stronger page that sells
                      the platform, the services, and the upcoming roadmap.
                    </p>
                    {contactLine && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Contact {referrer}: {contactLine}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 lg:justify-end">
                    <Button onClick={() => navigate({ to: "/signup" })}>Create account</Button>
                    <Button variant="outline" onClick={() => navigate({ to: "/" })}>
                      Browse listings
                    </Button>
                    <Button variant="outline" onClick={() => navigate({ to: "/businesses" })}>
                      Partner your business
                    </Button>
                  </div>
                </div>

                {visitCount > 0 && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {visitCount === 1 ? (
                        <>This is your first visit to this referral page.</>
                      ) : (
                        <>
                          You&apos;ve opened this page <strong className="text-foreground">{visitCount}</strong>
                          {firstSeenAt ? <> times since {new Date(firstSeenAt).toLocaleDateString()}</> : <> times</>}.
                          Only the first scan counts toward stats.
                        </>
                      )}
                    </span>
                  </div>
                )}

                {promos.length > 0 && (
                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {promos.map((p) => (
                      <div key={p.id} className="rounded-lg border border-border bg-background p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                              Active offer
                            </p>
                            <h3 className="mt-1 font-semibold">{p.title}</h3>
                          </div>
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {p.kind}
                          </span>
                        </div>
                        {p.description && (
                          <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                        )}
                        <p className="mt-3 text-sm font-medium text-foreground">
                          {p.percent_off ? `${p.percent_off}% off` : null}
                          {p.percent_off && p.flat_amount_php ? " · " : null}
                          {p.flat_amount_php ? `₱${p.flat_amount_php}` : null}
                          {(p.percent_off || p.flat_amount_php) && (
                            <span className="font-normal text-muted-foreground">
                              {" "}· applies to {p.applies_to}
                            </span>
                          )}
                        </p>
                        {p.ends_at && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Ends {new Date(p.ends_at).toLocaleDateString()}
                          </p>
                        )}
                        {p.terms && <p className="mt-1 text-xs text-muted-foreground">{p.terms}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary">
                    Shared 365 feature page
                  </p>
                  <h1 className="font-display mt-3 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                    365 Motor Sales
                  </h1>
                  <p className="mt-3 text-xl font-semibold text-foreground sm:text-2xl">
                    The motor marketplace built for the Philippines.
                  </p>
                  <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
                    Keep the referral setup, keep every user&apos;s QR working, and send every scan into
                    one stronger destination page that explains what 365 already does and what is
                    coming next.
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
                      Join 365
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => navigate({ to: "/" })}>
                      Browse website
                    </Button>
                  </div>
                </div>

                <FeatureImage
                  image={PRIMARY_PANELS[0].image}
                  alt={PRIMARY_PANELS[0].alt}
                  eyebrow={PRIMARY_PANELS[0].eyebrow}
                  title={PRIMARY_PANELS[0].title}
                  description={PRIMARY_PANELS[0].description}
                  priority
                />
              </section>

              <section className="mt-10 grid gap-6 lg:grid-cols-2">
                <FeatureImage
                  image={PRIMARY_PANELS[1].image}
                  alt={PRIMARY_PANELS[1].alt}
                  eyebrow={PRIMARY_PANELS[1].eyebrow}
                  title={PRIMARY_PANELS[1].title}
                  description={PRIMARY_PANELS[1].description}
                />
                <FeatureImage
                  image={PRIMARY_PANELS[2].image}
                  alt={PRIMARY_PANELS[2].alt}
                  eyebrow={PRIMARY_PANELS[2].eyebrow}
                  title={PRIMARY_PANELS[2].title}
                  description={PRIMARY_PANELS[2].description}
                />
              </section>

              <section className="mt-10 grid gap-6 lg:grid-cols-2">
                {SECONDARY_PANELS.slice(0, 2).map((panel) => (
                  <FeatureImage
                    key={panel.title}
                    image={panel.image}
                    alt={panel.alt}
                    eyebrow={panel.eyebrow}
                    title={panel.title}
                    description={panel.description}
                  />
                ))}
              </section>

              <section className="mt-10 grid gap-6 lg:grid-cols-3">
                {SECONDARY_PANELS.slice(2).map((panel) => (
                  <FeatureImage
                    key={panel.title}
                    image={panel.image}
                    alt={panel.alt}
                    eyebrow={panel.eyebrow}
                    title={panel.title}
                    description={panel.description}
                  />
                ))}
              </section>

              <section className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div>
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      Shared destination for every QR code
                    </p>
                    <h2 className="font-display mt-3 text-2xl font-bold sm:text-3xl">
                      One page can do the selling for the whole network.
                    </h2>
                    <p className="mt-3 max-w-3xl text-muted-foreground">
                      Buyers get the big picture. Sellers see the opportunity. Shops see where
                      they fit. Partners see the roadmap. And the person whose QR was scanned still
                      gets the referral credit.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 lg:justify-end">
                    <Button size="lg" onClick={() => navigate({ to: "/signup" })}>
                      Sign up free <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => navigate({ to: "/businesses" })}>
                      Grow with us
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
      <img
        src={image}
        alt={alt}
        className="aspect-[16/10] w-full object-cover object-center"
        loading={priority ? "eager" : "lazy"}
      />
      <div className="p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
        <h2 className="font-display mt-2 text-xl font-bold leading-tight sm:text-2xl">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">{description}</p>
      </div>
    </article>
  );
}
