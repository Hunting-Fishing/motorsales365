import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPHP } from "@/lib/format";

interface Row {
  id: string;
  listing_id: string;
  label: string;
  percent_off: number | null;
  amount_off_php: number | null;
  starts_at: string;
  ends_at: string;
  listings?: { title: string | null } | null;
}

export function ListingPromosPanel() {
  const qc = useQueryClient();
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin-listing-promos"],
    queryFn: async (): Promise<Row[]> => {
      const { data } = await (supabase as any)
        .from("listing_promotions")
        .select("id,listing_id,label,percent_off,amount_off_php,starts_at,ends_at,listings(title)")
        .order("ends_at", { ascending: false })
        .limit(200);
      return (data ?? []) as Row[];
    },
  });

  const remove = async (id: string) => {
    if (!confirm("End this promo now?")) return;
    const { error } = await (supabase as any).from("listing_promotions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Promo ended");
      qc.invalidateQueries({ queryKey: ["admin-listing-promos"] });
      refetch();
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Per-listing discounts (e.g. "10% OFF this week"). Shown publicly on the listing card.
        </p>
        <NewListingPromoDialog onCreated={() => refetch()} />
      </div>
      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !data || data.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No listing promos yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Listing</th>
                <th className="px-3 py-2">Offer</th>
                <th className="px-3 py-2">Window</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => {
                const active = new Date(r.ends_at) > new Date() && new Date(r.starts_at) <= new Date();
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.listings?.title ?? r.listing_id}</div>
                      <div className="text-xs text-muted-foreground">{r.label}</div>
                    </td>
                    <td className="px-3 py-2">
                      {r.percent_off
                        ? `${Number(r.percent_off).toFixed(0)}% off`
                        : r.amount_off_php
                          ? `${formatPHP(r.amount_off_php)} off`
                          : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {formatDate(r.starts_at)} → {formatDate(r.ends_at)}{" "}
                      <Badge variant={active ? "default" : "secondary"} className="ml-1">
                        {active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(r.id)}
                        aria-label="End promo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function NewListingPromoDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [listingId, setListingId] = useState("");
  const [label, setLabel] = useState("Limited-time offer");
  const [percent, setPercent] = useState("");
  const [amount, setAmount] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const submit = async () => {
    if (!listingId || !endsAt) return toast.error("Listing ID and end date required");
    const pct = percent ? Number(percent) : null;
    const amt = amount ? Number(amount) : null;
    if (!pct && !amt) return toast.error("Set either % off or amount off");
    const { error } = await (supabase as any).from("listing_promotions").insert({
      listing_id: listingId,
      label,
      percent_off: pct,
      amount_off_php: amt,
      starts_at: new Date().toISOString(),
      ends_at: new Date(endsAt).toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("Promo created");
    setOpen(false);
    setListingId("");
    setPercent("");
    setAmount("");
    setEndsAt("");
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" /> New listing promo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New listing promo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Listing ID</Label>
            <Input value={listingId} onChange={(e) => setListingId(e.target.value)} placeholder="uuid" />
          </div>
          <div>
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>% off</Label>
              <Input
                type="number"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                placeholder="10"
              />
            </div>
            <div>
              <Label>Amount off (PHP)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000"
              />
            </div>
          </div>
          <div>
            <Label>Ends at</Label>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
