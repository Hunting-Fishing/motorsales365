import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles, ChevronRight, X as XIcon, ArrowRight } from "lucide-react";
import * as Icons from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ModuleSection } from "@/components/features/module-section";
import { ComparisonTable } from "@/components/features/comparison-table";
import {
  FEATURES,
  MODULES,
  type Feature,
  type FeatureModule,
  type FeatureStatus,
} from "@/data/features-catalog";
import { SHOP_SOFTWARE_MATRIX, MARKETPLACE_MATRIX } from "@/data/competitors-shop-software";
import { listLatestFeatureScreenshots } from "@/lib/feature-screenshots.functions";

export const Route = createFileRoute("/features")({
  component: FeaturesPage,
  loader: async () => {
    try {
      const { screenshots } = await listLatestFeatureScreenshots();
      return { screenshots };
    } catch {
      return { screenshots: {} as Record<string, any> };
    }
  },
  head: () => ({
    meta: [
      { title: "Features — 365 Motor Sales" },
      {
        name: "description",
        content:
          "Every feature 365 Motor Sales offers: marketplace, Shop Manager, parts network, franchise program, learning, dispatch, referrals, and more. Compared to Shopmonkey, Tekmetric, Carousell, OLX and others.",
      },
      { property: "og:title", content: "Features — 365 Motor Sales" },
      {
        property: "og:description",
        content:
          "Explore every feature — marketplace, Shop Manager, parts network, franchise, learning, dispatch, referrals. See how we match or beat global competitors.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://365motorsales.com/features" },
    ],
    links: [{ rel: "canonical", href: "https://365motorsales.com/features" }],
  }),
});


const STATUS_FILTERS: { id: "all" | FeatureStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "new", label: "New" },
  { id: "beta", label: "Beta" },
  { id: "roadmap", label: "Roadmap" },
];

