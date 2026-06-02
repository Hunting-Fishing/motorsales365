import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Check,
  X,
  Eye,
  EyeOff,
  Star,
  Store as StoreIcon,
  ArrowRightLeft,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ImportPlacesPanel } from "@/components/admin/import-places-panel";
import { TransferBusinessOwnerDialog } from "@/components/admin/transfer-business-owner-dialog";

export const Route = createFileRoute("/admin/businesses")({
  component: AdminBusinessesPage,
});

type Row = {
  id: string;
  slug: string;
  name: string;
  type_slug: string;
  status: string;
  city: string | null;
  region: string | null;
  featured: boolean;
  created_at: string;
  rating_avg: number;
  rating_count: number;
  owner_id: string | null;
};

function AdminBusinessesPage() {
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [transferTarget, setTransferTarget] = useState<Row | null>(null);

  const load = async (status: string, q?: string) => {
    setLoading(true);
    let query = (supabase as any)
      .from("businesses")
      .select(
        "id,slug,name,type_slug,status,city,region,featured,created_at,rating_avg,rating_count,owner_id",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (status !== "all") query = query.eq("status", status);
    if (q && q.trim()) {
      const term = q.trim();
      query = query.or(
        `name.ilike.%${term}%,slug.ilike.%${term}%,city.ilike.%${term}%,region.ilike.%${term}%`,
      );
    }
    const { data } = await query;
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (tab !== "import") load(tab, search); /* eslint-disable-next-line */
  }, [tab]);

  const moderate = async (id: string, patch: Partial<Row>) => {
    const { error } = await (supabase as any).from("businesses").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Updated");
      load(tab, search);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Businesses moderation</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="hidden">Hidden</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="import">Import nearby</TabsTrigger>
        </TabsList>
        {tab === "import" ? (
          <TabsContent value="import" className="mt-4">
            <ImportPlacesPanel />
          </TabsContent>
        ) : (
          <TabsContent value={tab} className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name, slug, city, region…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") load(tab, search);
                }}
              />
              <Button onClick={() => load(tab, search)} variant="outline">
                <Search className="mr-1 h-4 w-4" />
                Search
              </Button>
            </div>
            {loading ? (
              <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
            ) : rows.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                <StoreIcon className="mx-auto mb-2 h-6 w-6 opacity-60" />
                Nothing here.
              </Card>
            ) : (
              <div className="space-y-2">
                {rows.map((b) => (
                  <Card
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/businesses/$slug"
                          params={{ slug: b.slug }}
                          className="truncate font-semibold hover:underline"
                        >
                          {b.name}
                        </Link>
                        {b.featured && <Badge>Featured</Badge>}
                        <Badge variant="outline">{b.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {b.type_slug} ·{" "}
                        {[b.city, b.region].filter(Boolean).join(", ") || "no location"}
                        {b.rating_count > 0 && (
                          <>
                            {" "}
                            · <Star className="inline h-3 w-3 fill-yellow-500 text-yellow-500" />{" "}
                            {Number(b.rating_avg).toFixed(1)} ({b.rating_count})
                          </>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Owner: <code>{b.owner_id ?? "none"}</code>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {b.status !== "active" && (
                        <Button
                          size="sm"
                          onClick={() => moderate(b.id, { status: "active" } as any)}
                        >
                          <Check className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                      )}
                      {b.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moderate(b.id, { status: "rejected" } as any)}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                      )}
                      {b.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moderate(b.id, { status: "hidden" } as any)}
                        >
                          <EyeOff className="mr-1 h-4 w-4" />
                          Hide
                        </Button>
                      )}
                      {b.status === "hidden" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moderate(b.id, { status: "active" } as any)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Unhide
                        </Button>
                      )}
                      {b.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moderate(b.id, { featured: !b.featured })}
                        >
                          <Star
                            className={`mr-1 h-4 w-4 ${b.featured ? "fill-yellow-500 text-yellow-500" : ""}`}
                          />
                          {b.featured ? "Unfeature" : "Feature"}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setTransferTarget(b)}>
                        <ArrowRightLeft className="mr-1 h-4 w-4" />
                        Transfer owner
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {transferTarget && (
        <TransferBusinessOwnerDialog
          open={!!transferTarget}
          onOpenChange={(o) => {
            if (!o) setTransferTarget(null);
          }}
          businessId={transferTarget.id}
          businessName={transferTarget.name}
          currentOwnerId={transferTarget.owner_id}
          onTransferred={() => {
            setTransferTarget(null);
            load(tab, search);
          }}
        />
      )}
    </div>
  );
}
