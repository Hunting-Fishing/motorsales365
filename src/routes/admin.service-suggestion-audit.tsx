import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { listServiceSuggestionAudit } from "@/lib/admin-service-suggestions.functions";

export const Route = createFileRoute("/admin/service-suggestion-audit")({
  component: ServiceSuggestionAuditPage,
});

type AuditRow = {
  id: string;
  suggestion_id: string;
  actor_id: string;
  action: "approved" | "rejected" | "merged";
  catalog_id: string | null;
  note: string | null;
  created_at: string;
  suggestion: { proposed_title: string; business_type_slug: string } | null;
  actor: { id: string; full_name: string | null } | null;
};

function ServiceSuggestionAuditPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const listFn = useServerFn(listServiceSuggestionAudit);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await listFn({ data: {} });
        if (alive) setRows(data as any);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [authLoading, isAdmin, listFn]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!isAdmin) {
    return <div className="p-6 text-sm text-muted-foreground">Admins only.</div>;
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Service Suggestion Audit Log</h1>
          <p className="text-sm text-muted-foreground">
            Every approve, merge, or reject decision on custom service suggestions.
          </p>
        </div>
        <Link
          to="/admin/service-suggestions"
          className="text-sm text-primary hover:underline"
        >
          ← Back to queue
        </Link>
      </header>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          No decisions recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Service</th>
                <th className="px-3 py-2">Admin</th>
                <th className="px-3 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={
                        r.action === "rejected"
                          ? "destructive"
                          : r.action === "merged"
                            ? "secondary"
                            : "default"
                      }
                    >
                      {r.action}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">
                      {r.suggestion?.proposed_title ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.suggestion?.business_type_slug ?? ""}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div>{r.actor?.full_name ?? "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.actor_id.slice(0, 8)}…
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.note ? r.note : <span className="opacity-50">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
