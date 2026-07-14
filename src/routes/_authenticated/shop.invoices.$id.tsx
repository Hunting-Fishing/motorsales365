import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2, Receipt, Plus } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { smSupabase } from "@/lib/shop-manager/db";

type Invoice = {
  id: string;
  customer: string | null;
  customer_id: string | null;
  customer_email: string | null;
  customer_address: string | null;
  description: string | null;
  notes: string | null;
  date: string | null;
  due_date: string | null;
  status: string | null;
  work_order_id: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  payment_method: string | null;
};

type InvoiceItem = {
  id: string;
  name: string | null;
  description: string | null;
  quantity: number | null;
  price: number | null;
  total: number | null;
  hours: boolean | null;
};

type PaymentRow = {
  id: string;
  amount: number | null;
  payment_type: string | null;
  status: string | null;
  transaction_date: string | null;
  transaction_id: string | null;
  notes: string | null;
};

async function fetchInvoice(id: string): Promise<Invoice | null> {
  const { data, error } = await (smSupabase as any)
    .from("invoices")
    .select("id,customer,customer_id,customer_email,customer_address,description,notes,date,due_date,status,work_order_id,subtotal,tax,total,payment_method")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Invoice) ?? null;
}


async function fetchInvoiceItems(id: string): Promise<InvoiceItem[]> {
  const { data, error } = await (smSupabase as any)
    .from("invoice_items")
    .select("id,name,description,quantity,price,total,hours")
    .eq("invoice_id", id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as InvoiceItem[];
}

async function fetchInvoicePayments(id: string): Promise<PaymentRow[]> {
  const { data, error } = await (smSupabase as any)
    .from("payments")
    .select("id,amount,payment_type,status,transaction_date,transaction_id,notes")
    .eq("invoice_id", id)
    .order("transaction_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PaymentRow[];
}

export const Route = createFileRoute("/_authenticated/shop/invoices/$id")({
  head: () => ({
    meta: [
      { title: "Invoice — Shop Manager" },
      { name: "description", content: "Invoice line items and payments." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvoiceDetailPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="text-2xl font-bold">Invoice</h1>
          <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
          <Button
            className="mt-4"
            onClick={() => {
              reset();
              router.invalidate();
            }}
          >
            Retry
          </Button>
        </div>
      </SiteLayout>
    );
  },
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">Invoice not found.</div>
    </SiteLayout>
  ),
});

function statusVariant(status: string | null) {
  switch ((status ?? "").toLowerCase()) {
    case "paid":
      return "secondary" as const;
    case "overdue":
    case "void":
    case "cancelled":
      return "destructive" as const;
    case "sent":
    case "open":
    case "unpaid":
      return "default" as const;
    default:
      return "outline" as const;
  }
}

function InvoiceDetailPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["shop-manager", "invoices", "detail", id],
    queryFn: () => fetchInvoice(id),
  });
  const { data: items = [] } = useQuery({
    queryKey: ["shop-manager", "invoices", "items", id],
    queryFn: () => fetchInvoiceItems(id),
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["shop-manager", "invoices", "payments", id],
    queryFn: () => fetchInvoicePayments(id),
  });

  const paidTotal = payments
    .filter((p) => (p.status ?? "").toLowerCase() !== "void" && (p.status ?? "").toLowerCase() !== "refunded")
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const outstanding = Math.max(0, Number(data?.total ?? 0) - paidTotal);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/shop/invoices">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to invoices
          </Link>
        </Button>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : !data ? (
          <Card>
            <CardHeader><CardTitle>Invoice not found</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This invoice may have been deleted or your shop no longer has access.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Receipt className="h-7 w-7 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold">Invoice {data.id}</h1>
                  <p className="text-muted-foreground">
                    {data.date ?? "—"}
                    {data.due_date ? ` · due ${data.due_date}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant={statusVariant(data.status)}>{data.status ?? "unknown"}</Badge>
                {data.work_order_id ? (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      to="/shop/work-orders/$id"
                      params={{ id: data.work_order_id }}
                    >
                      View work order
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Bill to</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="font-medium">{data.customer ?? "—"}</div>
                  <div className="text-muted-foreground">{data.customer_email ?? "no email"}</div>
                  <div className="text-muted-foreground whitespace-pre-wrap">
                    {data.customer_address ?? ""}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Totals</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <Row label="Subtotal" value={money(data.subtotal)} />
                  <Row label="Tax" value={money(data.tax)} />
                  <Row label="Total" value={money(data.total)} strong />
                  <Row label="Paid" value={`₱${paidTotal.toLocaleString()}`} />
                  <Row
                    label="Outstanding"
                    value={`₱${outstanding.toLocaleString()}`}
                    strong
                    highlight={outstanding > 0}
                  />
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Line items ({items.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {items.length === 0 ? (
                    <div className="px-6 pb-6 text-sm text-muted-foreground">No line items.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Price ₱</TableHead>
                          <TableHead className="text-right">Total ₱</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((it) => (
                          <TableRow key={it.id}>
                            <TableCell className="font-medium">
                              {it.name ?? "—"}
                              {it.hours ? (
                                <Badge variant="outline" className="ml-2">hrs</Badge>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {it.description ?? "—"}
                            </TableCell>
                            <TableCell className="text-right">{it.quantity ?? 0}</TableCell>
                            <TableCell className="text-right">
                              {it.price != null ? Number(it.price).toLocaleString() : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {it.total != null ? Number(it.total).toLocaleString() : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base">Payments ({payments.length})</CardTitle>
                  <RecordPaymentDialog
                    invoiceId={data.id}
                    customerId={data.customer_id}
                    outstanding={outstanding}
                  />
                </CardHeader>
                <CardContent className="p-0">
                  {payments.length === 0 ? (
                    <div className="px-6 pb-6 text-sm text-muted-foreground">
                      No payments recorded.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead className="text-right">Amount ₱</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>
                              {p.transaction_date ? new Date(p.transaction_date).toLocaleString() : "—"}
                            </TableCell>
                            <TableCell>{p.payment_type ?? "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{p.status ?? "—"}</Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {p.transaction_id ?? "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {p.amount != null ? Number(p.amount).toLocaleString() : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {data.notes || data.description ? (
                <Card className="md:col-span-2">
                  <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-3">
                    {data.description ? (
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Description
                        </div>
                        <div className="whitespace-pre-wrap">{data.description}</div>
                      </div>
                    ) : null}
                    {data.notes ? (
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Notes
                        </div>
                        <div className="whitespace-pre-wrap">{data.notes}</div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </>
        )}
      </div>
    </SiteLayout>
  );
}

function money(v: number | null | undefined) {
  return v != null ? `₱${Number(v).toLocaleString()}` : "—";
}

function Row({
  label,
  value,
  strong,
  highlight,
}: {
  label: string;
  value: string;
  strong?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          (strong ? "font-semibold " : "") +
          (highlight ? "text-destructive" : "")
        }
      >
        {value}
      </span>
    </div>
  );
}
