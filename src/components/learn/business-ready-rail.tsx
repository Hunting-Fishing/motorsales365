import { useEffect, useState } from "react";
import { ExternalLink, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import brLogo from "@/assets/business-ready-logo.png.asset.json";
import brCover from "@/assets/business-ready-cover.png.asset.json";

/**
 * Sponsored Business Ready brand panel for /learn.
 * Shows the Business Ready logo/cover alongside a rotating carousel of their
 * automotive courses. Individual full course cards are reserved for paid
 * promotional placements — until then we surface the program, not the catalog.
 * Source: https://www.learntoday.work/courses (Automotive, Repair & Servicing).
 */

type BRCourse = { title: string; slug: string; summary: string };

const BUSINESS_READY_AUTOMOTIVE: BRCourse[] = [
  { title: "Car Aircon Cleaning & Freon Refill (PH)", slug: "car-aircon-service-ph",
    summary: "Evaporator cleaning, blower service, R134a / R1234yf refill and leak checks for taxis, Grab cars and family sedans." },
  { title: "Mobile Oil Change & PMS Service (PH)", slug: "mobile-oil-change-ph",
    summary: "Bring oil change and preventive maintenance to tricycle terminals and subdivisions on a single motorbike with a service crate." },
  { title: "Motorcycle Battery Reconditioning & Sales (PH)", slug: "battery-reconditioning-ph",
    summary: "Buy dead batteries by the kilo, recondition the salvageable ones, and resell with a short warranty." },
  { title: "Motorcycle Mechanic Shop (PH)", slug: "motorcycle-mechanic-ph",
    summary: "Run a neighborhood motor shop serving habal-habal, tricycle drivers and commuters on Honda, Yamaha, Kawasaki and Suzuki." },
  { title: "Roadside Assistance & Jumpstart Service (PH)", slug: "roadside-assist-ph",
    summary: "One-man 24/7 roadside service on a motorcycle: jumpstart, tire change, fuel delivery and lockout help." },
  { title: "Roadside Car Wash & Detailing (PH)", slug: "car-wash-detailing-ph",
    summary: "Barangay car wash with a 'labahan' lane. Bucket-and-hose start, upsell to wax, vacuum and interior detail." },
  { title: "Tricycle Sidecar Fabrication & Repair (PH)", slug: "tricycle-sidecar-ph",
    summary: "Weld and assemble tricycle sidecars and run a repair line for crash damage, frame straightening and repaint." },
  { title: "Vulcanizing Shop — Tire Repair (PH)", slug: "vulcanizing-shop-ph",
    summary: "Sidewalk vulcanizing stall for tricycles, motorcycles, jeepneys and cars. Patch, plug, balance and surplus rubber." },
  { title: "Window Tinting & Car Accessories Stall (PH)", slug: "window-tinting-ph",
    summary: "Small tinting bay plus accessories shelf — seat covers, mats, dashcams, LED bulbs. Walk-ins and Facebook bookings." },
];

const ROTATE_MS = 5000;

export function BusinessReadyRail({ className }: { className?: string }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = BUSINESS_READY_AUTOMOTIVE.length;

  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => setIdx((i) => (i + 1) % total), ROTATE_MS);
    return () => window.clearInterval(t);
  }, [paused, total]);

  const current = BUSINESS_READY_AUTOMOTIVE[idx];
  const prev = () => setIdx((i) => (i - 1 + total) % total);
  const next = () => setIdx((i) => (i + 1) % total);

  return (
    <section className={className} aria-labelledby="business-ready-heading">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span id="business-ready-heading">Featured Partner</span>
        <Badge variant="secondary" className="text-[10px] normal-case tracking-normal">
          Sponsored
        </Badge>
      </div>

      <Card
        className="relative overflow-hidden border-2 border-primary/20 ring-1 ring-primary/5"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Full-bleed banner background */}
        <img
          src={brCover.url}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/95 via-background/75 to-background/85" />

        <div className="relative grid grid-cols-1 md:grid-cols-[260px_1fr]">
          {/* Brand panel */}
          <a
            href="https://www.learntoday.work/courses"
            target="_blank"
            rel="nofollow sponsored noreferrer"
            className="group relative flex flex-col items-center justify-center gap-3 overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 text-center"
          >
            <img
              src={brCover.url}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-10 transition-opacity group-hover:opacity-20"
              loading="lazy"
            />
            <img
              src={brLogo.url}
              alt="Business Ready"
              className="relative h-20 w-20 rounded-xl border bg-background object-contain p-2 shadow-sm"
              loading="lazy"
            />
            <div className="relative">
              <p className="font-display text-lg font-bold leading-tight">Business Ready</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Small Business Startups
              </p>
            </div>
            <span className="relative inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:underline">
              Visit learntoday.work <ExternalLink className="h-3 w-3" />
            </span>
          </a>

          {/* Carousel */}
          <div className="flex flex-col p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Automotive course library · {total} courses
              </p>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={prev}
                  aria-label="Previous course"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={next}
                  aria-label="Next course"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <a
              key={current.slug}
              href={`https://www.learntoday.work/courses/${current.slug}`}
              target="_blank"
              rel="nofollow sponsored noreferrer"
              className="group flex flex-1 flex-col justify-center rounded-lg border bg-card/50 p-4 transition-colors hover:border-primary/40 hover:bg-card animate-in fade-in slide-in-from-right-2 duration-500"
            >
              <Badge variant="outline" className="w-fit text-[10px]">
                Automotive, Repair & Servicing
              </Badge>
              <h3 className="mt-2 font-semibold leading-tight group-hover:text-primary">
                {current.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {current.summary}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                View course <ExternalLink className="h-3 w-3" />
              </span>
            </a>

            {/* Dots */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              {BUSINESS_READY_AUTOMOTIVE.map((c, i) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`Show ${c.title}`}
                  aria-current={i === idx}
                  className={`h-1.5 rounded-full transition-all ${
                    i === idx ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>

      <p className="mt-2 text-[10px] text-muted-foreground">
        Sponsored partner placement. Individual course cards are available as paid
        promotional ad space — contact us to feature specific courses.
      </p>
    </section>
  );
}
