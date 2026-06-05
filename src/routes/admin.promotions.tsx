import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Tag, Trash2, Pencil, Ticket } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listPromotions,
  upsertPromotion,
  deletePromotion,
  issueCustomerDiscount,
  listIssuedDiscounts,
  setDiscountActive,
} from "@/lib/promotions.functions";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/promotions")({
  head: () => ({
    meta: [
      { title: "Promotions & Discounts — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPromotions,
});

function AdminPromotions() {
  const { canCreatePromotions, canIssueDiscounts } = useAuth();
  if (!canCreatePromotions && !canIssueDiscounts) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
        You do not have permission to manage promotions.
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Promotions & Discounts</h1>
        <p className="text-sm text-muted-foreground">
          Create site-wide promo codes and issue one-off discounts to specific customers.
        </p>
      </header>
      <Tabs defaultValue={canCreatePromotions ? "promos" : "discounts"}>
        <TabsList>
          {canCreatePromotions && <TabsTrigger value="promos">Promo codes</TabsTrigger>}
          {canIssueDiscounts && <TabsTrigger value="discounts">Customer discounts</TabsTrigger>}
        </TabsList>
        {canCreatePromotions && (
          <TabsContent value="promos" className="pt-4">
            <PromoCodesPanel />
          </TabsContent>
        )}
        {canIssueDiscounts && (
          <TabsContent value="discounts" className="pt-4">
            <CustomerDiscountsPanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function PromoCodesPanel() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listPromotions);
  const upsert = useServerFn(upsertPromotion);
  const del = useServerFn(deletePromotion);
  const { data } = useQuery({ queryKey: ["admin-promotions"], queryFn: () => fetchList() });
  const rows = (data as any)?.rows ?? [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const mUpsert = useMutation({
    mutationFn: (p: any) => upsert({ data: p }),
    onSuccess: () => {
      toast.success("Saved");
      setOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-promotions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const mDel = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-promotions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New promo code
            </Button>
          </DialogTrigger>
          <PromoCodeDialog
            initial={editing}
            saving={mUpsert.isPending}
            onSave={(payload) => mUpsert.mutate(payload)}
          />
        </Dialog>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">% off</th>
              <th className="px-3 py-2">Applies to</th>
              <th className="px-3 py-2">Expires</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  No promo codes yet.
                </td>
              </tr>
            )}
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono font-semibold">{r.code}</td>
                <td className="px-3 py-2">{r.percent_off ?? "—"}%</td>
                <td className="px-3 py-2">{r.applies_to}</td>
                <td className="px-3 py-2">{r.expires_at ? formatDate(r.expires_at) : "—"}</td>
                <td className="px-3 py-2">
                  <Badge variant={r.active ? "default" : "secondary"}>
                    {r.active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(r);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete code ${r.code}?`)) mDel.mutate(r.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PromoCodeDialog({
  initial,
  saving,
  onSave,
}: {
  initial: any | null;
  saving: boolean;
  onSave: (p: any) => void;
}) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [percent, setPercent] = useState(String(initial?.percent_off ?? "10"));
  const [applies, setApplies] = useState(initial?.applies_to ?? "any");
  const [expires, setExpires] = useState(initial?.expires_at?.slice(0, 10) ?? "");
  const [active, setActive] = useState(initial?.active ?? true);

  useEffect(() => {
    setCode(initial?.code ?? "");
    setPercent(String(initial?.percent_off ?? "10"));
    setApplies(initial?.applies_to ?? "any");
    setExpires(initial?.expires_at?.slice(0, 10) ?? "");
    setActive(initial?.active ?? true);
  }, [initial]);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{initial ? "Edit promo code" : "New promo code"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Code</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SUMMER25"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>% off</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
            />
          </div>
          <div>
            <Label>Applies to</Label>
            <Select value={applies} onValueChange={setApplies}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
                <SelectItem value="listing">Listing</SelectItem>
                <SelectItem value="boost">Boost</SelectItem>
                <SelectItem value="upgrade">Upgrade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Expires (optional)</Label>
          <Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={active} onCheckedChange={setActive} />
          <span className="text-sm">Active</span>
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={saving || code.length < 2}
          onClick={() =>
            onSave({
              id: initial?.id ?? null,
              code,
              percent_off: Number(percent) || 0,
              applies_to: applies,
              expires_at: expires ? new Date(expires + "T23:59:59Z").toISOString() : null,
              active,
            })
          }
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function CustomerDiscountsPanel() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listIssuedDiscounts);
  const issue = useServerFn(issueCustomerDiscount);
  const toggle = useServerFn(setDiscountActive);
  const { data } = useQuery({
    queryKey: ["admin-customer-discounts"],
    queryFn: () => fetchList(),
  });
  const rows = (data as any)?.rows ?? [];

  const [targetUser, setTargetUser] = useState("");
  const [kind, setKind] = useState<"percent" | "flat">("percent");
  const [value, setValue] = useState("10");
  const [applies, setApplies] = useState("any");
  const [reason, setReason] = useState("");
  const [expires, setExpires] = useState("");

  const mIssue = useMutation({
    mutationFn: (p: any) => issue({ data: p }),
    onSuccess: () => {
      toast.success("Discount issued");
      setTargetUser("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["admin-customer-discounts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const mToggle = useMutation({
    mutationFn: (p: { id: string; active: boolean }) => toggle({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-customer-discounts"] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4" />
          <h3 className="font-semibold">Issue a customer discount</h3>
        </div>
        <div>
          <Label>Target user ID</Label>
          <Input
            value={targetUser}
            onChange={(e) => setTargetUser(e.target.value)}
            placeholder="UUID from /admin/accounts"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">% off</SelectItem>
                <SelectItem value="flat">Flat ₱</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Value</Label>
            <Input
              type="number"
              min={0}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>Applies to</Label>
          <Select value={applies} onValueChange={setApplies}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
              <SelectItem value="listing">Listing</SelectItem>
              <SelectItem value="boost">Boost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Expires (optional)</Label>
          <Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </div>
        <div>
          <Label>Reason / note</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="VIP customer, retention, support resolution…"
            rows={3}
          />
        </div>
        <Button
          className="w-full"
          disabled={mIssue.isPending || !targetUser || !value}
          onClick={() =>
            mIssue.mutate({
              target_user_id: targetUser,
              kind,
              percent_off: kind === "percent" ? Number(value) : null,
              flat_amount_php: kind === "flat" ? Number(value) : null,
              applies_to: applies,
              reason: reason || null,
              expires_at: expires ? new Date(expires + "T23:59:59Z").toISOString() : null,
            })
          }
        >
          <Tag className="mr-2 h-4 w-4" />
          {mIssue.isPending ? "Issuing…" : "Issue discount"}
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase">
            <tr>
              <th className="px-3 py-2">Issued</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Discount</th>
              <th className="px-3 py-2">Applies</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  No customer discounts issued yet.
                </td>
              </tr>
            )}
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.created_at)}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.target_user_id ?? r.target_business_id}
                </td>
                <td className="px-3 py-2">
                  {r.kind === "percent" ? `${r.percent_off}% off` : `₱${r.flat_amount_php}`}
                </td>
                <td className="px-3 py-2">{r.applies_to}</td>
                <td className="px-3 py-2 max-w-xs truncate">{r.reason ?? "—"}</td>
                <td className="px-3 py-2">
                  <Switch
                    checked={r.active}
                    onCheckedChange={(v) => mToggle.mutate({ id: r.id, active: v })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
