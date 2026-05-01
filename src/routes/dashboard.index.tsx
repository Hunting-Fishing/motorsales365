import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Star, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPHP, formatDate } from "@/lib/format";

export const Route = createFileRoute("/dashboard/")({
  component: MyListings,
});

function MyListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("listings")
      .select("id,title,price_php,status,plan,boost_until,view_count,published_at,created_at,category_slug,listing_media(url,type)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setListings(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const remove = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  const statusColor: Record<string, string> = {
    active: "bg-success text-success-foreground",
    pending_payment: "bg-warning text-warning-foreground",
    draft: "bg-secondary text-secondary-foreground",
    expired: "bg-muted text-muted-foreground",
    hidden: "bg-muted text-muted-foreground",
    sold: "bg-primary text-primary-foreground",
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">My listings</h1>
          <p className="text-sm text-muted-foreground">Manage your active and pending ads.</p>
        </div>
        <Button asChild><Link to="/sell"><Plus className="mr-1 h-4 w-4" />New listing</Link></Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading…</div>
      ) : listings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">You haven't posted anything yet.</p>
          <Button asChild className="mt-4"><Link to="/sell">Post your first listing</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => {
            const photo = (l.listing_media ?? []).find((m: any) => m.type === "photo");
            const boosted = l.boost_until && new Date(l.boost_until) > new Date();
            return (
              <div key={l.id} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row">
                <div className="h-24 w-32 shrink-0 overflow-hidden rounded-md bg-secondary">
                  {photo ? <img src={photo.url} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={statusColor[l.status] ?? ""}>{l.status.replace("_", " ")}</Badge>
                    {boosted && <Badge className="bg-accent text-accent-foreground"><Star className="mr-1 h-3 w-3" />Featured</Badge>}
                    {l.plan === "upgraded" && <Badge variant="secondary">Upgraded</Badge>}
                  </div>
                  <Link to="/listing/$id" params={{ id: l.id }} className="mt-1 block font-semibold hover:text-primary">
                    {l.title}
                  </Link>
                  <div className="mt-1 text-lg font-bold text-primary">{formatPHP(l.price_php)}</div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{l.view_count} views</span>
                    <span>Created {formatDate(l.created_at)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button asChild variant="outline" size="sm"><Link to="/listing/$id" params={{ id: l.id }}>View</Link></Button>
                  <Button variant="outline" size="sm" onClick={() => remove(l.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
