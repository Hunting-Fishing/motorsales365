import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Star, Eye, Rocket, RefreshCcw, CheckCircle2, Edit, Undo2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatPHP, formatDate } from "@/lib/format";

export const Route = createFileRoute("/dashboard/")({
  component: MyListings,
});

function MyListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [soldTarget, setSoldTarget] = useState<{ id: string; title: string } | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("listings")
      .select("id,title,price_php,status,plan,boost_until,view_count,published_at,created_at,expires_at,category_slug,listing_media(url,type)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setListings(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from("pricing_settings").select("key,value").then(({ data }) => {
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => (map[r.key] = Number(r.value)));
      setPricing(map);
    });
  }, [user]);

  const remove = async (id: string) => {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Listing deleted");
      load();
    }
  };

  const confirmMarkSold = async () => {
    if (!soldTarget) return;
    const { error } = await supabase.from("listings").update({ status: "sold" }).eq("id", soldTarget.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Marked as sold");
      load();
    }
    setSoldTarget(null);
  };

  const undoSold = async (id: string) => {
    const days = pricing.listing_expiry_days ?? 60;
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    const { error } = await supabase
      .from("listings")
      .update({ status: "active", expires_at: expires.toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Listing restored to active");
      load();
    }
  };

  const togglePendingSale = async (l: any) => {
    const next = l.status === "pending_sale" ? "active" : "pending_sale";
    const message =
      next === "pending_sale"
        ? "Mark this listing as Pending Sale? It stays visible and buyers can still send offers."
        : "Cancel pending sale and return this listing to Active?";
    if (!confirm(message)) return;
    const { error } = await supabase.from("listings").update({ status: next }).eq("id", l.id);
    if (error) toast.error(error.message);
    else {
      toast.success(next === "pending_sale" ? "Marked as Pending Sale" : "Listing returned to Active");
      load();
    }

  const renew = async (id: string) => {
    const days = pricing.listing_expiry_days ?? 60;
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    const { error } = await supabase
      .from("listings")
      .update({ expires_at: expires.toISOString(), status: "active" })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Renewed for ${days} days`);
      load();
    }
  };

  const boost = async (l: any) => {
    if (!user) return;
    const fee = pricing.boost_fee_php ?? 50;
    const days = pricing.boost_renewal_days ?? 14;
    if (!confirm(`Boost this listing for ${days} days at ${formatPHP(fee)}? Payment will be confirmed by admin.`)) return;

    const until = new Date();
    until.setDate(until.getDate() + days);
    const { error } = await supabase.from("listings").update({ boost_until: until.toISOString() }).eq("id", l.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("payments").insert({
      user_id: user.id,
      listing_id: l.id,
      kind: "boost",
      amount_php: fee,
      status: "pending",
      method: "manual",
    });
    toast.success(`Boost applied. Payment pending.`);
    load();
  };

  const statusColor: Record<string, string> = {
    active: "bg-success text-success-foreground",
    pending_payment: "bg-warning text-warning-foreground",
    draft: "bg-secondary text-secondary-foreground",
    expired: "bg-muted text-muted-foreground",
    hidden: "bg-muted text-muted-foreground",
    sold: "bg-primary text-primary-foreground",
    pending_sale: "bg-warning text-warning-foreground",
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">My listings</h1>
          <p className="text-sm text-muted-foreground">Manage your active and pending ads.</p>
        </div>
        <Button asChild>
          <Link to="/sell">
            <Plus className="mr-1 h-4 w-4" />
            New listing
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading…</div>
      ) : listings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">You haven't posted anything yet.</p>
          <Button asChild className="mt-4">
            <Link to="/sell">Post your first listing</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => {
            const photo = (l.listing_media ?? []).find((m: any) => m.type === "photo");
            const boosted = l.boost_until && new Date(l.boost_until) > new Date();
            const expiring =
              l.expires_at && new Date(l.expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
            return (
              <div key={l.id} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row">
                <div className="h-24 w-32 shrink-0 overflow-hidden rounded-md bg-secondary">
                  {photo ? <img src={photo.url} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={statusColor[l.status] ?? ""}>{l.status.replace("_", " ")}</Badge>
                    {boosted && (
                      <Badge className="bg-accent text-accent-foreground">
                        <Star className="mr-1 h-3 w-3" />
                        Featured
                      </Badge>
                    )}
                    {l.plan === "upgraded" && <Badge variant="secondary">Upgraded</Badge>}
                    {expiring && l.status === "active" && (
                      <Badge variant="outline" className="border-warning text-warning">
                        Expiring soon
                      </Badge>
                    )}
                  </div>
                  <Link
                    to="/listing/$id"
                    params={{ id: l.id }}
                    className="mt-1 block font-semibold hover:text-primary"
                  >
                    {l.title}
                  </Link>
                  <div className="mt-1 text-lg font-bold text-primary">{formatPHP(l.price_php)}</div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {l.view_count} views
                    </span>
                    <span>Created {formatDate(l.created_at)}</span>
                    {l.expires_at && <span>Expires {formatDate(l.expires_at)}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/listing/$id/edit" params={{ id: l.id }}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => boost(l)}
                    disabled={l.status !== "active" || boosted}
                    title={boosted ? "Already boosted" : "Boost listing"}
                  >
                    <Rocket className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => renew(l.id)} title="Renew">
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                  {l.status !== "sold" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSoldTarget({ id: l.id, title: l.title })}
                      title="Mark sold"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => undoSold(l.id)}
                      title="Undo sold — restore to active"
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => remove(l.id)} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!soldTarget} onOpenChange={(open) => !open && setSoldTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm this item is sold</AlertDialogTitle>
            <AlertDialogDescription>
              {soldTarget ? (
                <>
                  Mark <span className="font-semibold text-foreground">"{soldTarget.title}"</span> as sold? It
                  will be removed from the active market. You can undo this later if the sale doesn't complete.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMarkSold}>Yes, mark as sold</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
