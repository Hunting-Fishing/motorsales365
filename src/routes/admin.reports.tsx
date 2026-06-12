import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGroupTabs, ACTIVITY_TABS } from "@/components/admin/admin-group-tabs";
import { confirm } from "@/components/ui/confirm-dialog";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, ShieldOff, CheckCircle2, Megaphone, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/reports")({
  component: AdminReports,
  errorComponent: RouteError,
  notFoundComponent: () => <RouteNotFound />,
  head: () => ({
    meta: [
      { title: "Reports — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AdminReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    let q = supabase
      .from("reports")
      .select(
        "id,reason,category,details,status,created_at,reporter_id,listing_id,public_summary,made_public_at,listings:listing_id(title,status,user_id)",
      )
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setReports(data ?? []);
  };
  useEffect(() => {
    load();
    // reason: `load` is recreated each render; depend only on its inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (
      !(await confirm({
        title: "Permanently delete this listing? This cannot be undone.",
        destructive: true,
      }))
    )
      return;
    await supabase.from("listings").delete().eq("id", listingId);
    await supabase.from("reports").update({ status: "resolved" }).eq("id", reportId);
    toast.success("Listing deleted");
    load();
  };

  const publishSummary = async (id: string) => {
    const text = (drafts[id] ?? "").trim();
    if (!text) {
      toast.error("Enter a public summary first.");
      return;
    }
    const { error } = await supabase
      .from("reports")
      .update({ public_summary: text, made_public_at: new Date().toISOString(), made_public_by: user?.id ?? null })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Public summary published — visitors can now see it on the listing.");
    load();
  };

  const unpublishSummary = async (id: string) => {
    const { error } = await supabase
      .from("reports")
      .update({ public_summary: null, made_public_at: null, made_public_by: null })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Public summary removed.");
    load();
  };

  return (
    <div>
      <AdminGroupTabs title="Activity" tabs={ACTIVITY_TABS} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Reports</h1>
        <div className="flex gap-1 rounded-md border border-border bg-card p-1">
          {(["open", "resolved", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-3 py-1 text-xs font-medium capitalize ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
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
                    <span className="text-xs text-muted-foreground">
                      {formatDate(r.created_at)}
                    </span>
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => hideListing(r.listing_id, r.id)}
                    >
                      <ShieldOff className="mr-1 h-4 w-4" />
                      Hide listing
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeListing(r.listing_id, r.id)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete
                    </Button>
                    <Button size="sm" onClick={() => resolve(r.id)}>
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Dismiss
                    </Button>
                  </div>
                )}
              </div>

              {/* Public summary controls — what visitors will see on the listing page */}
              <div className="mt-4 rounded-md border border-dashed border-border bg-background/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <Megaphone className="h-3.5 w-3.5" />
                    Public summary
                    {r.public_summary && (
                      <Badge variant="secondary" className="ml-1">
                        Published {r.made_public_at ? `· ${formatDate(r.made_public_at)}` : ""}
                      </Badge>
                    )}
                  </div>
                  {r.public_summary && (
                    <Button size="sm" variant="ghost" onClick={() => unpublishSummary(r.id)}>
                      <EyeOff className="mr-1 h-3.5 w-3.5" />
                      Unpublish
                    </Button>
                  )}
                </div>
                <Textarea
                  value={drafts[r.id] ?? r.public_summary ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                  placeholder="Short, neutral summary visible to all visitors. Do not include reporter names or unverified claims."
                  className="mt-2 min-h-20 text-sm"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    Reporter identity and raw details are never shown publicly — only this summary.
                  </p>
                  <Button size="sm" onClick={() => publishSummary(r.id)}>
                    {r.public_summary ? "Update summary" : "Publish public summary"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
