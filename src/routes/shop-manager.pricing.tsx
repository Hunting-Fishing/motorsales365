import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, X, Sparkles, Globe } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listShopManagerPlans,
  listShopManagerRegions,
  computeLocalPrice,
} from "@/lib/shop-manager-entitlements.functions";
import { listMyWorkspaceBusinesses } from "@/lib/business-workspace.functions";
import { useAuth } from "@/hooks/use-auth";


const TITLE = "Shop Manager Pricing — 365 Motor Sales";
const DESCRIPTION =
  "All-inclusive AI, no metered surprises. Shop Manager plans start free. Pricing adjusts to your country's purchasing power — Free, Starter, Pro, and Enterprise tiers for every business type.";

export const Route = createFileRoute("/shop-manager/pricing")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "product" },
    ],
    links: [{ rel: "canonical", href: "https://www.365motorsales.com/shop-manager/pricing" }],
  }),
  component: ShopManagerPricingPage,
});

const BUSINESS_KINDS = [
  { slug: "default", label: "General business" },
  { slug: "repair_shop", label: "Auto repair shop" },
  { slug: "fuel_station", label: "Fuel station / gas + convenience" },
  { slug: "dealership", label: "Dealership" },
  { slug: "parts_retailer", label: "Parts retailer" },
  { slug: "tow_service", label: "Towing / roadside" },
  { slug: "service_shop", label: "Service shop (detailing, tint, glass)" },
  { slug: "rental", label: "Vehicle rental" },
  { slug: "inspection_center", label: "Inspection center" },
  { slug: "accessories", label: "Accessories / aftermarket" },
];

const TIER_ACCENT: Record<string, string> = {
  free: "",
  starter: "",
  pro: "border-primary shadow-lg",
  enterprise: "border-amber-500/40",
};

const FEATURE_ROWS: Array<{ key: string; label: string; type: "bool" | "limit" | "sharing" | "ai" }> = [
  { key: "inventory_skus", label: "Inventory SKUs", type: "limit" },
  { key: "invoices_per_month", label: "Invoices / month", type: "limit" },
  { key: "team_seats", label: "Team seats", type: "limit" },
  { key: "locations", label: "Business locations", type: "limit" },
  { key: "listings", label: "Marketplace listings", type: "limit" },
  { key: "network_sharing", label: "Network inventory sharing", type: "sharing" },
  { key: "gl_drilldown", label: "GL drilldown + full P&L", type: "bool" },
  { key: "custom_domain", label: "Custom domain", type: "bool" },
  { key: "ai_translate", label: "AI translate (10 languages)", type: "bool" },
  { key: "ai_doc_check", label: "AI document verification", type: "bool" },
  { key: "ai_dvi", label: "Digital Vehicle Inspection (DVI)", type: "bool" },
  { key: "ai_smart_search", label: "Smart search + fitment AI", type: "bool" },
  { key: "priority_support", label: "Priority support", type: "bool" },
  { key: "custom_reports", label: "Custom reports + exports", type: "bool" },
  { key: "white_label", label: "White-label invoices", type: "bool" },
  { key: "ai_ceiling", label: "AI fair-use (calls/mo)", type: "ai" },
];

const SHARING_LABEL: Record<string, string> = {
  none: "—",
  read: "Read-only",
  read_write: "Read + write",
  priority: "Priority routing",
};

function formatLimit(v: unknown): string {
  if (v == null) return "Unlimited";
  if (typeof v === "number") return v.toLocaleString();
  return String(v);
}

function detectCountry(): string {
  if (typeof navigator === "undefined") return "PH";
  const lang = navigator.language || "en-PH";
  const cc = lang.split("-")[1]?.toUpperCase();
  return cc || "PH";
}

function ShopManagerPricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [businessKind, setBusinessKind] = useState<string>("default");
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [countryCode, setCountryCode] = useState<string>("PH");
  const [businessId, setBusinessId] = useState<string>("");

  useEffect(() => {
    setCountryCode(detectCountry());
  }, []);

  const loadPlans = useServerFn(listShopManagerPlans);
  const loadRegions = useServerFn(listShopManagerRegions);
  const loadMyBiz = useServerFn(listMyWorkspaceBusinesses);

  const plansQuery = useQuery({
    queryKey: ["sm-plans", businessKind],
    queryFn: () => loadPlans({ data: { businessKind } }),
    staleTime: 5 * 60_000,
  });
  const regionsQuery = useQuery({
    queryKey: ["sm-regions"],
    queryFn: () => loadRegions(),
    staleTime: 60 * 60_000,
  });
  const myBizQuery = useQuery({
    queryKey: ["sm-my-businesses", user?.id ?? "anon"],
    queryFn: () => loadMyBiz(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const businesses = (myBizQuery.data ?? []) as Array<{
    id: string;
    name: string;
    type_slug: string | null;
    my_role: string;
  }>;

  useEffect(() => {
    if (!businessId && businesses.length > 0) {
      setBusinessId(businesses[0].id);
      if (businesses[0].type_slug) setBusinessKind(businesses[0].type_slug);
    }
  }, [businesses, businessId]);

  const region = useMemo(() => {
    const list = regionsQuery.data ?? [];
    return (
      list.find((r: any) => r.country_code === countryCode) ||
      list.find((r: any) => r.country_code === "PH") ||
      null
    );
  }, [regionsQuery.data, countryCode]);

  const plans = plansQuery.data ?? [];

  function handleChoose(planTier: string) {
    const tier = String(planTier || "").toLowerCase();
    if (tier === "free") return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!businessId) {
      navigate({ to: "/dashboard/businesses" });
      return;
    }
    if (!["starter", "pro", "enterprise"].includes(tier)) return;
    navigate({
      to: "/shop-manager/checkout",
      search: {
        businessId,
        tier: tier as "starter" | "pro" | "enterprise",
        interval,
        countryCode,
      },
    });
  }

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-6xl px-4 py-10 sm:py-16">
        {/* Header */}
        <div className="mb-8 text-center">
          <Badge variant="outline" className="mb-3 gap-1">
            <Sparkles className="h-3 w-3" /> All-inclusive AI. No metered bills.
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Shop Manager Pricing
          </h1>
          <p className="mt-3 text-muted-foreground sm:text-lg">
            Pick a tier that fits your business. AI translate, doc-check, DVI, and smart search are bundled — no surprise usage bills.
            Prices auto-adjust to your country using purchasing power parity so shops everywhere pay fairly.
          </p>
        </div>

        {/* Business selector (signed in only) */}
        {user && businesses.length > 0 && (
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Subscribe on behalf of
            </label>
            <Select
              value={businessId}
              onValueChange={(v) => {
                setBusinessId(v);
                const b = businesses.find((x) => x.id === v);
                if (b?.type_slug) setBusinessKind(b.type_slug);
              }}
            >
              <SelectTrigger className="w-full sm:w-96">
                <SelectValue placeholder="Select a business" />
              </SelectTrigger>
              <SelectContent>
                {businesses.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} · {b.my_role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Controls */}
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">I run a…</label>
            <Select value={businessKind} onValueChange={setBusinessKind}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_KINDS.map((k) => (
                  <SelectItem key={k.slug} value={k.slug}>{k.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              <Globe className="inline h-3 w-3" /> Country
            </label>
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(regionsQuery.data ?? []).map((r: any) => (
                  <SelectItem key={r.country_code} value={r.country_code}>
                    {r.country_name} ({r.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Billing</label>
            <Tabs value={interval} onValueChange={(v) => setInterval(v as "month" | "year")}>
              <TabsList className="w-full">
                <TabsTrigger value="month" className="flex-1">Monthly</TabsTrigger>
                <TabsTrigger value="year" className="flex-1">Yearly · save ~17%</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((p: any) => {
            const yearlyDisc = Number(p.yearly_discount_pct) || 0;
            const monthlyPhp = Number(p.base_price_php);
            const effectivePhp = interval === "year"
              ? monthlyPhp * 12 * (1 - yearlyDisc / 100)
              : monthlyPhp;
            const local = region
              ? computeLocalPrice(effectivePhp, Number(region.ppp_multiplier), Number(region.fx_to_php), region.price_ends_in || "9")
              : effectivePhp;
            const symbol = region?.currency_symbol || "₱";
            const currency = region?.currency || "PHP";
            const priceLabel = monthlyPhp === 0
              ? "Free"
              : `${symbol}${local.toLocaleString(undefined, { maximumFractionDigits: local < 100 ? 2 : 0 })}`;

            return (
              <Card key={p.id} className={`flex flex-col gap-4 p-6 ${TIER_ACCENT[p.tier] ?? ""}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    {p.tier === "pro" && <Badge>Most popular</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{p.blurb}</p>
                </div>
                <div>
                  <div className="text-3xl font-bold">{priceLabel}</div>
                  <div className="text-xs text-muted-foreground">
                    {monthlyPhp === 0
                      ? "Forever. No card required."
                      : `${currency} · per ${interval === "year" ? "year" : "month"}`}
                  </div>
                  {monthlyPhp > 0 && region?.country_code !== "PH" && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      PPP-adjusted from ₱{effectivePhp.toLocaleString()} base
                    </div>
                  )}
                </div>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{formatLimit((p.limits ?? {}).inventory_skus)} inventory SKUs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{formatLimit((p.limits ?? {}).invoices_per_month)} invoices / month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{formatLimit((p.limits ?? {}).team_seats)} team seat(s)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    {(p.features ?? {}).ai_translate ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span>AI translate, doc-check, smart search</span>
                  </li>
                  <li className="flex items-start gap-2">
                    {(p.features ?? {}).custom_domain ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span>Custom domain microsite</span>
                  </li>
                  {(p.ai_ceiling ?? 0) > 0 && (
                    <li className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>Includes {Number(p.ai_ceiling).toLocaleString()} AI calls/mo (fair-use)</span>
                    </li>
                  )}
                </ul>
                <Button
                  className="mt-auto"
                  variant={p.tier === "pro" ? "default" : "outline"}
                  disabled={p.tier === "free"}
                  onClick={() => handleChoose(p.tier)}
                >
                  {p.tier === "free"
                    ? "Included by default"
                    : !user
                      ? `Sign in to choose ${p.name}`
                      : !businessId
                        ? `Create a business first`
                        : `Choose ${p.name}`}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Full comparison */}
        <div className="mt-14">
          <h2 className="mb-4 text-2xl font-bold">Full comparison</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">Feature</th>
                  {plans.map((p: any) => (
                    <th key={p.id} className="p-3 text-center font-medium">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_ROWS.map((row) => (
                  <tr key={row.key} className="border-t">
                    <td className="p-3">{row.label}</td>
                    {plans.map((p: any) => {
                      const limits = p.limits ?? {};
                      const features = p.features ?? {};
                      let cell: React.ReactNode;
                      if (row.type === "bool") {
                        cell = features[row.key]
                          ? <Check className="mx-auto h-4 w-4 text-primary" />
                          : <X className="mx-auto h-4 w-4 text-muted-foreground/50" />;
                      } else if (row.type === "limit") {
                        cell = formatLimit(limits[row.key]);
                      } else if (row.type === "sharing") {
                        cell = SHARING_LABEL[limits.network_sharing] ?? "—";
                      } else if (row.type === "ai") {
                        cell = (p.ai_ceiling ?? 0) > 0 ? Number(p.ai_ceiling).toLocaleString() : "—";
                      }
                      return <td key={p.id} className="p-3 text-center">{cell}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI billing explainer */}
        <Card className="mt-10 bg-gradient-to-br from-primary/5 to-background p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">How our AI pricing works</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Every paid tier includes all AI features — translate, doc-check, DVI, smart search — with a monthly fair-use ceiling.
                You never get an itemised bill for AI, API, or map usage. If a shop consistently exceeds their tier's fair-use ceiling,
                we invite them to upgrade rather than charge overage. Simple, predictable, and safe for shops in every market.
              </p>
            </div>
          </div>
        </Card>

        {/* Regional pricing explainer */}
        <Card className="mt-4 p-6">
          <div className="flex items-start gap-3">
            <Globe className="mt-1 h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">Global purchasing power pricing</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Base prices are set in Philippine Pesos (₱). For every other country we auto-adjust using purchasing power parity — so
                a shop in Manila, Jakarta, Mumbai, Berlin, or Sydney pays what's fair for their market. Change country at checkout to see local pricing.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </SiteLayout>
  );
}
