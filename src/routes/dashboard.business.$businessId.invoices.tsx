import { useState } from "react";
import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  listBusinessInvoices,
  createBusinessInvoice,
  deleteBusinessInvoice,
} from "@/lib/business-invoices.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/dashboard/business/$businessId/invoices")({
  component: InvoicesPage,
});

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  sent: "default",
  paid: "secondary",
  void: "destructive",
};

function InvoicesPage() {
  const { businessId } = useParams({
    from: "/dashboard/business/$businessId/invoices",
  });
  const { user } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listBusinessInvoices);
  const createFn = useServerFn(createBusinessInvoice);
  const delFn = useServerFn(deleteBusinessInvoice);

  const q = useQuery({
    queryKey: ["business-invoices", businessId],
    enabled: !!user?.id,
    queryFn: () => listFn({ data: { businessId } }),
  });

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    due_date: "",
    tax_rate: "12",
    notes: "",
  });

  async function handleCreate() {
    setSaving(true);
    try {
      const row: any = await createFn({
        data: {
          businessId,
          customer_name: form.customer_name || null,
          customer_email: form.customer_email || null,
          customer_phone: form.customer_phone || null,
          due_date: form.due_date || null,
          tax_rate: Number(form.tax_rate) || 0,
          notes: form.notes || null,
        },
      });
      toast.success(`Invoice ${row.invoice_number} created`);
      setOpen(false);
      setForm({
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        due_date: "",
        tax_rate: "12",
        notes: "",
      });
      qc.invalidateQueries({ queryKey: ["business-invoices", businessId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this invoice? Any inventory deducted by its lines will be returned to stock.")) return;
    try {
      await delFn({ data: { id, businessId } });
      toast.success("Invoice deleted");
      qc.invalidateQueries({ queryKey: ["business-invoices", businessId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete");
    }
  }

  const rows = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Invoices
          </h1>
          <p className="text-sm text-muted-foreground">
            Bill customers and pull line items directly from your inventory. Stock updates automatically.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New invoice
        </Button>
      </div>

      <Card className="divide-y">
        {q.isLoading && (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        )}
        {!q.isLoading && rows.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No invoices yet. Click <b>New invoice</b> to bill your first customer.
          </div>
        )}
        {rows.map((inv: any) => (
          <div
            key={inv.id}
            className="p-4 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="font-medium flex items-center gap-2 flex-wrap">
                <Link
                  to="/dashboard/business/$businessId/invoices/$id"
                  params={{ businessId, id: inv.id }}
                  className="hover:underline"
                >
                  {inv.invoice_number}
                </Link>
                <Badge variant={STATUS_VARIANT[inv.status] ?? "outline"}>
                  {inv.status}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {inv.customer_name || "No customer"} ·{" "}
                {new Date(inv.issue_date).toLocaleDateString()}
                {inv.due_date && ` · due ${new Date(inv.due_date).toLocaleDateString()}`}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-semibold">
                  {inv.currency} {Number(inv.total ?? 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  subtotal {Number(inv.subtotal ?? 0).toLocaleString()}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(inv.id)}
                aria-label="Delete invoice"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New invoice</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Customer name</Label>
              <Input
                value={form.customer_name}
                onChange={(e) =>
                  setForm({ ...form, customer_name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.customer_email}
                onChange={(e) =>
                  setForm({ ...form, customer_email: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={form.customer_phone}
                onChange={(e) =>
                  setForm({ ...form, customer_phone: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Due date</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Tax rate %</Label>
              <Input
                type="number"
                value={form.tax_rate}
                onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating…" : "Create draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
