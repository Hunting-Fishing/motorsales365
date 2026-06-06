import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  searchGooglePlaces,
  importSeedCandidates,
  AVAILABLE_PLACE_TYPES,
  type SeedCandidate,
} from "@/lib/business-seed.functions";

export const Route = createFileRoute("/admin/seed-businesses")({
  component: SeedPage,
  head: () => ({
    meta: [
      { title: "Seed Businesses — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function SeedPage() {
  const search = useServerFn(searchGooglePlaces);
  const importFn = useServerFn(importSeedCandidates);
  const [placeType, setPlaceType] = useState(AVAILABLE_PLACE_TYPES[0]);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<SeedCandidate[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [pageToken, setPageToken] = useState<string | null>(null);

  async function runSearch(token?: string) {
    setBusy(true);
    try {
      const res = await search({
        data: { query: query || placeType, placeType, region, city, pageToken: token },
      });
      setResults(token ? [...results, ...res.candidates] : res.candidates);
      setPageToken(res.nextPageToken);
    } catch (e: any) {
      toast.error(e?.message ?? "Search failed");
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    const picked = results.filter((r) => selected[r.placeId] && !r.alreadyImported && r.ourType);
    if (!picked.length) {
      toast.error("Pick at least one new candidate.");
      return;
    }
    setBusy(true);
    try {
      const res = await importFn({
        data: {
          candidates: picked.map((c) => ({
            placeId: c.placeId,
            name: c.name,
            address: c.address,
            lat: c.lat,
            lng: c.lng,
            phone: c.phone,
            website: c.website,
            rating: c.rating,
            ratingCount: c.ratingCount,
            ourType: c.ourType!,
            photoName: c.photoName,
            types: c.types,
            region: region || undefined,
            city: city || undefined,
          })),
        },
      });
      toast.success(`Imported ${res.imported} business${res.imported === 1 ? "" : "es"}.`);
      setSelected({});
      // Mark imported ones in current view
      setResults((prev) =>
        prev.map((r) =>
          picked.find((p) => p.placeId === r.placeId) ? { ...r, alreadyImported: true } : r,
        ),
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed");
    } finally {
      setBusy(false);
    }
  }

  const pickableCount = results.filter((r) => !r.alreadyImported && r.ourType).length;
  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Seed Directory from Google Places</h1>
        <p className="text-sm text-muted-foreground">
          Search public listings, preview, and import the ones that fit. Imported entries appear on
          the map as "Unclaimed" until the real owner claims them.
        </p>
      </div>

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
          <div>
            <Label>Region</Label>
            <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="NCR" />
          </div>
          <div>
            <Label>City / Municipality</Label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Quezon City"
            />
          </div>
          <div className="lg:col-span-2">
            <Label>Search keywords (optional)</Label>
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
      </Card>

      {results.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {results.length} result{results.length === 1 ? "" : "s"} · {pickableCount} importable
              · {selectedCount} selected
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const all: Record<string, boolean> = {};
                  results.forEach((r) => {
                    if (!r.alreadyImported && r.ourType) all[r.placeId] = true;
                  });
                  setSelected(all);
                }}
              >
                Select all importable
              </Button>
              <Button size="sm" onClick={runImport} disabled={busy || !selectedCount}>
                Import selected ({selectedCount})
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {results.map((r) => (
              <div
                key={r.placeId}
                className="flex items-start gap-3 rounded border bg-background p-3"
              >
                <Checkbox
                  checked={!!selected[r.placeId]}
                  disabled={r.alreadyImported || !r.ourType}
                  onCheckedChange={(c) => setSelected((s) => ({ ...s, [r.placeId]: !!c }))}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    {r.alreadyImported && <Badge variant="secondary">Already imported</Badge>}
                    {!r.ourType && <Badge variant="destructive">Unmapped type</Badge>}
                    {r.ourType && <Badge variant="outline">{r.ourType}</Badge>}
                    {r.rating != null && (
                      <span className="text-xs text-muted-foreground">
                        ★ {r.rating.toFixed(1)} ({r.ratingCount ?? 0})
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{r.address}</div>
                  <div className="text-xs text-muted-foreground">
                    {[r.phone, r.website].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
