import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Handshake, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listPublicPartners, listActiveTiers } from "@/lib/franchise.functions";

const TITLE = "Our Partners — 365 Franchise & Partner Program";
const DESCRIPTION =
  "Meet the shops in the 365 network across the Philippines — 365 Partners and 365 Franchises offering trusted service, parts, and repairs.";
const URL = "https://www.365motorsales.com/franchise/partners";

type SortKey = "newest" | "oldest" | "name" | "province";
type PartnerSearch = { tier?: string; province?: string; sort?: SortKey };

export const Route = createFileRoute("/franchise/partners")({
  validateSearch: (s: Record<string, unknown>): PartnerSearch => ({
    tier: typeof s.tier === "string" ? s.tier : undefined,
    province: typeof s.province === "string" ? s.province : undefined,
    sort:
      s.sort === "oldest" || s.sort === "name" || s.sort === "province"
        ? (s.sort as SortKey)
        : s.sort === "newest"
          ? "newest"
          : undefined,
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: PartnersPage,
});

function PartnersPage() {
  const { tier, province, sort } = Route.useSearch();
  const activeSort: SortKey = sort ?? "newest";
  const navigate = useNavigate({ from: "/franchise/partners" });
  const listFn = useServerFn(listPublicPartners);
  const tiersFn = useServerFn(listActiveTiers);
  const [query, setQuery] = useState("");

  const partners = useQuery({
    queryKey: ["franchise", "partners", tier ?? "all", province ?? "all"],
    queryFn: () => listFn({ data: { tier: tier ?? null, province: province ?? null, limit: 120 } }),
  });
  const tiers = useQuery({
    queryKey: ["franchise", "tiers", "active"],
    queryFn: () => tiersFn(),
  });

  const rows = partners.data ?? [];
  const provinces = useMemo(
    () =>
      Array.from(new Set(rows.map((p) => p.province).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b),
      ),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows;
    if (q) {
      out = out.filter((p) =>
        [p.business_name, p.city, p.province, p.tier_name, p.tier_slug]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
    }
    const sorted = [...out];
    sorted.sort((a, b) => {
      switch (activeSort) {
        case "oldest":
          return (a.started_at ?? "").localeCompare(b.started_at ?? "");
        case "name":
          return a.business_name.localeCompare(b.business_name);
        case "province":
          return (a.province ?? "zzz").localeCompare(b.province ?? "zzz");
        case "newest":
        default:
          return (b.started_at ?? "").localeCompare(a.started_at ?? "");
      }
    });
    return sorted;
  }, [rows, query, activeSort]);

  const setSearch = (patch: Partial<PartnerSearch>) =>
    navigate({ search: (prev: PartnerSearch) => ({ ...prev, ...patch }) as any });

  const hasFilters = !!(tier || province || query || (sort && sort !== "newest"));
  const clearAll = () => {
    setQuery("");
    navigate({ search: {} as any });
  };

  return (
    <SiteLayout>
      <section className="border-b border-border bg-gradient-to-b from-secondary/40 to-background">
        <div className="container mx-auto max-w-6xl px-4 py-12">
          <Link to="/franchise" className="text-sm text-muted-foreground hover:text-foreground">
            ← 365 Franchise &amp; Partner Program
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Our partners
            </span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Shops in the 365 network
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            These accredited shops are part of the 365 Franchise &amp; Partner Program — vetted for
            service quality and covered by our network parts pricing.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-8">
        {/* Filters */}
        <div className="mb-6 space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search shops, cities, tiers…"
                className="pl-9"
                aria-label="Search partners"
              />
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground sm:hidden" />
              <select
                className="w-full min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm sm:w-auto"
                value={province ?? ""}
                onChange={(e) => setSearch({ province: e.target.value || undefined })}
                aria-label="Filter by province"
                disabled={provinces.length === 0}
              >
                <option value="">All provinces</option>
                {provinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground sm:hidden" />
              <select
                className="w-full min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm sm:w-auto"
                value={activeSort}
                onChange={(e) => setSearch({ sort: e.target.value as SortKey })}
                aria-label="Sort partners"
              >
                <option value="newest">Newest members</option>
                <option value="oldest">Longest-standing</option>
                <option value="name">Name (A–Z)</option>
                <option value="province">Province (A–Z)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Chip active={!tier} onClick={() => setSearch({ tier: undefined })}>
              All tiers
            </Chip>
            {(tiers.data ?? []).map((t) => (
              <Chip
                key={t.slug}
                active={tier === t.slug}
                onClick={() => setSearch({ tier: tier === t.slug ? undefined : t.slug })}
              >
                {t.name}
              </Chip>
            ))}
            {hasFilters ? (
              <button
                onClick={clearAll}
                className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> Clear filters
              </button>
            ) : null}
          </div>

          {!partners.isLoading ? (
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {rows.length} partner{rows.length === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>

        {partners.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-32 w-full rounded-none" />
                <div className="space-y-3 p-5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10">
              <Handshake className="h-6 w-6 text-primary" />
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold">No partners here yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              We're onboarding our first partner shops. Apply now to be among the first listed in
              the 365 network directory.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Button asChild>
                <Link to="/franchise/apply" search={{ tier: "partner" } as any}>
                  Apply to the program
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/franchise">Learn more</Link>
              </Button>
            </div>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold">No matching partners</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Try a different search term or clear filters to see the full network.
            </p>
            <Button onClick={clearAll} variant="outline" className="mt-5">
              <X className="mr-1 h-4 w-4" /> Clear filters
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <Card
                key={p.membership_id}
                className="group flex flex-col overflow-hidden transition hover:border-primary/50 hover:shadow-md"
              >
                {p.cover_url ? (
                  <img
                    src={p.cover_url}
                    alt={`${p.business_name} cover`}
                    className="h-32 w-full object-cover transition group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-32 w-full bg-gradient-to-br from-primary/10 to-secondary" />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{p.business_name}</h3>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {[p.city, p.province].filter(Boolean).join(", ") || "Philippines"}
                      </p>
                    </div>
                    {p.logo_url ? (
                      <img
                        src={p.logo_url}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      365 {p.tier_name ?? p.tier_slug}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      Member #{p.member_number}
                    </span>
                  </div>
                  <Button asChild size="sm" variant="outline" className="mt-auto w-full pt-0 sm:mt-4">
                    <Link to="/b/$slug" params={{ slug: p.business_slug }}>
                      View shop
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:border-primary/50"
      }`}
    >
      {children}
    </button>
  );
}
