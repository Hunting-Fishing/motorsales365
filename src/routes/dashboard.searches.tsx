import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, ArrowRight, Bookmark, Bell, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatPHP } from "@/lib/format";
import { updateSavedSearchAlerts } from "@/lib/saved-search-alerts.functions";

export const Route = createFileRoute("/dashboard/searches")({
  component: SavedSearchesPage,
});

function SavedSearchesPage() {
  const { user } = useAuth();
  const [searches, setSearches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSearches(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // reason: `load` is recreated each render; depend only on user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("saved_searches").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed");
      load();
    }
  };

  const setAlert = async (id: string, frequency: "off" | "daily" | "instant") => {
    try {
      await updateSavedSearchAlerts({ data: { id, frequency } });
      setSearches((rows) =>
        rows.map((r) => (r.id === id ? { ...r, alert_frequency: frequency } : r)),
      );
      toast.success(
        frequency === "off"
          ? "Alerts turned off"
          : frequency === "instant"
          ? "Instant alerts enabled"
          : "Daily digest enabled",
      );
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update");
    }
  };

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Saved searches</h1>
      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading…</div>
      ) : searches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          <Bookmark className="mx-auto mb-3 h-8 w-8" />
          You haven't saved any searches yet. From any browse page, set your filters and click "Save
          search".
        </div>
      ) : (
        <div className="space-y-3">
          {searches.map((s) => {
            const q = s.query ?? {};
            return (
              <div key={s.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">{s.category_slug ?? "all categories"}</Badge>
                      {q.q && <span>“{q.q}”</span>}
                      {q.region && <span>· {q.region}</span>}
                      {(q.min || q.max) && (
                        <span>
                          · {q.min ? formatPHP(q.min) : "₱0"}–{q.max ? formatPHP(q.max) : "any"}
                        </span>
                      )}
                      <span>· saved {formatDate(s.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={s.alert_frequency ?? "off"}
                      onValueChange={(v: any) => setAlert(s.id, v)}
                    >
                      <SelectTrigger className="h-8 w-[150px] text-xs">
                        <Bell className="h-3 w-3 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Alerts off</SelectItem>
                        <SelectItem value="daily">Daily digest</SelectItem>
                        <SelectItem value="instant">
                          <span className="inline-flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-amber-500" /> Instant (Premium)
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button asChild size="sm">
                      <Link
                        to="/browse/$category"
                        params={{ category: s.category_slug || "all" }}
                        search={{
                          q: q.q ?? undefined,
                          region: q.region ?? undefined,
                          min: q.min ?? undefined,
                          max: q.max ?? undefined,
                          sort: q.sort ?? undefined,
                        }}
                      >
                        Run search <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
