import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Handshake } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listPublicPartners, listActiveTiers } from "@/lib/franchise.functions";

const TITLE = "Our Partners — 365 Franchise & Partner Program";
const DESCRIPTION =
  "Meet the shops in the 365 network across the Philippines — 365 Partners and 365 Franchises offering trusted service, parts, and repairs.";
const URL = "https://www.365motorsales.com/franchise/partners";

type PartnerSearch = { tier?: string; province?: string };

export const Route = createFileRoute("/franchise/partners")({
  validateSearch: (s: Record<string, unknown>): PartnerSearch => ({
    tier: typeof s.tier === "string" ? s.tier : undefined,
    province: typeof s.province === "string" ? s.province : undefined,
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
  const { tier, province } = Route.useSearch();
  const navigate = useNavigate({ from: "/franchise/partners" });
  const listFn = useServerFn(listPublicPartners);
  const tiersFn = useServerFn(listActiveTiers);

  const partners = useQuery({
    queryKey: ["franchise", "partners", tier ?? "all", province ?? "all"],
    queryFn: () => listFn({ data: { tier: tier ?? null, province: province ?? null, limit: 120 } }),
  });
  const tiers = useQuery({
    queryKey: ["franchise", "tiers", "active"],
    queryFn: () => tiersFn(),
  });

  const provinces = Array.from(
    new Set((partners.data ?? []).map((p) => p.province).filter(Boolean) as string[]),
  ).sort();

  const setSearch = (patch: Partial<PartnerSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) as any });

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
        <div className="mb-6 flex flex-wrap gap-2">
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
          {provinces.length > 0 ? (
            <div className="ml-auto">
              <select
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                value={province ?? ""}
                onChange={(e) => setSearch({ province: e.target.value || undefined })}
                aria-label="Filter by province"
              >
                <option value="">All provinces</option>
                {provinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        {partners.isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Loading partners…</p>
        ) : (partners.data ?? []).length === 0 ? (
          <Card className="p-10 text-center">
            <h2 className="font-display text-xl font-semibold">No partners here yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We're onboarding our first partner shops. Apply to be one of the first listed.
            </p>
            <Button asChild className="mt-4">
              <Link to="/franchise/apply" search={{ tier: "partner" } as any}>
                Apply to the program
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(partners.data ?? []).map((p) => (
              <Card key={p.membership_id} className="overflow-hidden">
                {p.cover_url ? (
                  <img
                    src={p.cover_url}
                    alt={`${p.business_name} cover`}
                    className="h-32 w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-32 w-full bg-gradient-to-br from-primary/10 to-secondary" />
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{p.business_name}</h3>
                      <p className="text-xs text-muted-foreground">
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
                  <Button asChild size="sm" variant="outline" className="mt-4 w-full">
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
