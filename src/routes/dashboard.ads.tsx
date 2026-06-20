import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Megaphone, Plus, Pencil, Pause, ExternalLink, ArrowLeft } from "lucide-react";
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
import { FormFeedbackLink } from "@/components/form-feedback";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/format";
import {
  listMyAdvertisements,
  submitMyAdvertisement,
  pauseMyAdvertisement,
} from "@/lib/advertiser-portal.functions";
import { CreativeNotificationsPanel } from "@/components/advertise/creative-notifications-panel";

export const Route = createFileRoute("/dashboard/ads")({
  component: AdvertiserPortalPage,
  head: () => ({
    meta: [{ title: "My ad campaigns — 365 Motor Sales" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});

const PLACEMENTS = [
  { value: "home_carousel", label: "Home carousel" },
  { value: "browse_top", label: "Browse top banner" },
  { value: "rides_top", label: "Rides top banner" },
  { value: "listing_sidebar", label: "Listing sidebar" },
  { value: "shop_top", label: "Shop top" },
  { value: "shop_sidebar", label: "Shop sidebar" },
  { value: "category_banner", label: "Category sponsor" },
];

const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-500 text-white",
  active: "bg-emerald-500 text-white",
  paused: "bg-amber-500 text-white",
  ended: "bg-destructive text-destructive-foreground",
};

const EMPTY = {
  title: "",
  caption: "",
  image_url: "",
  target_url: "",
  placement: "home_carousel",
};

function AdvertiserPortalPage() {
  const { user, loading } = useAuth();
  const [ads, setAds] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    setBusy(true);
    try {
      const res = await listMyAdvertisements();
      setAds(res.ads as any[]);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!user) return <div className="p-6">Please sign in.</div>;

  const save = async () => {
    try {
      const payload: any = { ...editing };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "" || payload[k] === null) delete payload[k];
      });
      if (!payload.title || !payload.image_url || !payload.target_url || !payload.placement) {
        toast.error("Title, image URL, target URL and placement are required.");
        return;
      }
      await submitMyAdvertisement({ data: payload });
      toast.success(editing.id ? "Resubmitted for review" : "Submitted for review");
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    }
  };

  const pause = async (id: string) => {
    if (!confirm("Pause this campaign? It will stop showing immediately.")) return;
    try {
      await pauseMyAdvertisement({ data: { id } });
      toast.success("Campaign paused");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Pause failed");
    }
  };

  return (
    <div className="space-y-6 p-1 md:p-4">
      <div>
        <Link to="/dashboard" className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3 w-3" /> Dashboard
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="h-6 w-6" /> My ad campaigns
            </h1>
            <p className="text-sm text-muted-foreground">
              Submit your own campaigns — our team reviews and activates them within 1 business day.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CreativeNotificationsPanel />
            <Button onClick={() => setEditing({ ...EMPTY })}>
              <Plus className="h-4 w-4 mr-1" /> New campaign
            </Button>
          </div>
        </div>
      </div>

      {busy ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : ads.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          You haven't submitted any campaigns yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {ads.map((a) => (
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
                </div>
                {a.caption && <p className="text-sm text-muted-foreground">{a.caption}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Impressions: {a.impressions_count ?? 0}</span>
                  <span>Clicks: {a.clicks_count ?? 0}</span>
                  <span>Submitted {formatDate(a.created_at)}</span>
                </div>
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
                {(a.status === "draft" || a.status === "paused") && (
                  <Button size="sm" variant="outline" onClick={() => setEditing({ ...a })}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                )}
                {a.status === "active" && (
                  <Button size="sm" variant="outline" onClick={() => pause(a.id)}>
                    <Pause className="h-3 w-3 mr-1" /> Pause
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit campaign" : "New campaign"}</DialogTitle>
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
              <div>
                <Label>Image URL *</Label>
                <Input
                  value={editing.image_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                  placeholder="https://…"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  16:9 image, ≥ 1200px wide recommended.
                </p>
              </div>
              <div>
                <Label>Target URL *</Label>
                <Input
                  value={editing.target_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, target_url: e.target.value })}
                  placeholder="https://…"
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
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editing.placement === "category_banner" && (
                <div>
                  <Label>Category slug</Label>
                  <Input
                    value={editing.category_slug ?? ""}
                    onChange={(e) => setEditing({ ...editing, category_slug: e.target.value })}
                    placeholder="cars, parts…"
                  />
                </div>
              )}
              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                Submitting puts your campaign in <b>review</b>. Our team activates approved campaigns within 1 business day.
              </div>
            </div>
          )}
          <div className="pt-2"><FormFeedbackLink formId="ad-campaign-submit" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>{editing?.id ? "Resubmit" : "Submit for review"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
