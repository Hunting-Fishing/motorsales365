import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, ShieldOff, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/reports")({
  component: AdminReports,
});

function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");

  const load = async () => {
    let q = supabase
      .from("reports")
      .select("id,reason,details,status,created_at,reporter_id,listing_id,listings:listing_id(title,status,user_id)")
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setReports(data ?? []);
  };
  useEffect(() => {
    load();
  }, [filter]);

  const resolve = async (id: string) => {
    await supabase.from("reports").update({ status: "resolved" }).eq("id", id);
    toast.success("Marked resolved");
    load();
  };

  const hideListing = async (listingId: string, reportId: string) => {
    await supabase.from("listings").update({ status: "hidden" }).eq("id", listingId);
    await supabase.from("reports").update({ status: "resolved" }).eq("id", reportId);
    toast.success("Listing hidden");
    load();
  };

  const removeListing = async (listingId: string, reportId: string) => {
    if (!confirm("Permanently delete this listing? This cannot be undone.")) return;
    await supabase.from("listings").delete().eq("id", listingId);
    await supabase.from("reports").update({ status: "resolved" }).eq("id", reportId);
    toast.success("Listing deleted");
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Reports</h1>
        <div className="flex gap-1 rounded-md border border-border bg-card p-1">
          {(["open", "resolved", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-3 py-1 text-xs font-medium capitalize ${
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          No reports.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={r.status === "resolved" ? "secondary" : "destructive"}>
                      {r.status}
                    </Badge>
                    {r.listings?.status && (
                      <Badge variant="outline">listing: {r.listings.status}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                  </div>
                  <Link
                    to="/listing/$id"
                    params={{ id: r.listing_id }}
                    className="mt-1 block font-medium hover:text-primary"
                  >
                    {r.listings?.title ?? "Listing"}
                  </Link>
                  <p className="mt-1 text-sm font-medium">{r.reason}</p>
                  {r.details && <p className="mt-1 text-sm text-muted-foreground">{r.details}</p>}
                </div>
                {r.status !== "resolved" && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => hideListing(r.listing_id, r.id)}>
                      <ShieldOff className="mr-1 h-4 w-4" />Hide listing
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => removeListing(r.listing_id, r.id)}>
                      <Trash2 className="mr-1 h-4 w-4" />Delete
                    </Button>
                    <Button size="sm" onClick={() => resolve(r.id)}>
                      <CheckCircle2 className="mr-1 h-4 w-4" />Dismiss
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
