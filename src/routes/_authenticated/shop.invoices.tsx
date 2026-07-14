import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Receipt, Loader2, Search } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { smSupabase } from "@/lib/shop-manager/db";

type InvoiceRow = {
  id: string;
  customer: string | null;
  customer_email: string | null;
  customer_id: string | null;
  date: string | null;
  due_date: string | null;
  status: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  work_order_id: string | null;
};

async function fetchInvoices(): Promise<InvoiceRow[]> {
  const { data, error } = await (smSupabase as any)
    .from("invoices")
    .select("id,customer,customer_email,customer_id,date,due_date,status,subtotal,tax,total,work_order_id")
    .order("date", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as InvoiceRow[];
}

export const Route = createFileRoute("/_authenticated/shop/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices — Shop Manager" },
      { name: "description", content: "Invoices issued from your shop, newest first." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvoicesList,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout><div className="mx-auto max-w-4xl px-4 py-10">Not found.</div></SiteLayout>
  ),
});

function statusVariant(status: string | null) {
  switch ((status ?? "").toLowerCase()) {
    case "paid": return "secondary" as const;
    case "overdue": case "past_due": return "destructive" as const;
    case "sent": case "issued": case "open": return "default" as const;
    case "draft": return "outline" as const;
    default: return "outline" as const;
  }
}

function InvoicesList() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["shop-manager", "invoices", "list"],
    queryFn: fetchInvoices,
  });
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((r: InvoiceRow) =>
      [r.id, r.customer, r.customer_email, r.status].some((v) =>
        String(v ?? "").toLowerCase().includes(s),
      ),
    );
  }, [data, q]);

  const totals = useMemo(() => {
    const sum = filtered.reduce((a: number, r: InvoiceRow) => a + Number(r.total ?? 0), 0);
    const outstanding = filtered
      .filter((r: InvoiceRow) => !["paid", "void", "cancelled"].includes(String(r.status ?? "").toLowerCase()))
      .reduce((a: number, r: InvoiceRow) => a + Number(r.total ?? 0), 0);
    return { sum, outstanding };
  }, [filtered]);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Receipt className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Invoices</h1>
              <p className="text-muted-foreground">Newest first.</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="text-muted-foreground">Total (filtered)</div>
            <div className="text-lg font-semibold">₱{totals.sum.toLocaleString()}</div>
            <div className="text-xs text-destructive">₱{totals.outstanding.toLocaleString()} outstanding</div>
          </div>
        </div>

        <div className="mb-4 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search invoice #, customer, status…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            {data.length === 0 ? "No invoices yet." : "No invoices match your search."}
          </CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total ₱</TableHead>
                    <TableHead>WO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">
                        <Link to="/shop/invoices/$id" params={{ id: r.id }} className="text-primary hover:underline">
                          {r.id}
                        </Link>
                      </TableCell>
                      <TableCell>{r.customer ?? r.customer_email ?? "—"}</TableCell>
                      <TableCell>{r.date ? new Date(r.date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>{r.due_date ? new Date(r.due_date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell><Badge variant={statusVariant(r.status)}>{r.status ?? "—"}</Badge></TableCell>
                      <TableCell className="text-right">{typeof r.total === "number" ? r.total.toLocaleString() : "—"}</TableCell>
                      <TableCell>
                        {r.work_order_id ? (
                          <Link to="/shop/work-orders/$id" params={{ id: r.work_order_id }} className="text-primary hover:underline">
                            open
                          </Link>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 text-sm text-muted-foreground">
          PDF export and payment recording are next on the porting list.
        </div>
        <div className="mt-4">
          <Button asChild variant="ghost"><Link to="/shop">← Back to Shop Manager</Link></Button>
        </div>
      </div>
    </SiteLayout>
  );
}
