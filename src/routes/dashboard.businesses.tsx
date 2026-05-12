import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Store as StoreIcon, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/businesses")({
  component: MyBusinessesPage,
});

type Row = { id: string; slug: string; name: string; type_slug: string; status: string; city: string | null; region: string | null; rating_avg: number; rating_count: number };

function statusBadge(s: string) {
  if (s === "active") return <Badge className="bg-emerald-600">Active</Badge>;
  if (s === "pending") return <Badge variant="secondary">Pending review</Badge>;
  if (s === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="outline">{s}</Badge>;
}

function MyBusinessesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("businesses")
        .select("id,slug,name,type_slug,status,city,region,rating_avg,rating_count")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      setRows(data ?? []); setLoading(false);
    })();
  }, [user]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">My businesses</h1>
        <Button asChild size="sm"><Link to="/businesses/submit"><Plus className="mr-1 h-4 w-4" />Add business</Link></Button>
      </div>
      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <StoreIcon className="mx-auto mb-2 h-6 w-6 opacity-60" />
          You haven't listed any business yet.
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((b) => (
            <Card key={b.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link to="/businesses/$slug" params={{ slug: b.slug }} className="truncate font-semibold hover:underline">{b.name}</Link>
                  {statusBadge(b.status)}
                </div>
                <div className="text-xs text-muted-foreground">{[b.city, b.region].filter(Boolean).join(" · ")}</div>
              </div>
              <div className="text-xs text-muted-foreground">{b.rating_count} review{b.rating_count === 1 ? "" : "s"}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
