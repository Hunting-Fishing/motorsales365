import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/dashboard/wanted")({
  component: DashboardWantedPage,
  head: () => ({
    meta: [
      { title: "My wanted posts — 365 Motor Sales" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Row = {
  id: string;
  title: string;
  category: string;
  status: string;
  response_count: number;
  created_at: string;
  expires_at: string;
};

function DashboardWantedPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("wanted_posts")
        .select("id,title,category,status,response_count,created_at,expires_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [user, refreshKey]);

  async function remove(id: string) {
    if (!confirm("Delete this wanted post?")) return;
    const { error } = await (supabase as any).from("wanted_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setRefreshKey((k) => k + 1);
  }

  async function setStatus(id: string, status: "open" | "closed") {
    const { error } = await (supabase as any)
      .from("wanted_posts")
      .update({ status })
      .eq("id", id);
    if (error) return toast.error(error.message);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-display text-2xl font-bold">My wanted posts</h1>
            <p className="text-sm text-muted-foreground">
              Buyer requests you posted, plus the responses they've received.
            </p>
          </div>
        </div>
        <Button asChild>
          <Link to="/wanted/new">
            <Plus className="mr-1 h-4 w-4" /> New
          </Link>
        </Button>
      </header>

      {loading ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p>You haven't posted any wanted requests yet.</p>
          <Button asChild className="mt-4">
            <Link to="/wanted/new">Post one now</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to="/wanted/$id"
                    params={{ id: r.id }}
                    className="font-medium hover:text-primary"
                  >
                    {r.title}
                  </Link>
                  <Badge variant="outline" className="capitalize">
                    {r.category}
                  </Badge>
                  <Badge variant={r.status === "open" ? "default" : "secondary"} className="capitalize">
                    {r.status}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {r.response_count} {r.response_count === 1 ? "response" : "responses"} · Posted{" "}
                  {formatDate(r.created_at)} · expires {formatDate(r.expires_at)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {r.status === "open" ? (
                  <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "closed")}>
                    Close
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "open")}>
                    Reopen
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
