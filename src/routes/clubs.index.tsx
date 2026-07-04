import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileCheck2, Rocket, Search, ShieldCheck, Sparkles, Users } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClubCard, type ClubCardData } from "@/components/clubs/club-card";
import { ClubDiscountExplainer } from "@/components/clubs/club-discount-explainer";
import { listActiveClubDiscountPromotions } from "@/lib/club-discount-promotions.functions";


export const Route = createFileRoute("/clubs/")({
  head: () => ({
    meta: [
      { title: "Clubs — Verified riding & car clubs | 365 MotorSales" },
      {
        name: "description",
        content:
          "Find and join accredited motorcycle riding clubs, car clubs, and off-road groups. Every club is verified with formal documentation (LTO, SEC, DTI).",
      },
      { property: "og:title", content: "Clubs — Verified riding & car clubs" },
      {
        property: "og:description",
        content: "Accredited motoring clubs in the Philippines. Members, events, group rides.",
      },
      { property: "og:url", content: "https://www.365motorsales.com/clubs" },
    ],
    links: [{ rel: "canonical", href: "https://www.365motorsales.com/clubs" }],
  }),
  loader: async () => ({
    clubPromotions: await listActiveClubDiscountPromotions(),
  }),
  component: ClubsIndexPage,
});

const TYPES = [
  { value: "all", label: "All clubs" },
  { value: "motorcycle_riding", label: "Motorcycle riding" },
  { value: "car_club", label: "Car club" },
  { value: "off_road", label: "Off-road" },
  { value: "truck_club", label: "Truck club" },
  { value: "brand_owners", label: "Brand owners" },
  { value: "general_motoring", label: "General motoring" },
  { value: "other", label: "Other" },
];

function ClubsIndexPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ClubCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = (supabase as any)
        .from("clubs")
        .select("id,slug,name,type,verified,logo_url,cover_url,member_count,region,city")
        .eq("status", "active");
      if (type !== "all") query = query.eq("type", type);
      if (verifiedOnly) query = query.eq("verified", true);
      query = query.order("member_count", { ascending: false }).limit(120);
      const { data } = await query;
      setRows((data ?? []) as ClubCardData[]);
      setLoading(false);
    })();
  }, [type, verifiedOnly]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.name, r.city ?? "", r.region ?? ""].join(" ").toLowerCase().includes(term),
    );
  }, [q, rows]);

  return (
    <SiteLayout>
      <div className="bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <Sparkles className="h-4 w-4" /> Community
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Clubs</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Accredited motorcycle riding clubs, car clubs and motoring groups. Every club is
            reviewed with formal documentation — LTO accreditation, SEC / DTI registration or
            equivalent — so you know who you're riding with.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified members save 5% on 365 ads, boosts &amp; plans
            </div>
          </div>


          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, city, region…"
                className="pl-9"
              />
            </div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
              />
              Verified only
            </label>
            <Button onClick={() => navigate({ to: "/clubs/apply" })}>Apply for a club</Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto space-y-8 px-4 py-8">
        <section
          aria-labelledby="about-clubs-heading"
          className="rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <h2
            id="about-clubs-heading"
            className="font-display text-xl font-bold text-foreground sm:text-2xl"
          >
            About Clubs on 365 MotorSales
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            365 Clubs are formally accredited motoring groups — not open Facebook groups. Each one
            is reviewed by our team before it's published so members and the wider community can
            trust who they're riding with.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileCheck2 className="h-4 w-4 text-primary" /> Accredited only
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Every club submits formal documentation — LTO accreditation, SEC or DTI
                registration, or equivalent — and is approved by an admin before going live.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Users className="h-4 w-4 text-primary" /> Community + safety
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Riding clubs, car clubs, off-road crews and brand-owner communities. See member
                counts, region, upcoming events and RSVPs before you join.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" /> Verified member perks
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Members of a verified club unlock the 5% Club Member Discount on internal 365
                purchases. More perks are on the roadmap.
              </p>
            </div>
          </div>
        </section>

        <ClubDiscountExplainer promotions={Route.useLoaderData().clubPromotions} />

        <section
          aria-labelledby="start-club-heading"
          className="rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                <Rocket className="h-4 w-4" /> Start a club
              </div>
              <h2
                id="start-club-heading"
                className="mt-1 font-display text-xl font-bold text-foreground sm:text-2xl"
              >
                Get your club listed
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Three steps: submit your accreditation docs, wait for admin review, then publish
                your page and invite members. Applications are usually reviewed within a few
                business days.
              </p>
            </div>
            <Button onClick={() => navigate({ to: "/clubs/start" })}>Start a club</Button>
          </div>
        </section>


        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <h2 className="font-display text-xl font-semibold">No clubs yet</h2>
            <p className="mt-2 text-muted-foreground">
              Be the first accredited club on 365 MotorSales.
            </p>
            <Button asChild className="mt-4">
              <Link to="/clubs/apply">Apply for a club</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((c) => (
              <ClubCard key={c.id} club={c} />
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
