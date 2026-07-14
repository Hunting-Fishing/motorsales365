import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Sparkles, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ModuleSection } from "@/components/features/module-section";
import { ComparisonTable } from "@/components/features/comparison-table";
import { FEATURES, MODULES, type FeatureModule } from "@/data/features-catalog";
import { SHOP_SOFTWARE_MATRIX, MARKETPLACE_MATRIX } from "@/data/competitors-shop-software";

export const Route = createFileRoute("/features")({
  component: FeaturesPage,
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

function FeaturesPage() {
  const [q, setQ] = useState("");

  const liveCount = FEATURES.filter((f) => f.status !== "roadmap").length;
  const roadmapCount = FEATURES.filter((f) => f.status === "roadmap").length;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return FEATURES;
    return FEATURES.filter((f) =>
      [f.name, f.pitch, f.howItWorks, ...f.whyUseful, ...f.vsCompetition]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [q]);

  const liveByModule = useMemo(() => {
    const map: Record<FeatureModule, typeof FEATURES> = {} as any;
    for (const f of filtered.filter((f) => f.status !== "roadmap")) {
      (map[f.module] ??= []).push(f);
    }
    return map;
  }, [filtered]);

  const roadmap = filtered.filter((f) => f.status === "roadmap");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      {/* Hero */}
      <header className="mb-10 max-w-3xl">
        <Badge variant="outline" className="mb-4 gap-1">
          <Sparkles className="h-3.5 w-3.5" /> Everything the app can do
        </Badge>
        <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
          The complete 365 Motor Sales feature guide
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A single platform for the entire motor industry — marketplace, shop
          management, cross-shop parts network, franchise program, learning,
          dispatch, and more. Compare us to any competitor, category by
          category.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
            {liveCount} features live today
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">
            {roadmapCount} on the roadmap
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">
            {MODULES.length} product areas
          </span>
        </div>
      </header>

      {/* Search + quick jump */}
      <div className="mb-8 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search 30+ features…"
            className="pl-9"
          />
        </div>
        <Button asChild variant="outline">
          <a href="#compare">
            Compare vs competitors <ChevronRight className="ml-1 h-4 w-4" />
          </a>
        </Button>
      </div>

      {/* Module quick nav */}
      <nav className="mb-10 flex flex-wrap gap-2">
        {MODULES.map((m) => {
          const count = (liveByModule[m.id]?.length ?? 0);
          if (count === 0) return null;
          return (
            <a
              key={m.id}
              href={`#${m.id}`}
              className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:bg-secondary/40"
            >
              {m.label} <span className="text-muted-foreground">· {count}</span>
            </a>
          );
        })}
      </nav>

      {/* Live features by module */}
      <div className="space-y-12">
        {MODULES.map((m) => (
          <ModuleSection key={m.id} moduleId={m.id} features={liveByModule[m.id] ?? []} />
        ))}
      </div>

      {/* Roadmap */}
      {roadmap.length > 0 && (
        <section className="mt-16">
          <div className="mb-4">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Upcoming features
              <span className="ml-2 text-sm font-medium text-muted-foreground">
                · Roadmap · {roadmap.length}
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              What's in flight next. Sign up to be the first to try each release.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {roadmap.map((f) => (
              <Card key={f.id} className="p-5">
                <Badge variant="outline" className="mb-2 text-xs">
                  Roadmap
                </Badge>
                <h3 className="font-semibold">{f.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.pitch}</p>
                <p className="mt-3 text-sm">{f.howItWorks}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Competitive comparison */}
      <section id="compare" className="mt-20 scroll-mt-24">
        <div className="mb-6">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            How we compare
          </h2>
          <p className="mt-2 text-muted-foreground">
            Feature-by-feature checks against the tools shops and buyers actually
            use today.
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

      {/* CTA */}
      <section className="mt-20 rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-secondary/40 p-8 text-center md:p-12">
        <h2 className="font-display text-3xl font-bold tracking-tight">
          Ready to try it?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Sign up free — post a listing, join the parts network, or take Shop
          Manager for a spin.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
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
  );
}
