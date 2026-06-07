import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Check, RefreshCw, RotateCcw, X, MapPin } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  listLocationCorrections,
  reviewLocationCorrection,
} from "@/lib/location-corrections.functions";

export const Route = createFileRoute("/admin/location-corrections")({
  component: AdminLocationCorrections,
});

type Row = {
  id: string;
  business_id: string;
  proposed_lat: number;
  proposed_lng: number;
  previous_lat: number | null;
  previous_lng: number | null;
  note: string | null;
  submitter_user_id: string | null;
  status: "pending" | "approved" | "rejected" | "reverted";
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  businesses: { name: string; slug: string } | null;
};

function fmt(ts: string) {
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function statusBadge(s: Row["status"]) {
  switch (s) {
    case "pending":
      return <Badge className="bg-amber-500 hover:bg-amber-500/90 text-white">Pending</Badge>;
    case "approved":
      return <Badge className="bg-emerald-600 hover:bg-emerald-600/90 text-white">Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    case "reverted":
      return <Badge variant="secondary">Reverted</Badge>;
  }
}

function AdminLocationCorrections() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Row["status"] | "all">("pending");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const list = useServerFn(listLocationCorrections);
  const review = useServerFn(reviewLocationCorrection);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await list({
        data: {
          status,
          fromDate: fromDate || null,
          toDate: toDate || null,
          query: query || null,
          limit: 100,
        },
      });
      setRows(res.rows as Row[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [list, status, fromDate, toDate, query]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("blc_admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "business_location_corrections" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  async function act(id: string, action: "approve" | "reject" | "revert") {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await review({ data: { id, action } });
      toast.success(
        action === "approve"
          ? "Approved & applied"
          : action === "reject"
            ? "Rejected"
            : "Reverted to previous location",
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold">Location corrections</h1>
          <p className="text-sm text-muted-foreground">
            User-submitted map pin fixes. Approve to apply to the business, or revert if needed.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="mb-4 grid gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-4">
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="reverted">Reverted</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">From</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Business name / slug</Label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No corrections match these filters.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const dist =
              r.previous_lat != null && r.previous_lng != null
                ? haversineKm(
                    { lat: Number(r.previous_lat), lng: Number(r.previous_lng) },
                    { lat: Number(r.proposed_lat), lng: Number(r.proposed_lng) },
                  )
                : null;
            return (
              <div
                key={r.id}
                className="rounded-lg border border-border bg-card p-4 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {r.businesses ? (
                        <Link
                          to="/businesses/$slug"
                          params={{ slug: r.businesses.slug }}
                          className="font-semibold hover:underline"
                          target="_blank"
                        >
                          {r.businesses.name}
                        </Link>
                      ) : (
                        <span className="font-semibold text-muted-foreground">
                          (deleted business)
                        </span>
                      )}
                      {statusBadge(r.status)}
                      {dist != null && (
                        <Badge variant="outline">{dist.toFixed(2)} km moved</Badge>
                      )}
                    </div>
                    <div className="mt-1 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Current:{" "}
                        {r.previous_lat != null && r.previous_lng != null
                          ? `${Number(r.previous_lat).toFixed(6)}, ${Number(r.previous_lng).toFixed(6)}`
                          : "—"}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-primary" />
                        Proposed:{" "}
                        {`${Number(r.proposed_lat).toFixed(6)}, ${Number(r.proposed_lng).toFixed(6)}`}
                      </div>
                    </div>
                    {r.note && (
                      <div className="mt-2 rounded bg-muted/40 p-2 text-xs italic">
                        “{r.note}”
                      </div>
                    )}
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Submitted {fmt(r.created_at)}
                      {r.submitter_user_id ? " · by signed-in user" : " · anonymous"}
                      {r.reviewed_at ? ` · reviewed ${fmt(r.reviewed_at)}` : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <a
                      href={`https://www.google.com/maps?q=${r.proposed_lat},${r.proposed_lng}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-xs text-primary hover:underline"
                    >
                      Open in Google Maps ↗
                    </a>
                    {r.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => act(r.id, "approve")}
                          disabled={!!busy[r.id]}
                        >
                          <Check className="mr-1 h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => act(r.id, "reject")}
                          disabled={!!busy[r.id]}
                        >
                          <X className="mr-1 h-3.5 w-3.5" /> Reject
                        </Button>
                      </>
                    )}
                    {r.status === "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => act(r.id, "revert")}
                        disabled={!!busy[r.id]}
                      >
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> Revert
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
