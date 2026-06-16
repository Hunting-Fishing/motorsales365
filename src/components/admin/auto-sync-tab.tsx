import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Play, Trash2, RefreshCw, ExternalLink, MapPin, AlertTriangle } from "lucide-react";
import { AVAILABLE_PLACE_TYPES } from "@/lib/business-seed.functions";
import {
  listDiscoverySearches,
  createDiscoverySearch,
  updateDiscoverySearch,
  deleteDiscoverySearch,
  listDiscoveryQueue,
  dismissQueueItems,
  importQueueItems,
  runDiscoverySyncNow,
} from "@/lib/business-discovery-sync.functions";
import { PhLocationPicker } from "@/components/admin/ph-location-picker";

type SearchRow = {
  id: string;
  query: string;
  city: string | null;
  region: string | null;
  place_type: string;
  active: boolean;
  last_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
  last_found_count: number;
  last_new_count: number;
};

type QueueRow = {
  id: string;
  source: string;
  external_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  our_type: string | null;
  region: string | null;
  city: string | null;
  diff: Record<string, { from: unknown; to: unknown }> | null;
  existing_business_id: string | null;
  first_seen_at: string;
  last_seen_at: string;
};

function fmtTime(t: string | null) {
  if (!t) return "never";
  const d = new Date(t);
  return d.toLocaleString();
}

