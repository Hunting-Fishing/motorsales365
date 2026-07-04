import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Car,
  CheckCircle2,
  FileCheck2,
  MapPin,
  Mountain,
  Package,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const CLUB_TYPE_VALUES = [
  "motorcycle_riding",
  "car_club",
  "off_road",
  "truck_club",
  "brand_owners",
  "general_motoring",
  "other",
] as const;

const searchSchema = z.object({
  step: z.enum(["role", "join", "type", "details"]).optional(),
  role: z.enum(["member", "organizer"]).optional(),
  type: z.enum(CLUB_TYPE_VALUES).optional(),
});


export const Route = createFileRoute("/clubs/start")({
  head: () => ({
    meta: [
      { title: "Start a Club — 365 MotorSales" },
      {
        name: "description",
        content:
          "Guided signup to join or register an accredited motoring club on 365 MotorSales.",
      },
      { property: "og:title", content: "Start a Club — 365 MotorSales" },
      {
        property: "og:description",
        content:
          "Join an accredited motoring club or register your own. Verified with formal documentation.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.365motorsales.com/clubs/start" }],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: StartClubPage,
});

const CLUB_TYPES = [
  {
    value: "motorcycle_riding",
    label: "Motorcycle riding club",
    hint: "LTO-accredited riding groups, chapters, brand rider clubs",
    icon: Bike,
  },
  {
    value: "car_club",
    label: "Car club",
    hint: "Enthusiast owners' groups, marque clubs, tuner scenes",
    icon: Car,
  },
  {
    value: "off_road",
    label: "Off-road / 4x4",
    hint: "Overlanding, trail runs, adventure crews",
    icon: Mountain,
  },
  { value: "truck_club", label: "Truck club", hint: "Fleet owners, haulers, lifted trucks", icon: Truck },
  {
    value: "brand_owners",
    label: "Brand owners' community",
    hint: "Single-brand or single-model owner communities",
    icon: Package,
  },
  {
    value: "general_motoring",
    label: "General motoring",
    hint: "Mixed motoring, meetups, multi-discipline groups",
    icon: Users,
  },
  { value: "other", label: "Other", hint: "Something else — tell us in the description", icon: Sparkles },
] as const;

function StartClubPage() {
  const navigate = useNavigate({ from: "/clubs/start" });
  const search = Route.useSearch();
  const step = search.step ?? "role";
  const role = search.role;

  return (
    <SiteLayout>
      <div className="bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <Rocket className="h-4 w-4" /> Get started
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Clubs on 365</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Every club on 365 MotorSales is formally accredited. This short flow points you to the
            right place — whether you want to join a club or register one.
          </p>
          <Stepper step={step} role={role} />
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-8">
        {step === "role" && (
          <RoleStep
            onPick={(picked) =>
              navigate({
                search: {
                  role: picked,
                  step: picked === "member" ? "join" : "type",
                },
              })
            }
          />
        )}
        {step === "join" && (
          <JoinStep onBack={() => navigate({ search: { step: "role" } })} />
        )}
        {step === "type" && (
          <TypeStep
            initialType={search.type}
            onBack={() => navigate({ search: { step: "role" } })}
            onContinue={(type) =>
              navigate({ search: { step: "details", role: "organizer", type } })
            }
          />
        )}
        {step === "details" && (
          <DetailsStep
            type={search.type}
            onBack={() =>
              navigate({ search: { step: "type", role: "organizer", type: search.type } })
            }
          />
        )}
      </div>
    </SiteLayout>
  );
}

function Stepper({
  step,
  role,
}: {
  step: "role" | "join" | "type" | "details";
  role?: "member" | "organizer";
}) {
  const items =
    role === "organizer"
      ? [
          { key: "role", label: "Your role" },
          { key: "type", label: "Club type" },
          { key: "details", label: "Basic details" },
          { key: "done", label: "Upload docs & submit" },
        ]
      : role === "member"
        ? [
            { key: "role", label: "Your role" },
            { key: "join", label: "Find a club" },
            { key: "done", label: "Join" },
          ]
        : [
            { key: "role", label: "Your role" },
            { key: "next", label: "Next step" },
            { key: "done", label: "Submit" },
          ];
  const activeIdx =
    step === "role" ? 0 : step === "type" || step === "join" ? 1 : step === "details" ? 2 : 3;

  return (
    <ol className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
      {items.map((it, i) => (
        <li key={it.key} className="flex items-center gap-2">
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
              i < activeIdx
                ? "bg-emerald-600 text-white"
                : i === activeIdx
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {i < activeIdx ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
          </span>
          <span
            className={
              i === activeIdx ? "font-semibold text-foreground" : "text-muted-foreground"
            }
          >
            {it.label}
          </span>
          {i < items.length - 1 && <span className="text-muted-foreground/40">›</span>}
        </li>
      ))}
    </ol>
  );
}

function RoleStep({ onPick }: { onPick: (role: "member" | "organizer") => void }) {
  return (
    <section aria-labelledby="role-heading" className="space-y-4">
      <h2 id="role-heading" className="font-display text-xl font-semibold">
        What brings you here?
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onPick("member")}
          className="group rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary hover:shadow-sm"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Users className="h-4 w-4" /> I want to join a club
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Find accredited motorcycle, car, off-road or truck clubs near you. Verified members
            unlock the 5% Club Member Discount on internal 365 purchases.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:underline">
            Find a club <ArrowRight className="h-4 w-4" />
          </span>
        </button>
        <button
          type="button"
          onClick={() => onPick("organizer")}
          className="group rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary hover:shadow-sm"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Rocket className="h-4 w-4" /> I want to register my club
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Officers and organizers: submit your accreditation docs (LTO / SEC / DTI or
            equivalent), get admin-verified, then invite members.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:underline">
            Register a club <ArrowRight className="h-4 w-4" />
          </span>
        </button>
      </div>
    </section>
  );
}

function JoinStep({ onBack }: { onBack: () => void }) {
  return (
    <section aria-labelledby="join-heading" className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <h2 id="join-heading" className="font-display text-xl font-semibold">
        Find a club to join
      </h2>
      <p className="text-sm text-muted-foreground">
        Browse verified clubs, pick one that fits, then request to join from the club page. Once
        the club admin accepts you, you'll unlock the 5% Club Member Discount.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/clubs"
          className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Search className="h-4 w-4 text-primary" /> Browse the club directory
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Filter by club type, region, city, and verified-only.
          </p>
        </Link>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" /> How verification works
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Every club submits formal docs (LTO / SEC / DTI). Admins review before it goes live.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <Sparkles className="h-4 w-4" /> Member perk
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Verified club members automatically save 5% on 365 ads, boosts, bundles, subscription
          plans and Passport Premium at checkout — no code needed.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/clubs">Browse clubs</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/clubs/start" search={{ step: "type", role: "organizer" } as any}>
            Actually, I want to register a club
          </Link>
        </Button>
      </div>
    </section>
  );
}

function TypeStep({ onBack }: { onBack: () => void }) {
  const [type, setType] = useState<string | null>(null);
  return (
    <section aria-labelledby="type-heading" className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <h2 id="type-heading" className="font-display text-xl font-semibold">
        What type of club are you registering?
      </h2>
      <p className="text-sm text-muted-foreground">
        This helps members find you. You can refine details on the next step.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {CLUB_TYPES.map((t) => {
          const Icon = t.icon;
          const active = type === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`rounded-xl border p-4 text-left transition ${
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Icon className="h-4 w-4 text-primary" /> {t.label}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t.hint}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <FileCheck2 className="h-4 w-4" /> You'll need one of these documents ready
        </div>
        <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
          <li>LTO Accreditation (for riding clubs)</li>
          <li>SEC Certificate of Incorporation</li>
          <li>DTI registration / Business Permit</li>
          <li>Other formal document (admin discretion)</li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {type ? (
          <Badge variant="secondary">
            Selected: {CLUB_TYPES.find((t) => t.value === type)?.label}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Pick a type to continue</span>
        )}
        <Button asChild disabled={!type}>
          <Link
            to="/clubs/apply"
            search={type ? ({ type } as any) : undefined}
          >
            Continue to application <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
