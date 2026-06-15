import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Truck,
  Clock,
  ShieldCheck,
  PhoneCall,
  Wallet,
  MapPin,
  Plus,
  Siren,
  Star,
  Crown,
  Network,
  ChevronDown,
  Search,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationPicker } from "@/components/location-picker";
import { FeaturedTowProviders } from "@/components/tow/featured-tow-providers";
import { TowRequestForm } from "@/components/towing/tow-request-form";

const SERVICE_CHIPS = [
  "Tow car",
  "Tow motorcycle",
  "Flatbed",
  "Long-distance transport",
  "Heavy equipment hauling",
  "Recovery/winch-out",
];




type ProviderRow = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  cover_url: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  rating_avg: number;
  rating_count: number;
  tagline: string | null;
  phone: string | null;
  subscription_tier: string | null;
  claim_state: string | null;
  owner_id: string;
  attributes?: any;
  available_24_7: boolean;
  payments: string[];
  services: string[];
};

export type TowingServicesPageProps = {
  seedListingId?: string | null;
  requestedProviderId?: string | null;
};

export function TowingServicesPage({
  seedListingId = null,
  requestedProviderId = null,
}: TowingServicesPageProps = {}) {
  // Provider filters
  const [activeService, setActiveService] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [province, setProvince] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [open247, setOpen247] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [payment, setPayment] = useState<string>("any");
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [browseOpen, setBrowseOpen] = useState(false);

  // Direct-provider request (bypasses auto-dispatch)
  const [requestedProvider, setRequestedProvider] = useState<{ id: string; name: string } | null>(null);
  const [providerSearch, setProviderSearch] = useState("");
  const [providerOptions, setProviderOptions] = useState<{ id: string; name: string; owner_id: string }[]>([]);

  // Hydrate requestedProvider from ?provider= (business id or listing id)
  useEffect(() => {
    if (!requestedProviderId) return;
    let cancelled = false;
    (async () => {
      const { data: biz } = await (supabase as any)
        .from("businesses")
        .select("id,name,owner_id")
        .eq("id", requestedProviderId)
        .maybeSingle();
      if (cancelled) return;
      if (biz) {
        setRequestedProvider({ id: biz.owner_id ?? biz.id, name: biz.name });
        return;
      }
      const { data: listing } = await (supabase as any)
        .from("listings")
        .select("title,user_id")
        .eq("id", requestedProviderId)
        .maybeSingle();
      if (cancelled || !listing) return;
      setRequestedProvider({ id: listing.user_id, name: listing.title });
    })();
    return () => {
      cancelled = true;
    };
  }, [requestedProviderId]);




  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      // Source providers from `businesses` (real tow companies live there),
      // joined with `provider_tow_rates` for 24/7 availability.
      let q = (supabase as any)
        .from("businesses")
        .select(
          "id,slug,name,logo_url,cover_url,city,province,region,rating_avg,rating_count,tagline,phone,subscription_tier,claim_state,owner_id,attributes,provider_tow_rates!provider_tow_rates_user_id_fkey(available_24_7)",
        )
        .eq("status", "active")
        .eq("type_slug", "towing")
        .order("subscription_tier", { ascending: false })
        .order("rating_avg", { ascending: false })
        .limit(60);
      if (region) q = q.eq("region", region);
      if (province) q = q.eq("province", province);
      if (city) q = q.eq("city", city);
      const { data, error } = await q;
      if (cancelled) return;
      if (error) {
        // Fallback without the provider_tow_rates join if FK alias differs
        const fb = await (supabase as any)
          .from("businesses")
          .select(
            "id,slug,name,logo_url,cover_url,city,province,region,rating_avg,rating_count,tagline,phone,subscription_tier,claim_state,owner_id,attributes",
          )
          .eq("status", "active")
          .eq("type_slug", "towing")
          .limit(60);
        const ownerIds = (fb.data ?? []).map((b: any) => b.owner_id);
        const { data: rates } = ownerIds.length
          ? await (supabase as any)
              .from("provider_tow_rates")
              .select("user_id, available_24_7")
              .in("user_id", ownerIds)
          : { data: [] };
        const rateMap: Record<string, boolean> = {};
        for (const r of (rates ?? []) as any[]) rateMap[r.user_id] = !!r.available_24_7;
        const merged = (fb.data ?? []).map((b: any) => ({
          ...b,
          provider_tow_rates: rateMap[b.owner_id] ? [{ available_24_7: true }] : [],
        }));
        applyAndSet(merged);
        return;
      }
      applyAndSet(data ?? []);
    };

    function applyAndSet(rows: any[]) {
      let mapped: ProviderRow[] = rows.map((b: any) => {
        const a = b.attributes ?? {};
        const ptr = Array.isArray(b.provider_tow_rates) ? b.provider_tow_rates[0] : b.provider_tow_rates;
        return {
          id: b.id,
          slug: b.slug,
          name: b.name,
          logo_url: b.logo_url,
          cover_url: b.cover_url,
          city: b.city,
          province: b.province,
          region: b.region,
          rating_avg: Number(b.rating_avg ?? 0),
          rating_count: Number(b.rating_count ?? 0),
          tagline: b.tagline,
          phone: b.phone,
          subscription_tier: b.subscription_tier,
          claim_state: b.claim_state,
          owner_id: b.owner_id,
          attributes: a,
          available_24_7: !!(a.available_24_7 || ptr?.available_24_7),
          payments: Array.isArray(a.payments) ? a.payments.map(String) : [],
          services: [
            ...(Array.isArray(a.services) ? a.services.map(String) : []),
            ...(a.service_type ? [String(a.service_type)] : []),
            ...(a.vehicle_capacity ? [String(a.vehicle_capacity)] : []),
          ],
        };
      });

      if (open247) mapped = mapped.filter((p) => p.available_24_7);
      if (verifiedOnly) {
        mapped = mapped.filter(
          (p) =>
            p.claim_state === "approved" ||
            p.claim_state === "verified" ||
            ["featured", "premium", "enterprise", "platinum"].includes(
              String(p.subscription_tier ?? "").toLowerCase(),
            ),
        );
      }
      if (payment !== "any") {
        mapped = mapped.filter((p) =>
          p.payments.some((m) => m.toLowerCase() === payment.toLowerCase()),
        );
      }
      if (activeService) {
        const needle = activeService.toLowerCase();
        mapped = mapped.filter((p) => {
          const blob = p.services.join(" ").toLowerCase();
          if (!blob) return true; // legacy rows with no services tag: don't exclude
          if (needle.includes("car")) return blob.includes("sedan") || blob.includes("car") || blob.includes("suv");
          if (needle.includes("motorcycle")) return blob.includes("motorcycle");
          if (needle.includes("flatbed")) return blob.includes("flatbed");
          if (needle.includes("long")) return blob.includes("long") || blob.includes("trailer") || blob.includes("lowboy");
          if (needle.includes("heavy")) return blob.includes("heavy") || blob.includes("wrecker") || blob.includes("lowboy");
          if (needle.includes("recovery") || needle.includes("winch"))
            return blob.includes("roadside") || blob.includes("winch") || blob.includes("recovery");
          return true;
        });
      }
      setProviders(mapped);
      setLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [activeService, region, province, city, open247, verifiedOnly, payment]);

  // Search tow companies for direct-request combobox
  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      if (providerSearch.trim().length < 2) {
        if (active) setProviderOptions([]);
        return;
      }
      const { data } = await (supabase as any)
        .from("businesses")
        .select("id,name,owner_id")
        .eq("status", "active")
        .eq("type_slug", "towing")
        .ilike("name", `%${providerSearch.trim()}%`)
        .limit(8);
      if (active) setProviderOptions((data ?? []) as any);
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [providerSearch]);




  const promoted = useMemo(
    () =>
      providers.filter((p) =>
        ["featured", "premium", "enterprise", "platinum"].includes(
          String(p.subscription_tier ?? "").toLowerCase(),
        ),
      ),
    [providers],
  );
  const organic = useMemo(
    () =>
      providers.filter(
        (p) =>
          !["featured", "premium", "enterprise", "platinum"].includes(
            String(p.subscription_tier ?? "").toLowerCase(),
          ),
      ),
    [providers],
  );

  return (
    <>
      {/* Hero */}
      <div className="border-b border-border bg-gradient-to-br from-secondary/60 via-secondary/30 to-background">
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <span>/</span>
            <span>Services</span>
            <span>/</span>
            <span className="text-foreground">Towing & Transport</span>
          </div>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold md:text-4xl">
                  Towing & Transport Services
                </h1>
                <p className="max-w-2xl text-muted-foreground">
                  Find verified towing and vehicle-transport providers across the Philippines,
                  or request a tow via the 365 Dispatch network.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg">
                <a href="#emergency-tow">
                  <Siren className="mr-2 h-4 w-4" /> Request a tow
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/dispatch">
                  <Network className="mr-2 h-4 w-4" /> Join 365 Dispatch
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/sell" search={{ payment: undefined, listingId: undefined }}>
                  <Plus className="mr-2 h-4 w-4" /> List your towing company
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-8">
        <FeaturedTowProviders region={region} />
      </div>

      {/* Filters */}
      <div className="container mx-auto px-4 pt-8">
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Service:
            </span>
            <button
              type="button"
              onClick={() => setActiveService(null)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                activeService === null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/40"
              }`}
            >
              All
            </button>
            {SERVICE_CHIPS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setActiveService(s)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  activeService === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(260px,1fr)_minmax(180px,220px)_auto]">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <MapPin className="mr-1 inline h-3 w-3" /> Province coverage
              </Label>
              <LocationPicker
                asFilter
                showBarangay={false}
                value={{ region, province, city }}
                onChange={(v) => {
                  setRegion(v.region ?? null);
                  setProvince(v.province ?? null);
                  setCity(v.city ?? null);
                }}
              />
            </div>
            <div className="min-w-[160px]">
              <Label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Wallet className="mr-1 inline h-3 w-3" /> Accepts payment
              </Label>
              <Select value={payment} onValueChange={setPayment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="GCash">GCash</SelectItem>
                  <SelectItem value="Maya">Maya</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={open247} onCheckedChange={setOpen247} />
                <Clock className="h-4 w-4 text-muted-foreground" /> 24/7 available
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
                <ShieldCheck className="h-4 w-4 text-muted-foreground" /> Verified only
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Provider grid */}
      <div className="container mx-auto px-4 py-8">
        {promoted.length > 0 && (
          <section className="mb-6">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Crown className="h-3.5 w-3.5 text-primary" />
              <Badge variant="secondary">Promoted</Badge>
              <span className="ml-auto text-[10px] normal-case tracking-normal">Sponsored</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {promoted.slice(0, 6).map((p) => (
                <ProviderCard key={p.id} p={p} />
              ))}
            </div>
          </section>
        )}
        <div className="mb-4 text-sm text-muted-foreground">
          {loading
            ? "Loading providers…"
            : `${organic.length} provider${organic.length === 1 ? "" : "s"}`}
        </div>
        {!loading && organic.length === 0 && promoted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            No towing providers match your filters yet. Try widening your area or clearing
            filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {organic.map((p) => (
              <ProviderCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>

      {/* Request a tow */}
      <div id="emergency-tow" className="border-t border-border bg-secondary/30">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold">Request a tow</h2>
              <p className="text-sm text-muted-foreground">
                Tell us what's wrong, where you are, and what you're driving — nearby 365
                Dispatch providers will respond.
              </p>
            </div>
          </div>

          <TowRequestForm
            seedListingId={seedListingId}
            requestedProviderId={requestedProvider?.id ?? null}
            requestedProviderName={requestedProvider?.name ?? null}
            onClearRequestedProvider={() => {
              setRequestedProvider(null);
              setProviderSearch("");
            }}
            providerSearchSlot={
              <>
                <Input
                  className="mt-2"
                  placeholder="Type a tow company name…"
                  value={providerSearch}
                  onChange={(e) => setProviderSearch(e.target.value)}
                />
                {providerOptions.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border bg-card">
                    {providerOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setRequestedProvider({ id: opt.owner_id, name: opt.name });
                          setProviderOptions([]);
                        }}
                      >
                        {opt.name}
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Leave empty to let 365 Dispatch auto-match the best provider.
                </p>
              </>
            }
          />
        </div>
      </div>


      {/* CTAs */}
      <div className="border-t border-border">
        <div className="container mx-auto grid gap-4 px-4 py-12 md:grid-cols-2">
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8">
            <div>
              <h2 className="font-display text-xl font-bold md:text-2xl">
                Run a towing or transport company?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Reach drivers across the Philippines. Set your service types, coverage,
                payments, and 24/7 availability.
              </p>
            </div>
            <Button asChild size="lg">
              <Link to="/sell" search={{ payment: undefined, listingId: undefined }}>
                <Plus className="mr-2 h-4 w-4" /> List your towing company
              </Link>
            </Button>
          </div>
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-8">
            <div>
              <h2 className="font-display text-xl font-bold md:text-2xl">
                Join the 365 Dispatch Network
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Get auto-matched to nationwide emergency tow requests for a flat monthly
                fee. Three tiers from ₱499/mo.
              </p>
            </div>
            <Button asChild size="lg" variant="default">
              <Link to="/dispatch">
                <Network className="mr-2 h-4 w-4" /> See dispatch plans
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function ProviderCard({ p }: { p: ProviderRow }) {
  const tier = String(p.subscription_tier ?? "").toLowerCase();
  const isPromoted = ["featured", "premium", "enterprise", "platinum"].includes(tier);
  const isVerified =
    p.claim_state === "approved" || p.claim_state === "verified" || isPromoted;
  return (
    <Card className="overflow-hidden transition-all hover:border-primary/40 hover:shadow-md">
      <div className="relative aspect-[16/8] w-full overflow-hidden bg-muted">
        {p.cover_url ? (
          <img src={p.cover_url} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Truck className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        {isPromoted && (
          <Badge className="absolute right-2 top-2 bg-primary text-primary-foreground shadow">
            {tier === "premium" ? "Premium" : "Featured"}
          </Badge>
        )}
        {p.available_24_7 && (
          <Badge variant="secondary" className="absolute left-2 top-2 shadow">
            <Clock className="mr-1 h-3 w-3" /> 24/7
          </Badge>
        )}
      </div>
      <div className="space-y-2 p-3">
        <div className="flex items-start gap-3">
          {p.logo_url && (
            <div className="-mt-8 h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 border-background bg-background shadow">
              <img src={p.logo_url} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Link
              to="/businesses/$slug"
              params={{ slug: p.slug }}
              className="block truncate font-semibold hover:underline"
            >
              {p.name}
            </Link>
            {p.tagline && (
              <p className="line-clamp-1 text-xs text-muted-foreground">{p.tagline}</p>
            )}
          </div>
          {isVerified && (
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Verified" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {(p.city || p.region) && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {[p.city, p.province, p.region].filter(Boolean).join(", ")}
            </span>
          )}
          {p.rating_count > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              {p.rating_avg.toFixed(1)} ({p.rating_count})
            </span>
          )}
        </div>
        {p.payments.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {p.payments.slice(0, 4).map((pm) => (
              <Badge key={pm} variant="outline" className="text-[10px]">
                {pm}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Button asChild size="sm" className="flex-1">
            <Link to="/businesses/$slug" params={{ slug: p.slug }}>
              View profile
            </Link>
          </Button>
          {p.phone && (
            <Button asChild size="sm" variant="outline">
              <a href={`tel:${p.phone}`} aria-label={`Call ${p.name}`}>
                <PhoneCall className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
