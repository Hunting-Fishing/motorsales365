import { ExternalLink, Sparkles, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Sponsored "Business Ready" automotive course rail for /learn.
 * Source: https://www.learntoday.work/courses (Automotive, Repair & Servicing tab).
 * These are external sponsored courses — clicks open learntoday.work in a new tab.
 */

type BRCourse = {
  title: string;
  slug: string;
  summary: string;
  modules: number;
};

const BUSINESS_READY_AUTOMOTIVE: BRCourse[] = [
  {
    title: "Car Aircon Cleaning & Freon Refill (PH)",
    slug: "car-aircon-service-ph",
    summary:
      "Specialize in vehicle aircon: evaporator cleaning, blower service, R134a / R1234yf refill, and leak checks for taxis, Grab cars, and family sedans.",
    modules: 10,
  },
  {
    title: "Mobile Oil Change & PMS Service (PH)",
    slug: "mobile-oil-change-ph",
    summary:
      "Bring oil change and preventive maintenance (PMS) to tricycle terminals, motorcycle taxi stands, and subdivisions on a single motorbike with a service crate.",
    modules: 10,
  },
  {
    title: "Motorcycle Battery Reconditioning & Sales (PH)",
    slug: "battery-reconditioning-ph",
    summary:
      "Buy dead motorcycle and car batteries by the kilo, recondition the salvageable ones, and resell with a short warranty. Scrap the rest.",
    modules: 10,
  },
  {
    title: "Motorcycle Mechanic Shop (PH)",
    slug: "motorcycle-mechanic-ph",
    summary:
      "Run a neighborhood motor shop serving habal-habal riders, tricycle drivers, and daily commuters on Honda, Yamaha, Kawasaki, and Suzuki underbones and scooters.",
    modules: 10,
  },
  {
    title: "Roadside Assistance & Jumpstart Service (PH)",
    slug: "roadside-assist-ph",
    summary:
      "Run a one-man 24/7 roadside service on a motorcycle: jumpstart, tire change, fuel delivery, lockout help for stranded drivers.",
    modules: 10,
  },
  {
    title: "Roadside Car Wash & Detailing (PH)",
    slug: "car-wash-detailing-ph",
    summary:
      "Set up a barangay car wash with a motorcycle 'labahan' lane. Bucket-and-hose start, upsell to wax, vacuum, and interior detail.",
    modules: 10,
  },
  {
    title: "Tricycle Sidecar Fabrication & Repair (PH)",
    slug: "tricycle-sidecar-ph",
    summary:
      "Weld and assemble tricycle sidecars (kuliglig & passenger types), and run a repair line for crash damage, frame straightening, and repaint.",
    modules: 10,
  },
  {
    title: "Vulcanizing Shop — Tire Repair (PH)",
    slug: "vulcanizing-shop-ph",
    summary:
      "Open a sidewalk vulcanizing stall serving tricycles, motorcycles, jeepneys, and cars. Patch tubes, plug tubeless, balance tires, swap second-hand 'surplus' rubber.",
    modules: 10,
  },
  {
    title: "Window Tinting & Car Accessories Stall (PH)",
    slug: "window-tinting-ph",
    summary:
      "Set up a small tinting bay plus accessories shelf (seat covers, mats, dashcams, LED bulbs). Walk-in and Facebook-booked jobs.",
    modules: 10,
  },
];

export function BusinessReadyRail({ className }: { className?: string }) {
  return (
    <section className={className} aria-labelledby="business-ready-heading">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span id="business-ready-heading">Business Ready — Automotive Courses</span>
        <Badge variant="secondary" className="text-[10px] normal-case tracking-normal">
          Sponsored
        </Badge>
        <a
          href="https://www.learntoday.work/courses"
          target="_blank"
          rel="nofollow sponsored noreferrer"
          className="ml-auto text-[10px] font-medium normal-case tracking-normal text-primary hover:underline"
        >
          View all on learntoday.work →
        </a>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Hands-on Philippines-focused auto business playbooks from Business Ready.
        Courses open on learntoday.work.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BUSINESS_READY_AUTOMOTIVE.map((c) => (
          <a
            key={c.slug}
            href={`https://www.learntoday.work/courses/${c.slug}`}
            target="_blank"
            rel="nofollow sponsored noreferrer"
            className="group"
          >
            <Card className="flex h-full flex-col overflow-hidden border-2 border-primary/20 ring-1 ring-primary/5 transition-all hover:border-primary/40 hover:shadow-lg">
              <div className="flex items-start gap-3 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-primary/5">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      Automotive, Repair & Servicing
                    </Badge>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                  <h3 className="mt-2 font-semibold leading-tight">{c.title}</h3>
                  <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                    {c.summary}
                  </p>
                  <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {c.modules} modules
                  </p>
                </div>
              </div>
            </Card>
          </a>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Sponsored placements from Business Ready (learntoday.work). 365 MotorSales
        does not certify partner curricula — always verify before enrolling.
      </p>
    </section>
  );
}
