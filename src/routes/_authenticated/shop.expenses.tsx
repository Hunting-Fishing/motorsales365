import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Receipt, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/shop/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — Shop Manager" },
      { name: "description", content: "Track shop expenses by category." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExpensesPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout><div className="mx-auto max-w-4xl px-4 py-10">Not found.</div></SiteLayout>
  ),
});

function ExpensesPage() {
  const qc = useQueryClient();
  const sm = smSupabase as any;

  const { data: cats = [] } = useQuery({
    queryKey: ["shop-manager", "expense_categories"],
    queryFn: async () => {
      const { data, error } = await sm.from("expense_categories").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["shop-manager", "expenses"],
    queryFn: async () => {
      const { data, error } = await sm
        .from("expenses")
        .select("id,amount,tax_amount,expense_date,payment_method,reference_number,description,status,category_id")
        .order("expense_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalMTD = rows
    .filter((r: any) => new Date(r.expense_date).getMonth() === new Date().getMonth())
    .reduce((s: number, r: any) => s + Number(r.amount ?? 0) + Number(r.tax_amount ?? 0), 0);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sm.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Expense removed"); qc.invalidateQueries({ queryKey: ["shop-manager", "expenses"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Receipt className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Expenses</h1>
              <p className="text-sm text-muted-foreground">Track spending by category. Month-to-date: <b>₱{totalMTD.toLocaleString()}</b></p>
            </div>
          </div>
          <div className="flex gap-2">
            <NewCategoryDialog onCreated={() => qc.invalidateQueries({ queryKey: ["shop-manager", "expense_categories"] })} />
            <NewExpenseDialog categories={cats} onCreated={() => qc.invalidateQueries({ queryKey: ["shop-manager", "expenses"] })} />
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Expenses</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses yet.</p>
            ) : (
              <div className="space-y-2">
                {rows.map((r: any) => {
                  const cat = cats.find((c: any) => c.id === r.category_id);
                  const total = Number(r.amount ?? 0) + Number(r.tax_amount ?? 0);
                  return (
                    <div key={r.id} className="grid grid-cols-1 sm:grid-cols-6 items-center gap-2 rounded border p-2 text-sm">
                      <div className="font-mono text-xs">{new Date(r.expense_date).toLocaleDateString()}</div>
                      <div className="truncate sm:col-span-2">{r.description ?? "—"}</div>
                      <div><Badge variant="outline">{cat?.name ?? "Uncategorized"}</Badge></div>
                      <div className="font-medium">₱{total.toLocaleString()}</div>
                      <div className="flex justify-end">
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this expense?")) del.mutate(r.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}

function NewCategoryDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: async () => {
      const { error } = await (smSupabase as any).from("expense_categories").insert({ name });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Category added"); setOpen(false); setName(""); onCreated(); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4 mr-2" /> Category</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
        <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Utilities, Rent, Marketing…" /></div>
        <DialogFooter><Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewExpenseDialog({ categories, onCreated }: { categories: any[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    category_id: "",
    amount: "",
    tax_amount: "",
    expense_date: new Date().toISOString().slice(0, 10),
    payment_method: "cash",
    reference_number: "",
    description: "",
    notes: "",
  });
  const create = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ...form,
        amount: Number(form.amount) || 0,
        tax_amount: Number(form.tax_amount) || 0,
        category_id: form.category_id || null,
      };
      const { error } = await (smSupabase as any).from("expenses").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Expense recorded"); setOpen(false); onCreated(); setForm({ ...form, amount: "", tax_amount: "", description: "", notes: "", reference_number: "" }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Expense</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
            <div><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Label>Tax</Label><Input type="number" step="0.01" value={form.tax_amount} onChange={(e) => setForm({ ...form, tax_amount: e.target.value })} /></div>
            <div>
              <Label>Payment</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="gcash">GCash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Reference #</Label><Input value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} /></div>
          </div>
          <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
        </div>
        <DialogFooter><Button onClick={() => create.mutate()} disabled={!form.amount || create.isPending}>Record</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
