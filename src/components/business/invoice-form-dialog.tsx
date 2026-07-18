import { useState } from "react";
import { toast } from "sonner";
import { FileText, User, Calendar, CreditCard, StickyNote, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { createBusinessInvoice } from "@/lib/business-invoices.functions";

type Props = {
  businessId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (invoice: any) => void;
};

type Form = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  description: string;
  po_number: string;
  issue_date: string;
  due_date: string;
  terms: string;
  payment_method: string;
  tax_rate: string;
  notes: string;
};

const EMPTY: Form = {
  customer_name: "",
  customer_email: "",
  customer_phone: "",
  customer_address: "",
  description: "",
  po_number: "",
  issue_date: new Date().toISOString().slice(0, 10),
  due_date: "",
  terms: "Net 30",
  payment_method: "cash",
  tax_rate: "12",
  notes: "",
};

const TABS = [
  { id: "customer", label: "Customer", icon: User },
  { id: "details", label: "Details", icon: FileText },
  { id: "dates", label: "Dates & Terms", icon: Calendar },
  { id: "payment", label: "Payment & Tax", icon: CreditCard },
  { id: "notes", label: "Notes", icon: StickyNote },
] as const;

export function InvoiceFormDialog({ businessId, open, onOpenChange, onCreated }: Props) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("customer");
  const [saving, setSaving] = useState(false);
  const createFn = useServerFn(createBusinessInvoice);
  const qc = useQueryClient();

  const upd = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // progress: count non-empty domain fields
  const filled = [
    form.customer_name,
    form.customer_email || form.customer_phone,
    form.description,
    form.issue_date,
    form.due_date,
    form.terms,
    form.payment_method,
    form.tax_rate,
  ].filter((v) => String(v ?? "").trim() !== "").length;
  const progress = Math.round((filled / 8) * 100);
  const canSave = form.customer_name.trim().length > 0;

  async function handleSave() {
    if (!canSave) {
      toast.error("Customer name is required");
      setTab("customer");
      return;
    }
    setSaving(true);
    try {
      const row: any = await createFn({
        data: {
          businessId,
          customer_name: form.customer_name.trim() || null,
          customer_email: form.customer_email.trim() || null,
          customer_phone: form.customer_phone.trim() || null,
          customer_address: form.customer_address.trim() || null,
          description: form.description.trim() || null,
          po_number: form.po_number.trim() || null,
          issue_date: form.issue_date || null,
          due_date: form.due_date || null,
          terms: form.terms.trim() || null,
          payment_method: form.payment_method || null,
          tax_rate: Number(form.tax_rate) || 0,
          notes: form.notes.trim() || null,
        },
      });
      toast.success(`Invoice ${row.invoice_number} created`);
      qc.invalidateQueries({ queryKey: ["business-invoices", businessId] });
      setForm(EMPTY);
      setTab("customer");
      onOpenChange(false);
      onCreated?.(row);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> New invoice
          </DialogTitle>
          <DialogDescription>
            Bill your customer. You can add line items from inventory or your service catalog on the next screen.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Completeness</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="mb-3 h-1.5" />

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-5 h-auto">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger key={t.id} value={t.id} className="flex-col gap-1 py-2 px-1 text-[11px]">
                  <Icon className="h-4 w-4" />
                  {t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="customer" className="space-y-3 pt-4">
            <div>
              <Label>
                Customer name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.customer_name}
                onChange={(e) => upd("customer_name", e.target.value)}
                placeholder="Juan Dela Cruz / ABC Corp"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.customer_email}
                  onChange={(e) => upd("customer_email", e.target.value)}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={form.customer_phone}
                  onChange={(e) => upd("customer_phone", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Billing address</Label>
              <Textarea
                rows={3}
                value={form.customer_address}
                onChange={(e) => upd("customer_address", e.target.value)}
                placeholder="Street, City, Province, ZIP"
              />
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-3 pt-4">
            <div>
              <Label>Description / Job summary</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => upd("description", e.target.value)}
                placeholder="Brake pad replacement, oil change, and 30-point inspection."
              />
            </div>
            <div>
              <Label>PO / Reference number</Label>
              <Input
                value={form.po_number}
                onChange={(e) => upd("po_number", e.target.value)}
                placeholder="Customer PO or reference"
              />
            </div>
          </TabsContent>

          <TabsContent value="dates" className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Issue date</Label>
                <Input
                  type="date"
                  value={form.issue_date}
                  onChange={(e) => upd("issue_date", e.target.value)}
                />
              </div>
              <div>
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => upd("due_date", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Terms</Label>
              <Select value={form.terms} onValueChange={(v) => upd("terms", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Due on receipt">Due on receipt</SelectItem>
                  <SelectItem value="Net 7">Net 7</SelectItem>
                  <SelectItem value="Net 15">Net 15</SelectItem>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Net 60">Net 60</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="payment" className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Preferred payment method</Label>
                <Select value={form.payment_method} onValueChange={(v) => upd("payment_method", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="gcash">GCash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tax rate %</Label>
                <Input
                  type="number"
                  value={form.tax_rate}
                  onChange={(e) => upd("tax_rate", e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">PH VAT default is 12%.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-3 pt-4">
            <div>
              <Label>Internal / customer notes</Label>
              <Textarea
                rows={5}
                value={form.notes}
                onChange={(e) => upd("notes", e.target.value)}
                placeholder="Warranty terms, thank-you note, return policy…"
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex flex-row justify-between gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {tab !== "notes" && (
              <Button
                variant="outline"
                onClick={() => {
                  const idx = TABS.findIndex((t) => t.id === tab);
                  setTab(TABS[Math.min(idx + 1, TABS.length - 1)].id);
                }}
              >
                Next
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving || !canSave}>
              <Check className="mr-1 h-4 w-4" />
              {saving ? "Creating…" : "Create draft"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
