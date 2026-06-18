import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId, recordTouch } from "@/lib/referral";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CheckCircle2,
  RotateCcw,
  Info,
  Mail,
  Car,
  Wrench,
  Package,
  GraduationCap,
  Gamepad2,
  Building2,
  MapPin,
  Sparkles,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { siteOrigin } from "@/lib/site-config";

export const Route = createFileRoute("/r/$code")({
  head: ({ params }) => ({
    meta: [
      { title: "Referred to 365 Motor Sales — Philippines Motor Marketplace" },
      {
        name: "description",
        content:
          "Buy. Sell. List. Partner. Learn. Play. Join the Philippines' dedicated motor ecosystem — vehicles, parts, repair shops, business pages, training, and more.",
      },
      { property: "og:title", content: "365 Motor Sales — Built for the Philippines" },
      {
        property: "og:description",
        content:
          "One marketplace for vehicles, equipment, parts, repair shops, and motor businesses across the Philippines.",
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

const VISITS_KEY = (code: string) => `mref_visits_${code}`;

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
    (async () => {
      const visitorId = getVisitorId();
      const ua = navigator.userAgent;
      const { data, error } = await (supabase.rpc as any)("record_qr_scan", {
        _code: code,
        _visitor_id: visitorId,
        _user_agent: ua,
        _landing: `${siteOrigin()}${window.location.pathname}${window.location.search}`,
      });
      if (error || !data?.ok) {
        setActive(false);
        setLoading(false);
        return;
      }
      setStaffName(data.first_name || data.staff_name || null);
      setActive(Boolean(data.active));
      setCounted(data.active ? Boolean(data.counted) : null);
      if (data.active) recordTouch(code);

      try {
        const raw = localStorage.getItem(VISITS_KEY(code));
        const prev = raw ? JSON.parse(raw) : { count: 0, first: null as string | null };
        const next = {
          count: (prev.count || 0) + 1,
          first: prev.first || new Date().toISOString(),
        };
        localStorage.setItem(VISITS_KEY(code), JSON.stringify(next));
        setVisitCount(next.count);
        setFirstSeenAt(next.first);
      } catch {
        setVisitCount(1);
      }

      // Referrer contact (public, security-definer RPC)
      const { data: contact } = await (supabase.rpc as any)("get_referrer_contact", {
        _code: code,
      });
      const first = Array.isArray(contact) ? contact[0] : contact;
      if (first?.email) setStaffEmail(first.email);
      if (first?.full_name && !data.first_name && !data.staff_name) {
        setStaffName(first.full_name);
      }

      // Look up the staff_referral_id, then load active promos.
      const sb = supabase as any;
      const { data: staff } = await sb
        .from("staff_referrals")
        .select("id")
        .eq("referral_code", code)
        .maybeSingle();
      if (staff?.id) {
        const nowIso = new Date().toISOString();
        const { data: pr } = await sb
          .from("staff_promotions")
          .select(
            "id,title,description,kind,percent_off,flat_amount_php,applies_to,ends_at,terms,starts_at,active",
          )
          .eq("staff_referral_id", staff.id)
          .eq("active", true);
        const filtered = ((pr as any[]) || []).filter(
          (p) => (!p.starts_at || p.starts_at <= nowIso) && (!p.ends_at || p.ends_at >= nowIso),
        );
        setPromos(filtered as Promo[]);
      }
      setLoading(false);
    })();
  }, [code]);

  const referrer = staffName || "Your referrer";
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
    <SiteLayout>
      <TooltipProvider delayDuration={150}>
        <div className="container mx-auto max-w-5xl px-4 py-10">
          {loading ? (
            <p className="text-center text-muted-foreground">Loading…</p>
          ) : active === false ? (
            <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-8 text-center">
              <h1 className="font-display text-2xl font-bold">Referral link unavailable</h1>
              <p className="mt-2 text-muted-foreground">
                This referral code isn't active. You can still create an account and browse.
              </p>
              <Button className="mt-6" onClick={() => navigate({ to: "/" })}>
                Continue to site
              </Button>
            </div>
          ) : (
            <>
              {/* 1. Referral credit card (top) */}
              <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Referred by
                    </p>
                    <h1 className="font-display mt-1 text-2xl font-bold sm:text-3xl">
                      {referrer} sent you here
                    </h1>
                  </div>
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
                      <TooltipContent side="bottom" align="end" className="max-w-[260px] text-xs">
                        {counted ? (
                          <p>
                            First scan from this device — counted toward {referrer}'s stats.
                            Repeat visits won't inflate their numbers.
                          </p>
                        ) : (
                          <p>
                            You've already scanned this code from this device. We don't count
                            repeat scans, so {referrer}'s stats stay accurate.
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                <p className="mt-2 text-muted-foreground">
                  {counted === false
                    ? `Welcome back! Your original visit is still credited to ${referrer}.`
                    : `Your visit is credited to ${referrer}. Sign up in this browser within 90 days and they'll receive credit for your account.`}
                </p>

                {visitCount > 0 && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {visitCount === 1 ? (
                        <>This is your first visit to this referral page.</>
                      ) : (
                        <>
                          You've opened this page{" "}
                          <strong className="text-foreground">{visitCount}</strong> times
                          {firstSeenAt ? (
                            <> since {new Date(firstSeenAt).toLocaleDateString()}</>
                          ) : null}
                          . Only the first scan counts toward stats.
                        </>
                      )}
                    </span>
                  </div>
                )}

                {promos.length > 0 && (
                  <div className="mt-6">
                    <h2 className="font-display text-lg font-semibold">Active offers</h2>
                    <ul className="mt-3 space-y-3">
                      {promos.map((p) => (
                        <li key={p.id} className="rounded-lg border border-border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-semibold">{p.title}</div>
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs uppercase">
                              {p.kind}
                            </span>
                          </div>
                          {p.description && (
                            <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                          )}
                          <div className="mt-2 text-sm">
                            {p.percent_off ? (
                              <span className="font-semibold">{p.percent_off}% off</span>
                            ) : null}
                            {p.flat_amount_php ? (
                              <span className="font-semibold">₱{p.flat_amount_php}</span>
                            ) : null}
                            {(p.percent_off || p.flat_amount_php) && (
                              <span className="text-muted-foreground">
                                {" "}
                                · applies to {p.applies_to}
                              </span>
                            )}
                          </div>
                          {p.ends_at && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Ends {new Date(p.ends_at).toLocaleDateString()}
                            </p>
                          )}
                          {p.terms && (
                            <p className="mt-1 text-xs text-muted-foreground">{p.terms}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={() => navigate({ to: "/signup" })}>Create an account</Button>
                  <Button variant="outline" onClick={() => navigate({ to: "/" })}>
                    Browse listings
                  </Button>
                  <Button variant="outline" onClick={() => navigate({ to: "/businesses" })}>
                    Partner your business
                  </Button>
                </div>
                {contactLine && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Contact {referrer}: {contactLine}
                  </p>
                )}
              </div>

              {/* 2. Hero */}
              <section className="mx-auto mt-14 max-w-3xl text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  365 Motor Sales
                </p>
                <h2 className="font-display mt-3 text-3xl font-bold leading-tight sm:text-5xl">
                  The Motor Marketplace Built for the Philippines
                </h2>
                <p className="mt-4 text-lg font-medium text-muted-foreground">
                  Buy. Sell. List. Partner. Learn. Play.
                </p>
                <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                  365 Motor Sales is more than a vehicle listing website. We are building a
                  dedicated motor ecosystem for the Philippines — connecting vehicles,
                  motorcycles, trucks, equipment, parts suppliers, repair shops, service
                  businesses, education, and future mobile game engagement into one growing
                  network.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button size="lg" onClick={() => navigate({ to: "/listings/new" } as any)}>
                    List With 365 Motor Sales
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate({ to: "/businesses" })}
                  >
                    Partner Your Business With Us
                  </Button>
                </div>
                {contactLine && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Reach the 365 team via {referrer}: {contactLine}
                  </p>
                )}
              </section>

              {/* 3. Why 365 Is Different */}
              <section className="mt-16">
                <h2 className="font-display text-center text-2xl font-bold sm:text-3xl">
                  Why 365 Is Different
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
                  Most online selling spaces are built as general posting feeds. They're fast,
                  but they aren't built specifically for the motor industry.
                </p>
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="font-display flex items-center gap-2 text-lg font-semibold text-muted-foreground">
                      <XCircle className="h-5 w-5" />
                      Generic social feeds
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {[
                        "Posts that disappear quickly",
                        "Poor search structure",
                        "Weak category organization",
                        "Limited business identity",
                        "No built-in shop tools",
                        "No parts ordering pathway",
                        "No education layer",
                        "No long-term vehicle or business ecosystem",
                      ].map((t) => (
                        <li key={t} className="flex gap-2">
                          <span className="text-muted-foreground/60">—</span>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
                    <h3 className="font-display flex items-center gap-2 text-lg font-semibold text-primary">
                      <CheckCircle className="h-5 w-5" />
                      365 Motor Sales
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm">
                      {[
                        "Vehicle and equipment listings",
                        "Motor business pages",
                        "Parts supplier visibility",
                        "Shop and service networking",
                        "Future online parts ordering",
                        "Future shop management software",
                        "Skills education and training",
                        "Mobile game and attention-building systems",
                        "Philippines-first rollout with global expansion potential",
                      ].map((t) => (
                        <li key={t} className="flex gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* 4. What You Can List */}
              <section className="mt-16">
                <h2 className="font-display text-center text-2xl font-bold sm:text-3xl">
                  What You Can List
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
                  365 Motor Sales is built for the full motor economy.
                </p>
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="font-display flex items-center gap-2 text-lg font-semibold">
                      <Car className="h-5 w-5 text-primary" />
                      Vehicle Listings
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      {[
                        "Cars",
                        "Motorcycles",
                        "Trucks",
                        "Vans",
                        "Heavy equipment",
                        "Farm equipment",
                        "Construction equipment",
                        "Marine & small engine",
                      ].map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-border bg-background px-3 py-1"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="font-display flex items-center gap-2 text-lg font-semibold">
                      <Building2 className="h-5 w-5 text-primary" />
                      Business Listings
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      {[
                        "Tire repair / vulcanizing",
                        "Car wash",
                        "Auto repair",
                        "Motorcycle repair",
                        "Aircon repair",
                        "Towing",
                        "Driving schools",
                        "Insurance",
                        "Parts stores",
                        "Battery shops",
                        "Accessories",
                        "Wraps & signage",
                        "Detailing",
                        "Salvage yards",
                        "Equipment service",
                      ].map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-border bg-background px-3 py-1"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* 5. Business Network Advantage */}
              <section className="mx-auto mt-16 max-w-3xl rounded-xl border border-border bg-card p-8 text-center">
                <h2 className="font-display text-2xl font-bold sm:text-3xl">
                  The Business Network Advantage
                </h2>
                <p className="mt-3 text-muted-foreground">
                  A buyer looking for a vehicle may also need insurance, financing, inspection,
                  tires, repairs, accessories, towing, detailing, registration help, or parts. A
                  shop may need customers, parts suppliers, digital tools, training, and online
                  visibility. 365 Motor Sales connects these opportunities in one ecosystem.
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  Your business page becomes your digital storefront — services, photos,
                  contact, location, special offers, category, future reviews, and future
                  booking tools.
                </p>
              </section>

              {/* 6. Coming Soon */}
              <section className="mt-16">
                <h2 className="font-display text-center text-2xl font-bold sm:text-3xl">
                  Coming Soon
                </h2>
                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  {[
                    {
                      icon: Package,
                      title: "Online Parts Ordering",
                      bullets: [
                        "Online parts listings",
                        "Supplier pages",
                        "Fitment notes",
                        "Quote requests",
                        "Shop procurement tools",
                        "Direct customer ordering",
                        "Future salvage-yard inventory network",
                      ],
                    },
                    {
                      icon: Wrench,
                      title: "Shop Management Software",
                      bullets: [
                        "Customer records",
                        "Job cards & estimates",
                        "Invoices",
                        "Digital inspections",
                        "Parts & inventory tracking",
                        "Service reminders",
                        "Staff workflow & sales tracking",
                      ],
                    },
                    {
                      icon: GraduationCap,
                      title: "Education & Skills Training",
                      bullets: [
                        "Automotive & motorcycle basics",
                        "Diagnostic thinking",
                        "Electrical fundamentals",
                        "Parts identification",
                        "Shop safety & customer service",
                        "Business startup basics",
                        "Canadian Red Seal-level technician knowledge",
                      ],
                    },
                  ].map(({ icon: Icon, title, bullets }) => (
                    <div key={title} className="rounded-xl border border-border bg-card p-6">
                      <div className="flex items-center justify-between gap-2">
                        <Icon className="h-6 w-6 text-primary" />
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                          Coming soon
                        </span>
                      </div>
                      <h3 className="font-display mt-3 text-lg font-semibold">{title}</h3>
                      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                        {bullets.map((b) => (
                          <li key={b} className="flex gap-2">
                            <span className="text-primary/70">•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              {/* 7. Mobile Game Ecosystem */}
              <section className="mx-auto mt-16 max-w-4xl rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-8">
                <div className="flex flex-col items-start gap-4 sm:flex-row">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <Gamepad2 className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      Upcoming
                    </span>
                    <h2 className="font-display mt-2 text-2xl font-bold sm:text-3xl">
                      Mobile Game Ecosystem
                    </h2>
                    <p className="mt-2 text-muted-foreground">
                      The upcoming 365 companion garage game — idle racing, merge mechanics,
                      garage upgrades, route problems, and more.
                    </p>
                    <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-card px-3 py-1.5 text-sm font-semibold">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Earn freebies and add boosts
                    </p>
                    <ul className="mt-4 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
                      {[
                        "Brand awareness",
                        "Automotive learning",
                        "Parts education",
                        "Vehicle upgrade concepts",
                        "Sponsor opportunities",
                        "Rewards & digital collectibles",
                      ].map((t) => (
                        <li key={t} className="flex gap-2">
                          <span className="text-primary/70">•</span>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* 8. Built for the Philippines First */}
              <section className="mt-16">
                <div className="flex items-center justify-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-center text-2xl font-bold sm:text-3xl">
                    Built for the Philippines First
                  </h2>
                </div>
                <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
                  The opportunity is organizing the full motor economy — sellers, buyers,
                  dealers, shops, parts suppliers, towing, insurance, driving schools,
                  equipment owners, mechanics, students, teachers, game users, and future
                  exporters.
                </p>
              </section>

              {/* 9. Final CTA */}
              <section className="mt-16 rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
                <h2 className="font-display text-2xl font-bold sm:text-3xl">
                  Join the 365 Motor Sales Network
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                  Whether you sell vehicles, repair motorcycles, wash cars, tow trucks, teach
                  driving, sell parts, manage a shop, or want to partner with the platform —
                  365 Motor Sales is being built for you.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button size="lg" onClick={() => navigate({ to: "/listings/new" } as any)}>
                    List a vehicle
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate({ to: "/businesses" })}
                  >
                    List a business
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate({ to: "/" })}>
                    Browse listings
                  </Button>
                </div>
                <p className="mt-6 text-sm text-muted-foreground">
                  Website:{" "}
                  <a href="https://365motorsales.com" className="font-medium text-primary hover:underline">
                    365motorsales.com
                  </a>
                </p>
                {contactLine && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Contact {referrer}: {contactLine}
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </TooltipProvider>
    </SiteLayout>
  );
}
