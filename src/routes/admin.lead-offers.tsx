import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Inbox, Plus, Trash2, Pencil } from "lucide-react";
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
import {
  adminListLeadOffers,
  adminUpsertLeadOffer,
  adminDeleteLeadOffer,
} from "@/lib/lead-marketplace-admin.functions";

export const Route = createFileRoute("/admin/lead-offers")({
  component: AdminLeadOffersPage,
  head: () => ({ meta: [{ title: "Lead offers — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});

type Offer = any;

const EMPTY: any = {
  category_slug: "",
  region: "",
  preview: "",
  urgency: "standard",
  price_php: 199,
  max_unlocks: 1,
  status: "open",
};

function AdminLeadOffersPage() {
  const { isAdmin } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminListLeadOffers();
      setOffers(res.offers as Offer[]);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (!isAdmin) {
    return <div className="p-6 text-sm text-muted-foreground">Admin access required.</div>;
  }

  const save = async () => {
    try {
      const payload = {
        ...editing,
        vehicle_year: editing.vehicle_year ? Number(editing.vehicle_year) : undefined,
        budget_min_php: editing.budget_min_php ? Number(editing.budget_min_php) : undefined,
        budget_max_php: editing.budget_max_php ? Number(editing.budget_max_php) : undefined,
        price_php: Number(editing.price_php),
        max_unlocks: Number(editing.max_unlocks ?? 1),
      };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "" || payload[k] === null) delete payload[k];
      });
      await adminUpsertLeadOffer({ data: payload });
      toast.success(editing.id ? "Lead offer updated" : "Lead offer posted");
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this lead offer? Unlocks will be removed too.")) return;
    try {
      await adminDeleteLeadOffer({ data: { id } });
      toast.success("Deleted");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Delete failed");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox className="h-6 w-6" /> Lead Marketplace — Offers
          </h1>
          <p className="text-sm text-muted-foreground">
            Post buyer leads for Featured / Premium businesses to unlock pay-per-lead.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="h-4 w-4 mr-1" /> New lead offer
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : offers.length === 0 ? (
        <div className="rounded-md border p-6 text-sm text-muted-foreground">No lead offers yet.</div>
      ) : (
        <div className="grid gap-3">
          {offers.map((o) => (
            <div key={o.id} className="rounded-md border p-4 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{o.category_slug}</Badge>
                  {o.region && <Badge variant="secondary">{o.region}</Badge>}
                  <Badge>{o.status}</Badge>
                  <Badge variant="outline">₱{Number(o.price_php).toLocaleString()}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {o.unlocks_count}/{o.max_unlocks} unlocks
                  </span>
                </div>
                <p className="text-sm">{o.preview}</p>
                <p className="text-xs text-muted-foreground">
                  Posted {formatDate(o.posted_at)}
                  {o.expires_at ? ` · expires ${formatDate(o.expires_at)}` : ""}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing({ ...o })}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(o.id)}>
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
            <DialogTitle>{editing?.id ? "Edit lead offer" : "New lead offer"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category slug *</Label>
                  <Input
                    value={editing.category_slug ?? ""}
                    onChange={(e) => setEditing({ ...editing, category_slug: e.target.value })}
                    placeholder="cars, parts, towing…"
                  />
                </div>
                <div>
                  <Label>Region</Label>
                  <Input
                    value={editing.region ?? ""}
                    onChange={(e) => setEditing({ ...editing, region: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Province</Label>
                  <Input
                    value={editing.province ?? ""}
                    onChange={(e) => setEditing({ ...editing, province: e.target.value })}
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={editing.city ?? ""}
                    onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Vehicle make</Label>
                  <Input
                    value={editing.vehicle_make ?? ""}
                    onChange={(e) => setEditing({ ...editing, vehicle_make: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Vehicle model</Label>
                  <Input
                    value={editing.vehicle_model ?? ""}
                    onChange={(e) => setEditing({ ...editing, vehicle_model: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={editing.vehicle_year ?? ""}
                    onChange={(e) => setEditing({ ...editing, vehicle_year: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Urgency</Label>
                  <Select
                    value={editing.urgency ?? "standard"}
                    onValueChange={(v) => setEditing({ ...editing, urgency: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">low</SelectItem>
                      <SelectItem value="standard">standard</SelectItem>
                      <SelectItem value="urgent">urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Budget min (₱)</Label>
                  <Input
                    type="number"
                    value={editing.budget_min_php ?? ""}
                    onChange={(e) => setEditing({ ...editing, budget_min_php: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Budget max (₱)</Label>
                  <Input
                    type="number"
                    value={editing.budget_max_php ?? ""}
                    onChange={(e) => setEditing({ ...editing, budget_max_php: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Unlock price (₱) *</Label>
                  <Input
                    type="number"
                    value={editing.price_php ?? 0}
                    onChange={(e) => setEditing({ ...editing, price_php: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Max unlocks *</Label>
                  <Input
                    type="number"
                    value={editing.max_unlocks ?? 1}
                    onChange={(e) => setEditing({ ...editing, max_unlocks: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={editing.status ?? "open"}
                    onValueChange={(v) => setEditing({ ...editing, status: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">open</SelectItem>
                      <SelectItem value="sold">sold</SelectItem>
                      <SelectItem value="expired">expired</SelectItem>
                      <SelectItem value="withdrawn">withdrawn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Expires at (ISO)</Label>
                  <Input
                    type="datetime-local"
                    value={editing.expires_at ? String(editing.expires_at).slice(0, 16) : ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        expires_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Preview (shown publicly, no PII) *</Label>
                <Textarea
                  rows={2}
                  value={editing.preview ?? ""}
                  onChange={(e) => setEditing({ ...editing, preview: e.target.value })}
                  placeholder="Buyer looking for 2018 Civic in Cebu, under ₱600k, ready to view this week."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Contact name</Label>
                  <Input
                    value={editing.contact_name ?? ""}
                    onChange={(e) => setEditing({ ...editing, contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Contact email</Label>
                  <Input
                    type="email"
                    value={editing.contact_email ?? ""}
                    onChange={(e) => setEditing({ ...editing, contact_email: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Contact phone</Label>
                  <Input
                    value={editing.contact_phone ?? ""}
                    onChange={(e) => setEditing({ ...editing, contact_phone: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Contact notes</Label>
                  <Textarea
                    rows={2}
                    value={editing.contact_notes ?? ""}
                    onChange={(e) => setEditing({ ...editing, contact_notes: e.target.value })}
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
