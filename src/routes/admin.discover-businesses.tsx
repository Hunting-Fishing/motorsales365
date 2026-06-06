import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { MapPin, AlertTriangle, CheckCircle2, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import {
  searchGooglePlaces,
  AVAILABLE_PLACE_TYPES,
  type SeedCandidate,
} from "@/lib/business-seed.functions";
import {
  scrapeFbPageForAdmin,
  searchFbPagesForAdmin,
  geocodeForImport,
  importDiscoveredBusinesses,
  type FbCandidate,
} from "@/lib/business-discover.functions";
import { AutoSyncTab } from "@/components/admin/auto-sync-tab";
import { PhLocationPicker } from "@/components/admin/ph-location-picker";
import { DISCOVER_SEARCH_GROUPS } from "@/data/discover-search-terms";
import { BUSINESS_KIND_OPTIONS } from "@/data/business-kinds";


export const Route = createFileRoute("/admin/discover-businesses")({
  component: DiscoverPage,
  head: () => ({
    meta: [
      { title: "Discover Businesses — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Row = {
  key: string;
  source: "facebook" | "google_places";
  externalId: string;
  name: string;
  typeSlug: string;
  streetAddress: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  coverUrl: string | null;
  about: string | null;
  sourceUrl: string | null;
  region: string | null;
  city: string | null;
  geoConfidence: "high" | "low" | "none";
  alreadyImported: boolean;
};

const FB_CATEGORY_TO_TYPE: { match: RegExp; slug: string }[] = [
  { match: /motorcycle/i, slug: "motorcycle_shop" },
  { match: /tire/i, slug: "tire_shop" },
  { match: /body|paint/i, slug: "body_paint" },
  { match: /parts|accessor/i, slug: "parts_accessories" },
  { match: /wash/i, slug: "carwash" },
  { match: /gas|fuel|petrol/i, slug: "fuel_station" },
  { match: /insur/i, slug: "insurance" },
  { match: /tow/i, slug: "towing" },
  { match: /dealer|sales/i, slug: "dealership" },
  { match: /repair|mechanic|service|garage/i, slug: "repair_shop" },
];

function guessTypeFromCategory(cat: string | null): string {
  if (!cat) return "repair_shop";
  for (const m of FB_CATEGORY_TO_TYPE) if (m.match.test(cat)) return m.slug;
  return "repair_shop";
}

function DiscoverPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const importFn = useServerFn(importDiscoveredBusinesses);

  function addRow(r: Row) {
    setRows((prev) => {
      if (prev.find((p) => p.key === r.key)) return prev;
      return [r, ...prev];
    });
  }

  async function runImport() {
    const picked = rows.filter((r) => selected[r.key] && !r.alreadyImported && r.lat != null);
    if (!picked.length) {
      toast.error("Pick at least one row with coordinates.");
      return;
    }
    setBusy(true);
    try {
      const res = await importFn({
        data: {
          rows: picked.map((r) => ({
            source: r.source,
            externalId: r.externalId,
            name: r.name,
            typeSlug: r.typeSlug,
            streetAddress: r.streetAddress,
            lat: r.lat,
            lng: r.lng,
            phone: r.phone,
            website: r.website,
            coverUrl: r.coverUrl,
            about: r.about,
            sourceUrl: r.sourceUrl,
            region: r.region,
            city: r.city,
          })),
        },
      });
      const mergedCount = (res as { merged?: unknown[] }).merged?.length ?? 0;
      toast.success(
        `Imported ${res.imported}${mergedCount ? ` · merged ${mergedCount} duplicate${mergedCount === 1 ? "" : "s"}` : ""}${res.skipped.length ? ` · skipped ${res.skipped.length} (no coords)` : ""}.`,
      );
      setRows((prev) =>
        prev.map((r) => (picked.find((p) => p.key === r.key) ? { ...r, alreadyImported: true } : r)),
      );
      setSelected({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const withCoords = rows.filter((r) => r.lat != null && !r.alreadyImported).length;

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Discover Businesses</h1>
        <p className="text-sm text-muted-foreground">
          Pull real auto/motor businesses from Google and Facebook, verify the address resolves on
          the map, then import only the ones you want. Anything missing coordinates can't be
          imported — fix the address first.
        </p>
      </div>

      <Tabs defaultValue="auto" className="w-full">
        <TabsList>
          <TabsTrigger value="auto">Auto-sync (Google)</TabsTrigger>
          <TabsTrigger value="google">Google Places</TabsTrigger>
          <TabsTrigger value="facebook">Facebook Pages</TabsTrigger>
        </TabsList>
        <TabsContent value="auto" className="mt-4">
          <AutoSyncTab />
        </TabsContent>
        <TabsContent value="google" className="mt-4">
          <GoogleTab onAdd={addRow} />
        </TabsContent>
        <TabsContent value="facebook" className="mt-4">
          <FacebookTab onAdd={addRow} />
        </TabsContent>
      </Tabs>

      {rows.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              {rows.length} in tray · {withCoords} importable · {selectedCount} selected
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const all: Record<string, boolean> = {};
                  rows.forEach((r) => {
                    if (!r.alreadyImported && r.lat != null) all[r.key] = true;
                  });
                  setSelected(all);
                }}
              >
                Select importable
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRows([])}>
                Clear tray
              </Button>
              <Button size="sm" onClick={runImport} disabled={busy || !selectedCount}>
                {busy ? "Importing…" : `Import selected (${selectedCount})`}
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {rows.map((r) => (
              <ReviewRow
                key={r.key}
                row={r}
                checked={!!selected[r.key]}
                onToggle={(c) => setSelected((s) => ({ ...s, [r.key]: c }))}
                onChange={(patch) =>
                  setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, ...patch } : x)))
                }
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ReviewRow({
  row,
  checked,
  onToggle,
  onChange,
}: {
  row: Row;
  checked: boolean;
  onToggle: (v: boolean) => void;
  onChange: (patch: Partial<Row>) => void;
}) {
  const [addr, setAddr] = useState(row.streetAddress ?? "");
  const [geocoding, setGeocoding] = useState(false);
  const geocode = useServerFn(geocodeForImport);

  async function regeocode() {
    if (!addr.trim()) return;
    setGeocoding(true);
    try {
      const res = await geocode({ data: { address: addr } });
      onChange({
        streetAddress: res.label ?? addr,
        lat: res.lat,
        lng: res.lng,
        geoConfidence: res.confidence,
      });
      if (res.confidence === "none") toast.error("Couldn't resolve that address.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Geocode failed");
    } finally {
      setGeocoding(false);
    }
  }

  const hasCoords = row.lat != null && row.lng != null;
  return (
    <div className="rounded border bg-background p-3">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={checked}
          disabled={row.alreadyImported || !hasCoords}
          onCheckedChange={(c) => onToggle(!!c)}
          className="mt-1"
        />
        {row.coverUrl ? (
          <img src={row.coverUrl} alt="" className="h-16 w-16 rounded object-cover" />
        ) : (
          <div className="h-16 w-16 rounded bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{row.name}</span>
            <Badge variant={row.source === "facebook" ? "secondary" : "outline"}>
              {row.source === "facebook" ? "Facebook" : "Google"}
            </Badge>
            <Badge variant="outline">{row.typeSlug}</Badge>
            {row.alreadyImported && <Badge variant="secondary">Already imported</Badge>}
            {hasCoords ? (
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {row.geoConfidence === "high" ? "Map-ready" : "Map-ready (low confidence)"}
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertTriangle className="mr-1 h-3 w-3" />
                No coordinates
              </Badge>
            )}
            {row.sourceUrl && (
              <a
                href={row.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted-foreground hover:underline"
              >
                <ExternalLink className="inline h-3 w-3" /> source
              </a>
            )}
          </div>
          {row.about && (
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.about}</div>
          )}
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              placeholder="Street address, City, Region"
            />
            <Button size="sm" variant="outline" onClick={regeocode} disabled={geocoding}>
              {geocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              Re-geocode
            </Button>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {hasCoords
              ? `${row.lat?.toFixed(5)}, ${row.lng?.toFixed(5)}`
              : "Fix the address and click Re-geocode to plot a pin."}
            {row.phone && <> · {row.phone}</>}
            {row.website && <> · {row.website}</>}
          </div>
          <Select value={row.typeSlug} onValueChange={(v) => onChange({ typeSlug: v })}>
            <SelectTrigger className="mt-2 h-8 w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_KIND_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function GoogleTab({ onAdd }: { onAdd: (r: Row) => void }) {
  const search = useServerFn(searchGooglePlaces);
  const [placeType, setPlaceType] = useState(AVAILABLE_PLACE_TYPES[0]);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<SeedCandidate[]>([]);
  const [pageToken, setPageToken] = useState<string | null>(null);

  async function runSearch(token?: string) {
    setBusy(true);
    try {
      const res = await search({
        data: { query: query || placeType, placeType, region, city, pageToken: token },
      });
      setResults(token ? [...results, ...res.candidates] : res.candidates);
      setPageToken(res.nextPageToken);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  function addToTray(c: SeedCandidate) {
    if (!c.ourType) {
      toast.error("This place type isn't mapped to a category.");
      return;
    }
    onAdd({
      key: `g:${c.placeId}`,
      source: "google_places",
      externalId: c.placeId,
      name: c.name,
      typeSlug: c.ourType,
      streetAddress: c.address || null,
      lat: c.lat,
      lng: c.lng,
      phone: c.phone,
      website: c.website,
      coverUrl: null,
      about: null,
      sourceUrl: `https://www.google.com/maps/place/?q=place_id:${c.placeId}`,
      region: region || null,
      city: city || null,
      geoConfidence: c.lat != null && c.lng != null ? "high" : "none",
      alreadyImported: c.alreadyImported,
    });
    toast.success(`Added ${c.name} to tray`);
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <Label>Type</Label>
          <Select value={placeType} onValueChange={setPlaceType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_PLACE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <PhLocationPicker
          region={region}
          city={city}
          onChange={(v) => {
            setRegion(v.region);
            setCity(v.city);
          }}
        />

        <div className="lg:col-span-2">
          <Label>Keywords (optional)</Label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Toyota dealer, Honda parts…"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => runSearch()} disabled={busy}>
          {busy ? "Searching…" : "Search Google Places"}
        </Button>
        {pageToken && (
          <Button variant="outline" onClick={() => runSearch(pageToken)} disabled={busy}>
            Load more
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {results.map((r) => (
          <div key={r.placeId} className="flex items-start gap-3 rounded border bg-background p-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{r.name}</span>
                {r.alreadyImported && <Badge variant="secondary">Imported</Badge>}
                {!r.ourType && <Badge variant="destructive">Unmapped</Badge>}
                {r.ourType && <Badge variant="outline">{r.ourType}</Badge>}
                {r.lat != null && (
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Has coords
                  </Badge>
                )}
              </div>
              <div className="truncate text-xs text-muted-foreground">{r.address}</div>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={r.alreadyImported || !r.ourType}
              onClick={() => addToTray(r)}
            >
              Add to tray
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FacebookTab({ onAdd }: { onAdd: (r: Row) => void }) {
  const scrape = useServerFn(scrapeFbPageForAdmin);
  const search = useServerFn(searchFbPagesForAdmin);
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [groupKind, setGroupKind] = useState<string>(DISCOVER_SEARCH_GROUPS[0].kind);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<
    { url: string; title: string; snippet: string; pageId: string; alreadyImported: boolean }[]
  >([]);
  const activeGroup =
    DISCOVER_SEARCH_GROUPS.find((g) => g.kind === groupKind) ?? DISCOVER_SEARCH_GROUPS[0];


  async function scrapeOne(pageUrl: string) {
    if (!pageUrl) return;
    setBusy(true);
    try {
      const c: FbCandidate = await scrape({ data: { url: pageUrl } });
      onAdd({
        key: `f:${c.pageId}`,
        source: "facebook",
        externalId: c.pageId,
        name: c.name,
        typeSlug: guessTypeFromCategory(c.category),
        streetAddress: c.addressText,
        lat: c.geo.lat,
        lng: c.geo.lng,
        phone: c.phone,
        website: c.website,
        coverUrl: c.coverImage,
        about: c.about,
        sourceUrl: c.pageUrl,
        region: region || null,
        city: city || null,
        geoConfidence: c.geo.confidence,
        alreadyImported: c.alreadyImported,
      });
      toast.success(`Added ${c.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scrape failed");
    } finally {
      setBusy(false);
    }
  }

  async function runSearch(termOverride?: string) {
    const q = (termOverride ?? query).trim();
    if (q.length < 2) {
      toast.error("Pick a suggestion or type a search term.");
      return;
    }
    if (termOverride) setQuery(termOverride);
    setBusy(true);
    try {
      const cityForSearch = [city, region].filter(Boolean).join(", ") || undefined;
      const res = await search({ data: { query: q, city: cityForSearch } });
      setResults(res.results);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  async function runBulkForGroup() {
    const terms = activeGroup.terms;
    setBulkProgress({ done: 0, total: terms.length });
    setBusy(true);
    const seen = new Map<string, (typeof results)[number]>();
    const cityForSearch = [city, region].filter(Boolean).join(", ") || undefined;
    try {
      for (let i = 0; i < terms.length; i++) {
        try {
          const res = await search({ data: { query: terms[i], city: cityForSearch } });
          for (const r of res.results) if (!seen.has(r.pageId)) seen.set(r.pageId, r);
        } catch (e) {
          console.warn("FB search failed for", terms[i], e);
        }
        setBulkProgress({ done: i + 1, total: terms.length });
        setResults(Array.from(seen.values()));
      }
      toast.success(
        `Found ${seen.size} unique pages across ${terms.length} ${activeGroup.label} terms.`,
      );
    } finally {
      setBusy(false);
      setBulkProgress(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <Label>Paste a Facebook Page URL</Label>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.facebook.com/SomeAutoShopPH"
          />
          <Button onClick={() => scrapeOne(url)} disabled={busy || !url}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch page"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          We scrape the public About section to extract name, address, phone, hours, and the cover
          photo. The address is geocoded automatically so the business plots on the map.
        </p>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Label>Search Facebook pages by 365 business field</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick a category, then click a suggested term or sweep every term in that category at
              once. Add a region/city to narrow results.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label className="text-xs">Business field</Label>
              <Select value={groupKind} onValueChange={setGroupKind}>
                <SelectTrigger className="w-[230px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISCOVER_SEARCH_GROUPS.map((g) => (
                    <SelectItem key={g.kind} value={g.kind}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="secondary" onClick={runBulkForGroup} disabled={busy}>
              {bulkProgress
                ? `Sweeping ${bulkProgress.done}/${bulkProgress.total}…`
                : `Sweep all (${activeGroup.terms.length})`}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {activeGroup.terms.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => runSearch(t)}
              disabled={busy}
              className="rounded-full border bg-background px-2.5 py-1 text-xs hover:bg-accent disabled:opacity-50"
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Or type your own keywords…"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <PhLocationPicker
              region={region}
              city={city}
              compact
              onChange={(v) => {
                setRegion(v.region);
                setCity(v.city);
              }}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => runSearch()} disabled={busy || query.length < 2}>
            {busy ? "Searching…" : "Search Facebook"}
          </Button>
        </div>


        <div className="space-y-2">
          {results.map((r) => (
            <div key={r.pageId} className="flex items-start gap-3 rounded border bg-background p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{r.title}</span>
                  {r.alreadyImported && <Badge variant="secondary">Imported</Badge>}
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    <ExternalLink className="inline h-3 w-3" /> open
                  </a>
                </div>
                <div className="line-clamp-2 text-xs text-muted-foreground">{r.snippet}</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={r.alreadyImported || busy}
                onClick={() => scrapeOne(r.url)}
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Fetch
              </Button>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}
