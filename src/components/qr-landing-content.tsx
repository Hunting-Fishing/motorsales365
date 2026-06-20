import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId, recordTouch } from "@/lib/referral";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  Info,
  Mail,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { siteOrigin } from "@/lib/site-config";
import { formatPHP } from "@/lib/format";
import findVehiclesAsset from "@/assets/referral/referral-find-vehicles.png.asset.json";
import postConnectSellAsset from "@/assets/referral/referral-post-connect-sell.png.asset.json";
import servicesNearYouAsset from "@/assets/referral/referral-services-near-you.png.asset.json";
import { QrLeadForm } from "@/components/qr-lead-form";

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

const AUDIENCE_PANELS: ImagePanel[] = [
  {
    eyebrow: "For buyers",
    title: "Find the right ride — without scrolling through memes",
    description:
      "Real vehicle filters (make, model, year, transmission, location), verified sellers, and direct messaging. No bumping the same post 14 times to be seen.",
    image: findVehiclesAsset.url,
    alt: "365 Motor Sales listings on desktop and mobile.",
  },
  {
    eyebrow: "For sellers",
    title: "List once. Reach buyers all week.",
    description:
      "Post your car, motorcycle, or part in minutes. Your listing keeps its place — no algorithm penalty for posting at the wrong hour.",
    image: postConnectSellAsset.url,
    alt: "Sellers posting vehicles on 365 Motor Sales.",
  },
  {
    eyebrow: "For businesses",
    title: "Get found by people already shopping for motor",
    description:
      "Shops, towing, parts stores, repair, car wash — a business page on the map, in the directory, and in every relevant search.",
    image: servicesNearYouAsset.url,
    alt: "365 Motor Sales business and services map across the Philippines.",
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

  const referrer = preview ? "Your referral code" : staffName || "your referrer";
  const contactLine =
    !preview && staffEmail ? (
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
        {preview && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <Eye className="h-4 w-4 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">Promoter preview</p>
              <p className="text-muted-foreground">
                This is the exact page a new visitor sees after scanning your QR code. Tracking,
                referral credit and lead submissions are disabled here.
              </p>
            </div>
          </div>
        )}

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
                      {preview
                        ? "Your name will appear here when a visitor scans"
                        : `${referrer} brought you to 365 Motor Sales`}
                    </h2>
                    {counted !== null && !preview && (
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
                            </p>
                          ) : (
                            <p>
                              You&apos;ve already scanned this code from this device. Repeat scans
                              are not counted.
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <p className="mt-3 max-w-2xl text-muted-foreground">
                    This QR keeps {preview ? "the promoter's" : `${referrer}'s`} referral credit,
                    but the page works like a shared featured destination — one strong page that
                    sells the platform, the services, and the upcoming roadmap.
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

              {!preview && visitCount > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {visitCount === 1 ? (
                      <>This is your first visit to this referral page.</>
                    ) : (
                      <>
                        You&apos;ve opened this page{" "}
                        <strong className="text-foreground">{visitCount}</strong>
                        {firstSeenAt ? (
                          <> times since {new Date(firstSeenAt).toLocaleDateString()}</>
                        ) : (
                          <> times</>
                        )}
                        . Only the first scan counts toward stats.
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

            {/* Hero */}
            <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary">
                  The motor marketplace for the Philippines
                </p>
                <h1 className="font-display mt-3 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                  Buy, sell, and grow — without fighting an algorithm.
                </h1>
                <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
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

            {/* Why 365 vs Facebook vs Google */}
            <section className="mt-12">
              <div className="mb-6 max-w-3xl">
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

            {/* Lead capture */}
            <section className="mt-12">
              {preview ? (
                <div className="rounded-2xl border-2 border-dashed border-border bg-card p-6 sm:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    Lead capture form
                  </p>
                  <h3 className="font-display mt-2 text-2xl font-bold sm:text-3xl">
                    Visitors can drop their name & contact here without signing up.
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    The live page renders a form (name, email/phone, vehicle or business interest)
                    that pushes leads directly to the 365 admin dashboard. The preview is
                    submission-disabled — open it on a real <code>/r/&lt;code&gt;</code> link to test
                    a real submission.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {["Name", "Email or phone", "Vehicle / business interest"].map((f) => (
                      <div key={f} className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Field
                        </p>
                        <p className="mt-1 text-sm font-medium">{f}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : code ? (
                <QrLeadForm referralCode={code} visitorId={getVisitorId()} />
              ) : null}
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
                    business — start here{preview ? "." : ` and ${referrer} still gets credit for bringing you in.`}
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
