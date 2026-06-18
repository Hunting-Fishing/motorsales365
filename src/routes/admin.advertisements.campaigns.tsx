import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Megaphone, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { listAds, upsertAd, deleteAd } from "@/lib/ads.functions";

export const Route = createFileRoute("/admin/advertisements/campaigns")({
  component: AdminAdCampaignsPage,
  head: () => ({
    meta: [{ title: "Ad campaigns — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});

const PLACEMENTS = [
  "home_carousel",
  "browse_top",
  "rides_top",
  "listing_sidebar",
  "export_top",
  "shop_top",
  "shop_sidebar",
  "category_banner",
] as const;
const STATUSES = ["draft", "scheduled", "active", "paused", "ended"] as const;

const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-500 text-white",
  active: "bg-emerald-500 text-white",
  paused: "bg-amber-500 text-white",
  ended: "bg-destructive text-destructive-foreground",
};

const EMPTY: any = {
  title: "",
  image_url: "",
  target_url: "",
  placement: "home_carousel",
  status: "draft",
  priority: 0,
};

function AdminAdCampaignsPage() {
  const { isAdmin, canManageAds } = useAuth();
  const hasAccess = isAdmin || canManageAds;
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    try {
      const res = await listAds();
      setAds(res.ads as any[]);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) load();
  }, [hasAccess]);

  if (!hasAccess) {
    return <div className="p-6 text-sm text-muted-foreground">Ads manager role required.</div>;
  }

  const save = async () => {
    try {
      const p: any = { ...editing };
      p.priority = Number(p.priority ?? 0);
      Object.keys(p).forEach((k) => {
        if (p[k] === "" || p[k] === null) delete p[k];
      });
      if (!p.title || !p.image_url || !p.target_url || !p.placement) {
        toast.error("Title, image URL, target URL and placement are required.");
        return;
      }
      await upsertAd({ data: p });
      toast.success(editing.id ? "Campaign updated" : "Campaign created");
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this ad campaign?")) return;
    try {
      await deleteAd({ data: { id } });
      toast.success("Deleted");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Delete failed");
    }
  };

  const visible = ads.filter((a) => filter === "all" || a.placement === filter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6" /> Ad Campaigns
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage sponsored placements across the home carousel, browse pages, category banners, and shop.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All placements</SelectItem>
              {PLACEMENTS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setEditing({ ...EMPTY })}>
            <Plus className="h-4 w-4 mr-1" /> New campaign
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="rounded-md border p-6 text-sm text-muted-foreground">No ad campaigns yet.</div>
      ) : (
        <div className="grid gap-3">
          {visible.map((a) => (
            <div key={a.id} className="rounded-md border p-4 flex items-start gap-4">
              {a.image_url && (
                <img
                  src={a.image_url}
                  alt={a.title}
                  className="h-20 w-32 rounded object-cover border bg-muted"
                  loading="lazy"
                />
              )}
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{a.title}</span>
                  <Badge className={STATUS_TONE[a.status] ?? ""}>{a.status}</Badge>
                  <Badge variant="outline">{a.placement}</Badge>
                  {a.category_slug && <Badge variant="secondary">{a.category_slug}</Badge>}
                  <Badge variant="outline">priority {a.priority ?? 0}</Badge>
                </div>
                {a.caption && <p className="text-sm text-muted-foreground">{a.caption}</p>}
                <p className="text-xs text-muted-foreground">
                  {a.advertiser_name ?? "—"}
                  {a.starts_at ? ` · starts ${formatDate(a.starts_at)}` : ""}
                  {a.ends_at ? ` · ends ${formatDate(a.ends_at)}` : ""}
                </p>
                <a
                  href={a.target_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                >
                  Target <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing({ ...a })}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(a.id)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit ad campaign" : "New ad campaign"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div>
                <Label>Title *</Label>
                <Input
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Caption</Label>
                <Textarea
                  rows={2}
                  value={editing.caption ?? ""}
                  onChange={(e) => setEditing({ ...editing, caption: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Image URL *</Label>
                  <Input
                    value={editing.image_url ?? ""}
                    onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Target URL *</Label>
                  <Input
                    value={editing.target_url ?? ""}
                    onChange={(e) => setEditing({ ...editing, target_url: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Placement *</Label>
                  <Select
                    value={editing.placement}
                    onValueChange={(v) => setEditing({ ...editing, placement: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLACEMENTS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={editing.status}
                    onValueChange={(v) => setEditing({ ...editing, status: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category slug (category_banner only)</Label>
                  <Input
                    value={editing.category_slug ?? ""}
                    onChange={(e) => setEditing({ ...editing, category_slug: e.target.value })}
                    placeholder="cars, parts…"
                  />
                </div>
                <div>
                  <Label>Priority</Label>
                  <Input
                    type="number"
                    value={editing.priority ?? 0}
                    onChange={(e) => setEditing({ ...editing, priority: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Advertiser name</Label>
                  <Input
                    value={editing.advertiser_name ?? ""}
                    onChange={(e) => setEditing({ ...editing, advertiser_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Advertiser email</Label>
                  <Input
                    type="email"
                    value={editing.advertiser_email ?? ""}
                    onChange={(e) => setEditing({ ...editing, advertiser_email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Starts at</Label>
                  <Input
                    type="datetime-local"
                    value={editing.starts_at ? String(editing.starts_at).slice(0, 16) : ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Ends at</Label>
                  <Input
                    type="datetime-local"
                    value={editing.ends_at ? String(editing.ends_at).slice(0, 16) : ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