export function AutoSyncTab() {
  const list = useServerFn(listDiscoverySearches);
  const create = useServerFn(createDiscoverySearch);
  const update = useServerFn(updateDiscoverySearch);
  const del = useServerFn(deleteDiscoverySearch);
  const listQ = useServerFn(listDiscoveryQueue);
  const dismiss = useServerFn(dismissQueueItems);
  const importNow = useServerFn(importQueueItems);
  const runNow = useServerFn(runDiscoverySyncNow);

  const [searches, setSearches] = useState<SearchRow[]>([]);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [queueQuery, setQueueQuery] = useState("");

  const [newQuery, setNewQuery] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newRegion, setNewRegion] = useState("");
  const [newType, setNewType] = useState<string>(AVAILABLE_PLACE_TYPES[0]);

  async function refresh() {
    setLoading(true);
    try {
      const [s, q] = await Promise.all([list({}), listQ({ data: { status: "pending", limit: 100 } })]);
      setSearches(s.searches as SearchRow[]);
      setQueue(q.rows as QueueRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addSearch() {
    if (newQuery.trim().length < 2) {
      toast.error("Query is too short.");
      return;
    }
    try {
      await create({
        data: {
          query: newQuery.trim(),
          city: newCity.trim() || null,
          region: newRegion.trim() || null,
          placeType: newType as any,
        },
      });
      setNewQuery("");
      setNewCity("");
      setNewRegion("");
      toast.success("Saved search added.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add search");
    }
  }

  async function toggleActive(s: SearchRow) {
    await update({ data: { id: s.id, active: !s.active } });
    refresh();
  }

  async function removeSearch(s: SearchRow) {
    if (!confirm(`Delete saved search "${s.query}"?`)) return;
    await del({ data: { id: s.id } });
    refresh();
  }

  async function runAll(searchIds?: string[]) {
    setRunning(true);
    try {
      const res = await runNow({ data: { searchIds } });
      toast.success(
        `Sync complete · ${res.inserted} new · ${res.refreshed} refreshed · ${res.updates_detected} updates`,
      );
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setRunning(false);
    }
  }

  const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
  const normalizedQueueQuery = queueQuery.trim().toLowerCase();
  const filteredQueue = normalizedQueueQuery
    ? queue.filter((r) =>
        [r.name, r.address, r.phone, r.website, r.city, r.region, r.our_type]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQueueQuery)),
      )
    : queue;

  async function importSelected() {
    if (!selectedIds.length) return;
    try {
      const res = await importNow({ data: { ids: selectedIds } });
      toast.success(`Imported ${res.imported}${(res as any).merged ? ` · merged ${(res as any).merged} duplicate(s)` : ""}${res.skipped ? ` · skipped ${res.skipped} (no type/coords)` : ""}`);
      setSelected({});
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    }
  }

  async function dismissSelected() {
    if (!selectedIds.length) return;
    await dismiss({ data: { ids: selectedIds } });
    setSelected({});
    refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Saved searches</h3>
            <p className="text-xs text-muted-foreground">
              Each active search runs hourly. Results land in the queue below for your review.
            </p>
          </div>
          <Button size="sm" onClick={() => runAll()} disabled={running}>
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Run all now
          </Button>
        </div>

        <div className="grid gap-2 md:grid-cols-5">
          <div className="md:col-span-2">
            <Label className="text-xs">Query</Label>
            <Input value={newQuery} onChange={(e) => setNewQuery(e.target.value)} placeholder="e.g. used car dealership" />
          </div>
          <PhLocationPicker
            region={newRegion}
            city={newCity}
            onChange={(v) => {
              setNewRegion(v.region);
              setNewCity(v.city);
            }}
          />
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AVAILABLE_PLACE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={addSearch}>Add search</Button>
        </div>

        <div className="mt-4 space-y-2">
          {searches.length === 0 && (
            <p className="text-sm text-muted-foreground">No saved searches yet.</p>
          )}
          {searches.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded border p-3">
              <Switch checked={s.active} onCheckedChange={() => toggleActive(s)} />
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">
                  {s.query} <span className="text-muted-foreground">· {s.place_type}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {[s.city, s.region].filter(Boolean).join(", ") || "no location filter"} ·
                  last run {fmtTime(s.last_run_at)}
                  {s.last_status === "ok" && ` · ${s.last_found_count} found, ${s.last_new_count} new`}
                  {s.last_status === "error" && (
                    <span className="text-destructive"> · error: {s.last_error?.slice(0, 80)}</span>
                  )}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => runAll([s.id])} disabled={running}>
                <Play className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => removeSearch(s)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">
              Pending queue ({filteredQueue.length}{filteredQueue.length !== queue.length ? `/${queue.length}` : ""})
            </h3>
            <p className="text-xs text-muted-foreground">
              New businesses discovered by the sync, plus updates detected on already-imported ones.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => refresh()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={dismissSelected} disabled={!selectedIds.length}>
              Dismiss ({selectedIds.length})
            </Button>
            <Button size="sm" onClick={importSelected} disabled={!selectedIds.length}>
              Import ({selectedIds.length})
            </Button>
          </div>
        </div>

        <div className="mb-3 max-w-xl">
          <Label className="text-xs">Search pending queue</Label>
          <Input
            value={queueQuery}
            onChange={(e) => setQueueQuery(e.target.value)}
            placeholder="Business name, address, phone, website, city…"
          />
        </div>

        {queue.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing pending. The hourly sync will refill this list.</p>
        ) : filteredQueue.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending queue items match this search.</p>
        ) : (
          <div className="space-y-2">
            {filteredQueue.map((r) => {
              const importable = !!r.our_type && r.lat != null && r.lng != null;
              return (
                <div key={r.id} className="flex items-start gap-3 rounded border p-3">
                  <Checkbox
                    checked={!!selected[r.id]}
                    onCheckedChange={(c) => setSelected((s) => ({ ...s, [r.id]: !!c }))}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{r.name}</span>
                      {r.existing_business_id ? (
                        <Badge variant="secondary">Update detected</Badge>
                      ) : (
                        <Badge>New</Badge>
                      )}
                      {r.our_type ? <Badge variant="outline">{r.our_type}</Badge> : (
                        <Badge variant="destructive">No type match</Badge>
                      )}
                      {r.lat == null && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> No coords
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                      {r.address && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{r.address}
                        </span>
                      )}
                      {r.phone && <span>{r.phone}</span>}
                      {r.website && (
                        <a className="inline-flex items-center gap-1 underline" href={r.website} target="_blank" rel="noreferrer">
                          website <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <span>first seen {fmtTime(r.first_seen_at)}</span>
                    </div>
                    {r.diff && Object.keys(r.diff).length > 0 && (
                      <div className="mt-2 rounded bg-muted/40 p-2 text-xs">
                        <div className="mb-1 font-medium">Changes vs current record:</div>
                        <ul className="space-y-0.5">
                          {Object.entries(r.diff).map(([k, v]) => (
                            <li key={k}>
                              <span className="font-mono">{k}</span>:{" "}
                              <span className="line-through text-muted-foreground">{String(v.from ?? "—")}</span>{" "}
                              → <span>{String(v.to ?? "—")}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!importable && !r.our_type && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Google types: {r.address ? "" : ""}—no auto-map. Dismiss or re-add manually via Google tab.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