function FeaturesPage() {
  const { screenshots } = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | FeatureStatus>("all");
  const [activeModules, setActiveModules] = useState<Set<FeatureModule>>(new Set());
  const [activeAnchor, setActiveAnchor] = useState<FeatureModule | null>(null);

  const liveCount = FEATURES.filter((f) => f.status !== "roadmap").length;
  const roadmapCount = FEATURES.filter((f) => f.status === "roadmap").length;

  // IntersectionObserver for sticky nav active state
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveAnchor(visible.target.id as FeatureModule);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );
    MODULES.forEach((m) => {
      const el = document.getElementById(m.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const filtered: Feature[] = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return FEATURES.filter((f) => {
      if (status !== "all" && f.status !== status) return false;
      if (activeModules.size > 0 && !activeModules.has(f.module)) return false;
      if (!needle) return true;
      return [f.name, f.pitch, f.howItWorks, ...f.whyUseful, ...f.vsCompetition]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [q, status, activeModules]);

  const liveByModule = useMemo(() => {
    const map: Record<FeatureModule, Feature[]> = {} as any;
    for (const f of filtered.filter((f) => f.status !== "roadmap")) {
      (map[f.module] ??= []).push(f);
    }
    return map;
  }, [filtered]);

  const roadmap = filtered.filter((f) => f.status === "roadmap");
  const hasResults = filtered.length > 0;

  const toggleModule = (id: FeatureModule) => {
    setActiveModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetFilters = () => {
    setQ("");
    setStatus("all");
    setActiveModules(new Set());
  };

  return (
    <div className="relative">
      {/* Aurora hero background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/50" />
        <div className="absolute -left-40 -top-32 h-[28rem] w-[28rem] rounded-full bg-primary/25 blur-[120px]" />
        <div className="absolute -right-40 top-10 h-[28rem] w-[28rem] rounded-full bg-emerald-500/20 blur-[120px]" />
        <div className="absolute left-1/3 top-40 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-[100px]" />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>


      <div className="mx-auto max-w-6xl px-4 py-10 md:py-16">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">Features</span>
        </nav>

        {/* Hero */}
        <header className="mb-10 max-w-3xl animate-fade-in">
          <Badge variant="outline" className="mb-4 gap-1 border-primary/30 bg-primary/5 text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Everything the app can do
          </Badge>
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-6xl">
            The complete{" "}
            <span className="bg-gradient-to-r from-primary via-primary to-emerald-500 bg-clip-text text-transparent">
              365 Motor Sales
            </span>{" "}
            feature guide
          </h1>
          <p className="mt-4 text-lg text-muted-foreground md:text-xl">
            A single platform for the entire motor industry — marketplace, shop
            management, cross-shop parts network, franchise program, learning,
            dispatch, and more. Compare us to any competitor, category by
            category.
          </p>

          {/* Stat pills */}
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
              {liveCount} live features
            </span>
            <span className="rounded-full border bg-card px-3 py-1.5 text-sm font-medium">
              {roadmapCount} on the roadmap
            </span>
            <span className="rounded-full border bg-card px-3 py-1.5 text-sm font-medium">
              {MODULES.length} product areas
            </span>
          </div>

          {/* Hero CTAs */}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Start free <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#compare">
                Compare vs competitors <ChevronRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/pricing">See pricing</Link>
            </Button>
          </div>
        </header>

        {/* Competitive comparison — surfaced at the top so buyers can eyeball parity before the feature deep-dive */}
        <section id="compare" className="mb-14 scroll-mt-32">
          <div className="mb-6">
            <Badge variant="outline" className="mb-2">
              Head-to-head
            </Badge>
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              How we compare
            </h2>
            <p className="mt-2 text-muted-foreground">
              Feature-by-feature checks against the tools shops and buyers actually
              use today. Scroll past this for the full capability catalog.
            </p>
          </div>

          <Tabs defaultValue="shop">
            <TabsList>
              <TabsTrigger value="shop">vs Shop software</TabsTrigger>
              <TabsTrigger value="marketplace">vs Marketplaces</TabsTrigger>
            </TabsList>
            <TabsContent value="shop" className="mt-4">
              <ComparisonTable matrix={SHOP_SOFTWARE_MATRIX} />
              <p className="mt-3 text-xs text-muted-foreground">
                Legend: ✓ full support · − partial · ✗ not available. Hover a cell
                for detail where relevant. Sourced from each competitor's public
                product pages.
              </p>
            </TabsContent>
            <TabsContent value="marketplace" className="mt-4">
              <ComparisonTable matrix={MARKETPLACE_MATRIX} />
              <p className="mt-3 text-xs text-muted-foreground">
                Compared with the classifieds and marketplaces PH buyers use most.
              </p>
            </TabsContent>
          </Tabs>
        </section>

        {/* Sticky filter bar */}
        <div className="sticky top-16 z-30 -mx-4 mb-8 border-y bg-background/85 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/70">

          <div className="flex flex-col gap-3">
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search 30+ features…"
                  className="pl-9 pr-9"
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="inline-flex rounded-md border bg-card p-0.5 text-xs">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatus(s.id)}
                    className={`rounded px-3 py-1.5 font-medium transition-colors ${
                      status === s.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Module chips */}
            <div className="flex flex-wrap gap-1.5 overflow-x-auto">
              {MODULES.map((m) => {
                const Icon = (Icons as any)[m.icon] ?? Icons.Star;
                const isActive = activeModules.has(m.id);
                const isCurrent = activeAnchor === m.id && activeModules.size === 0;
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleModule(m.id)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : isCurrent
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {m.label}
                  </button>
                );
              })}
              {(activeModules.size > 0 || status !== "all" || q) && (
                <button
                  onClick={resetFilters}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed px-3 py-1 text-xs font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                >
                  <XIcon className="h-3 w-3" /> Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live features by module or empty state */}
        {!hasResults ? (
          <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold">No features match</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try clearing filters or a different search term.
            </p>
            <Button onClick={resetFilters} className="mt-4" variant="outline">
              Reset filters
            </Button>
          </div>
        ) : (
          <div className="space-y-14">
            {MODULES.map((m, i) => (
              <div
                key={m.id}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <ModuleSection moduleId={m.id} features={liveByModule[m.id] ?? []} screenshots={screenshots} />
              </div>
            ))}
          </div>
        )}

        {/* Roadmap */}
        {roadmap.length > 0 && (
          <section className="mt-20">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <Badge variant="outline" className="mb-2 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  Coming soon
                </Badge>
                <h2 className="font-display text-3xl font-bold tracking-tight">
                  Upcoming features
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {roadmap.length} in flight — sign up to be the first to try each release.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {roadmap.map((f) => (
                <Card
                  key={f.id}
                  className="group relative overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                >
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500/60 via-primary/60 to-emerald-500/60" />
                  <Badge variant="outline" className="mb-2 text-xs">
                    Roadmap
                  </Badge>
                  <h3 className="font-semibold group-hover:text-primary">{f.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.pitch}</p>
                  <p className="mt-3 text-sm leading-relaxed">{f.howItWorks}</p>
                </Card>
              ))}
            </div>
          </section>
        )}




        {/* CTA */}
        <section className="mt-24 overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-background to-emerald-500/10 p-8 text-center md:p-14">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10 text-primary">
            <Sparkles className="mr-1 h-3.5 w-3.5" /> Ready when you are
          </Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Try every feature — free to start
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Post a listing, join the parts network, or take Shop Manager for a spin.
            No credit card required.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Create free account</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/pricing">See pricing</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/franchise">Franchise a shop</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
