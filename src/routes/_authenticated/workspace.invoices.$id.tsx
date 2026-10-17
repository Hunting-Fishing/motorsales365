import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Receipt, Plus, Package } from "lucide-react";
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
  DialogDescription,
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
import { useAuth } from "@/hooks/use-auth";

type DbResult = { data: unknown; error: unknown; count?: number | null };
interface InvoiceQuery extends PromiseLike<DbResult> {
  select(columns: string, options?: { count: "exact" }): InvoiceQuery;
  eq(column: string, value: string | number): InvoiceQuery;
  is(column: string, value: null): InvoiceQuery;
  order(column: string, options?: { ascending: boolean }): InvoiceQuery;
  limit(count: number): InvoiceQuery;
  or(filters: string): InvoiceQuery;
  insert(value: Record<string, unknown>): InvoiceQuery;
  update(value: Record<string, unknown>): InvoiceQuery;
  single(): Promise<DbResult>;
  maybeSingle(): Promise<DbResult>;
}
// The generated client does not yet describe the native schema. Narrow the
// caller's fluent surface without treating SDK data as a verified receipt.
const invoiceDb = smSupabase as unknown as { from(table: string): InvoiceQuery };
type Numeric = number | string | null;
const DISPLAY_LIMIT = 100;
// Conservative caller support, not an authoritative financial transition policy.
// Closed/unknown states need a reviewed adjustment writer, not this editor.
const EDITABLE_STATUSES = new Set(["draft", "unpaid", "open", "sent", "overdue"]);
const UNCERTAIN_WRITE =
  "A financial write may have completed. Review this invoice before attempting another write.";

function row(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
function recordId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128;
}
function nullableText(value: unknown): boolean {
  return value === null || (typeof value === "string" && value.length <= 20_000);
}
function sourceNumeric(value: unknown): value is Numeric {
  return (
    value === null ||
    (typeof value === "number" && Number.isFinite(value)) ||
    (typeof value === "string" && value.length <= 128 && /^-?\d+(?:\.\d+)?$/.test(value))
  );
}
// This caller supports minor-unit amounts only. Native NUMERIC is unscaled:
// refuse unsupported precision rather than silently round a financial value.
function minorUnits(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  const text = String(value);
  if (text.length > 64 || !/^\d{1,14}(?:\.\d{1,30})?$/.test(text)) return null;
  const [whole, rawFraction = ""] = text.split(".");
  const fraction = rawFraction.replace(/0+$/, "");
  if (fraction.length > 2) return null;
  const result = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0") || "0");
  return result <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(result) : null;
}
function useActiveScope() {
  const active = useRef(false);
  useLayoutEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  return useCallback(() => active.current, []);
}

function rowsForInvoice(value: unknown, invoiceId: string): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length > DISPLAY_LIMIT + 1)
    throw new Error("Read unavailable");
  const ids = new Set<string>();
  return value.map((value) => {
    const item = row(value);
    if (!item || !recordId(item.id) || item.invoice_id !== invoiceId || ids.has(item.id))
      throw new Error("Read unavailable");
    ids.add(item.id);
    return item;
  });
}

type ChildRead<T> = { rows: T[]; complete: boolean; total: number | null };
function childRead<T>(result: DbResult, invoiceId: string): ChildRead<T> {
  if (result.error) throw new Error("Read unavailable");
  const rows = rowsForInvoice(result.data, invoiceId) as T[];
  const count = result.count;
  const total =
    typeof count === "number" && Number.isSafeInteger(count) && count >= rows.length ? count : null;
  return {
    rows,
    total,
    complete: total !== null && total === rows.length && total <= DISPLAY_LIMIT,
  };
}

function amountNumber(units: number): number {
  const amount = units / 100;
  if (!Number.isSafeInteger(units) || units < 0 || minorUnits(amount) !== units)
    throw new Error("Amount is outside this editor's supported precision");
  return amount;
}

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
  subtotal: Numeric;
  tax: Numeric;
  total: Numeric;
  payment_method: string | null;
};

type InvoiceItem = {
  id: string;
  invoice_id: string;
  name: string | null;
  description: string | null;
  quantity: Numeric;
  price: Numeric;
  total: Numeric;
  hours: boolean | null;
};

type PaymentRow = {
  id: string;
  invoice_id: string;
  amount: Numeric;
  payment_type: string | null;
  status: string | null;
  transaction_date: string | null;
  transaction_id: string | null;
  notes: string | null;
};

async function fetchInvoice(id: string): Promise<Invoice | null> {
  const { data, error } = await invoiceDb
    .from("invoices")
    .select(
      "id,customer,customer_id,customer_email,customer_address,description,notes,date,due_date,status,work_order_id,subtotal,tax,total,payment_method",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || (data !== null && row(data)?.id !== id)) throw new Error("Invoice unavailable");
  if (data !== null) {
    const invoice = row(data)!;
    if (
      [
        "customer",
        "customer_id",
        "customer_email",
        "customer_address",
        "description",
        "notes",
        "date",
        "due_date",
        "status",
        "work_order_id",
        "payment_method",
      ].some((field) => !nullableText(invoice[field])) ||
      ["subtotal", "tax", "total"].some((field) => !sourceNumeric(invoice[field]))
    )
      throw new Error("Invoice unavailable");
  }
  return (data as Invoice) ?? null;
}

async function fetchInvoiceItems(id: string): Promise<ChildRead<InvoiceItem>> {
  const result = await invoiceDb
    .from("invoice_items")
    .select("id,invoice_id,name,description,quantity,price,total,hours", { count: "exact" })
    .eq("invoice_id", id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(DISPLAY_LIMIT + 1);
  const read = childRead<InvoiceItem>(result, id);
  if (
    read.rows.some(
      (item) =>
        !nullableText(item.name) ||
        !nullableText(item.description) ||
        !sourceNumeric(item.quantity) ||
        !sourceNumeric(item.price) ||
        !sourceNumeric(item.total) ||
        (item.hours !== null && typeof item.hours !== "boolean"),
    )
  )
    throw new Error("Invoice items unavailable");
  return read;
}

async function fetchInvoicePayments(id: string): Promise<ChildRead<PaymentRow>> {
  const result = await invoiceDb
    .from("payments")
    .select("id,invoice_id,amount,payment_type,status,transaction_date,transaction_id,notes", {
      count: "exact",
    })
    .eq("invoice_id", id)
    .order("transaction_date", { ascending: false })
    .order("id", { ascending: true })
    .limit(DISPLAY_LIMIT + 1);
  const read = childRead<PaymentRow>(result, id);
  if (
    read.rows.some(
      (item) =>
        !sourceNumeric(item.amount) ||
        ![
          item.payment_type,
          item.status,
          item.transaction_date,
          item.transaction_id,
          item.notes,
        ].every(nullableText),
    )
  )
    throw new Error("Invoice payments unavailable");
  return read;
}

export const Route = createFileRoute("/_authenticated/workspace/invoices/$id")({
  head: () => ({
    meta: [
      { title: "Invoice — Shop Manager" },
      { name: "description", content: "Invoice line items and payments." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvoiceDetailPage,
  errorComponent: function InvoiceRouteError({ reset }) {
    const router = useRouter();
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="text-2xl font-bold">Invoice</h1>
          <p className="mt-2 text-destructive">Could not load this invoice.</p>
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
  const { user, loading } = useAuth();
  if (!user || loading) return null;
  return <AuthenticatedInvoiceDetail key={`${user.id}:${id}`} userId={user.id} id={id} />;
}

function AuthenticatedInvoiceDetail({ userId, id }: { userId: string; id: string }) {
  const qc = useQueryClient();
  const isCurrent = useActiveScope();
  // A matching account cache entry is not a current read acknowledgment. A
  // per-mount key also prevents joining a prior account/route's in-flight read.
  const readLifetime = useId();
  const detailQ = useQuery({
    queryKey: ["shop-manager", userId, "invoices", "detail", id, readLifetime],
    queryFn: () => fetchInvoice(id),
    staleTime: 0,
    gcTime: 0,
    placeholderData: undefined,
    retry: false,
  });
  const { data, isLoading } = detailQ;
  const visible = detailQ.isSuccess && !detailQ.isFetching && data?.id === id;
  const itemsQ = useQuery({
    queryKey: ["shop-manager", userId, "invoices", "items", id, readLifetime],
    queryFn: () => fetchInvoiceItems(id),
    enabled: visible,
    staleTime: 0,
    gcTime: 0,
    placeholderData: undefined,
    retry: false,
  });
  const paymentsQ = useQuery({
    queryKey: ["shop-manager", userId, "invoices", "payments", id, readLifetime],
    queryFn: () => fetchInvoicePayments(id),
    enabled: visible,
    staleTime: 0,
    gcTime: 0,
    placeholderData: undefined,
    retry: false,
  });
  const allItems = itemsQ.data?.rows ?? [];
  const allPayments = paymentsQ.data?.rows ?? [];
  const items = itemsQ.isSuccess && !itemsQ.isFetching ? allItems.slice(0, DISPLAY_LIMIT) : [];
  const payments =
    paymentsQ.isSuccess && !paymentsQ.isFetching ? allPayments.slice(0, DISPLAY_LIMIT) : [];
  const totalUnits = minorUnits(data?.total);
  const subtotalUnits = minorUnits(data?.subtotal);
  const taxUnits = minorUnits(data?.tax);
  let paidUnits: number | null = 0;
  for (const payment of allPayments) {
    const units = minorUnits(payment.amount);
    if (units === null || !["completed", "void", "refunded"].includes(payment.status ?? "")) {
      paidUnits = null;
      break;
    }
    if (payment.status === "completed") paidUnits += units;
    if (!Number.isSafeInteger(paidUnits)) {
      paidUnits = null;
      break;
    }
  }
  const completeReads =
    visible &&
    itemsQ.isSuccess &&
    paymentsQ.isSuccess &&
    itemsQ.data?.complete === true &&
    paymentsQ.data?.complete === true &&
    !detailQ.isFetching &&
    !itemsQ.isFetching &&
    !paymentsQ.isFetching;
  const financialValuesReady =
    totalUnits !== null &&
    subtotalUnits !== null &&
    taxUnits !== null &&
    minorUnits(totalUnits / 100) === totalUnits &&
    minorUnits(subtotalUnits / 100) === subtotalUnits &&
    minorUnits(taxUnits / 100) === taxUnits &&
    subtotalUnits + taxUnits === totalUnits &&
    paidUnits !== null &&
    paidUnits <= totalUnits &&
    minorUnits((totalUnits - paidUnits) / 100) === totalUnits - paidUnits &&
    allItems.every((item) => minorUnits(item.total) !== null);
  const writesReady =
    completeReads && financialValuesReady && EDITABLE_STATUSES.has(data?.status ?? "");
  const balanceReady = completeReads && financialValuesReady;
  const outstanding = balanceReady ? (totalUnits! - paidUnits!) / 100 : null;
  const ready = useRef(false);
  useLayoutEffect(() => {
    ready.current = writesReady;
  }, [writesReady]);
  const hold = useRef<"pending" | "uncertain" | null>(null);
  const [writeHold, setWriteHold] = useState<typeof hold.current>(null);
  const assertReadiness = () => {
    if (!isCurrent() || !ready.current) throw new Error("Invoice data is not ready");
  };
  const refresh = () => {
    if (!isCurrent()) return;
    ready.current = false;
    for (const source of ["detail", "items", "payments"])
      void qc.invalidateQueries({
        queryKey: ["shop-manager", userId, "invoices", source, id],
        exact: false,
      });
    void qc.invalidateQueries({ queryKey: ["shop-manager", "invoices", "list"], exact: true });
    void qc.invalidateQueries({
      queryKey: ["shop-manager", userId, "invoices", "list"],
      exact: false,
    });
    if (data?.customer_id)
      void qc.invalidateQueries({
        queryKey: ["shop-manager", userId, "customer", data.customer_id, "invoices"],
        exact: true,
      });
  };
  const scope: InvoiceEditorScope = {
    userId,
    invoiceId: id,
    canWrite: writesReady && writeHold === null,
    isScopeCurrent: isCurrent,
    assertReadiness,
    beginWrite: () => {
      assertReadiness();
      if (hold.current !== null) throw new Error("Review the prior write first");
      hold.current = "pending";
      setWriteHold("pending");
    },
    onUncertain: () => {
      if (isCurrent() && hold.current === "pending") {
        hold.current = "uncertain";
        setWriteHold("uncertain");
      }
    },
    onConfirmed: () => {
      if (isCurrent()) {
        hold.current = null;
        setWriteHold(null);
      }
    },
    onWritten: refresh,
  };
  const snapshot = JSON.stringify([
    data?.customer_id,
    data?.status,
    data?.subtotal,
    data?.tax,
    data?.total,
    outstanding,
    allItems.map((item) => [
      item.id,
      item.invoice_id,
      item.quantity,
      item.price,
      item.total,
      item.hours,
    ]),
    allPayments.map((item) => [
      item.id,
      item.invoice_id,
      item.amount,
      item.status,
      item.payment_type,
      item.transaction_id,
    ]),
  ]);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/workspace/invoices">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to invoices
          </Link>
        </Button>

        {isLoading || detailQ.isFetching ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : detailQ.isError ? (
          <ReadFailure label="invoice" retry={() => void detailQ.refetch()} />
        ) : !data || !visible ? (
          <Card>
            <CardHeader>
              <CardTitle>Invoice not found</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This invoice may have been deleted or your shop no longer has access.
            </CardContent>
          </Card>
        ) : (
          <>
            {writeHold === "uncertain" ? (
              <p role="alert" className="mb-4 text-destructive">
                {UNCERTAIN_WRITE}
              </p>
            ) : null}
            {writeHold === "pending" ? (
              <p role="status" className="mb-4 text-sm">
                A financial write is awaiting acknowledgment. Other writes are paused.
              </p>
            ) : null}
            {!writesReady ? (
              <p className="mb-4 text-sm text-muted-foreground">
                Complete invoice, line item and payment reads are required before writing. Financial
                values or statuses that need review cannot be treated as zero.
              </p>
            ) : null}
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
                    <Link to="/workspace/work-orders/$id" params={{ id: data.work_order_id }}>
                      View work order
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bill to</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="font-medium">{data.customer ?? "—"}</div>
                  <div className="text-muted-foreground">{data.customer_email ?? "no email"}</div>
                  <div className="text-muted-foreground whitespace-pre-wrap">
                    {data.customer_address ?? ""}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Totals</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <Row label="Subtotal" value={money(data.subtotal)} />
                  <Row label="Tax" value={money(data.tax)} />
                  <Row label="Total" value={money(data.total)} strong />
                  <Row
                    label="Recorded completed payments"
                    value={
                      balanceReady
                        ? money(paidUnits! / 100)
                        : "Unavailable — review recorded payments"
                    }
                  />
                  <Row
                    label="Balance from recorded entries"
                    value={
                      outstanding !== null
                        ? money(outstanding)
                        : "Unavailable — review recorded payments"
                    }
                    strong
                    highlight={outstanding !== null && outstanding > 0}
                  />
                  <p className="pt-2 text-xs text-muted-foreground">
                    Recorded figures are not confirmation of settlement or ledger reconciliation.
                  </p>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base">
                    Line items{itemsQ.isSuccess ? ` (${items.length})` : ""}
                  </CardTitle>
                  <AddFromInventoryDialog
                    key={snapshot}
                    {...scope}
                    invoiceStatus={data.status}
                    customerId={data.customer_id}
                  />
                </CardHeader>
                <CardContent className="p-0">
                  {itemsQ.isError ? (
                    <ReadFailure label="line items" retry={() => void itemsQ.refetch()} />
                  ) : !itemsQ.isSuccess || itemsQ.isFetching ? (
                    <p className="p-6 text-sm">Loading line items…</p>
                  ) : items.length === 0 ? (
                    <div className="px-6 pb-6 text-sm text-muted-foreground">
                      {itemsQ.data.complete ? "No line items." : "Line items are unconfirmed."}
                    </div>
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
                                <Badge variant="outline" className="ml-2">
                                  hrs
                                </Badge>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {it.description ?? "—"}
                            </TableCell>
                            <TableCell className="text-right">{it.quantity ?? "—"}</TableCell>
                            <TableCell className="text-right">{money(it.price)}</TableCell>
                            <TableCell className="text-right">{money(it.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {itemsQ.isSuccess && !itemsQ.data.complete ? (
                    <p className="p-6 text-sm">
                      {allItems.length > DISPLAY_LIMIT
                        ? "Showing first 100 line items."
                        : "Line item completeness is unconfirmed."}{" "}
                      Writes and balance calculations require the complete record.
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base">
                    Payments{paymentsQ.isSuccess ? ` (${payments.length})` : ""}
                  </CardTitle>
                  <RecordPaymentDialog
                    key={snapshot}
                    {...scope}
                    customerId={data.customer_id}
                    outstanding={outstanding}
                    invoiceStatus={data.status}
                    invoiceTotal={data.total}
                  />
                </CardHeader>
                <CardContent className="p-0">
                  {paymentsQ.isError ? (
                    <ReadFailure label="payments" retry={() => void paymentsQ.refetch()} />
                  ) : !paymentsQ.isSuccess || paymentsQ.isFetching ? (
                    <p className="p-6 text-sm">Loading payments…</p>
                  ) : payments.length === 0 ? (
                    <div className="px-6 pb-6 text-sm text-muted-foreground">
                      {paymentsQ.data.complete
                        ? "No payments recorded."
                        : "Payments are unconfirmed."}
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
                              {p.transaction_date
                                ? new Date(p.transaction_date).toLocaleString()
                                : "—"}
                            </TableCell>
                            <TableCell>{p.payment_type ?? "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{p.status ?? "—"}</Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {p.transaction_id ?? "—"}
                            </TableCell>
                            <TableCell className="text-right">{money(p.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {paymentsQ.isSuccess && !paymentsQ.data.complete ? (
                    <p className="p-6 text-sm">
                      {allPayments.length > DISPLAY_LIMIT
                        ? "Showing first 100 payments."
                        : "Payment completeness is unconfirmed."}{" "}
                      Writes and balance calculations require the complete record.
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              {data.notes || data.description ? (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Notes</CardTitle>
                  </CardHeader>
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

function money(v: Numeric | undefined) {
  if (v === null || v === undefined || !sourceNumeric(v)) return "—";
  // Preserve unscaled source values for display. Financial writes have a narrower
  // explicit minor-unit boundary and never round unsupported native precision.
  return `₱${v}`;
}

function ReadFailure({ label, retry }: { label: string; retry: () => void }) {
  return (
    <div role="alert" className="p-6 text-sm text-destructive">
      Could not load {label}.{" "}
      <Button variant="outline" size="sm" onClick={retry}>
        Retry {label}
      </Button>
    </div>
  );
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
      <span className={(strong ? "font-semibold " : "") + (highlight ? "text-destructive" : "")}>
        {value}
      </span>
    </div>
  );
}

type InvoiceEditorScope = {
  userId: string;
  invoiceId: string;
  canWrite: boolean;
  isScopeCurrent: () => boolean;
  assertReadiness: () => void;
  beginWrite: () => void;
  onUncertain: () => void;
  onConfirmed: () => void;
  onWritten: () => void;
};
class FinancialWriteUncertain extends Error {}
function receipt(result: DbResult, fields: readonly string[]): Record<string, unknown> {
  const value = row(result.data);
  if (result.error || !value || fields.some((field) => !Object.hasOwn(value, field)))
    throw new FinancialWriteUncertain();
  return value;
}
function useWriteAcknowledgment(scope: InvoiceEditorScope, close: () => void) {
  const isMounted = useActiveScope();
  const isCurrent = () => isMounted() && scope.isScopeCurrent();
  return {
    isCurrent,
    check: () => {
      if (!isCurrent()) throw new FinancialWriteUncertain();
      scope.assertReadiness();
    },
    success: (message: string) => {
      if (!isCurrent()) {
        scope.onUncertain();
        return;
      }
      scope.onConfirmed();
      scope.onWritten();
      toast.success(message);
      close();
    },
    error: (error: unknown) => {
      const uncertain = error instanceof FinancialWriteUncertain;
      if (uncertain) scope.onUncertain();
      if (!isCurrent()) return;
      if (uncertain) scope.onWritten();
      toast.error(
        uncertain ? UNCERTAIN_WRITE : "Check the invoice and supported values before saving.",
      );
    },
  };
}

type PaymentProps = InvoiceEditorScope & {
  customerId: string | null;
  outstanding: number | null;
  invoiceStatus: string | null;
  invoiceTotal: Numeric;
};
function RecordPaymentDialog(props: PaymentProps) {
  const [open, setOpen] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (next) setEpoch((value) => value + 1);
  };
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={
            !props.canWrite ||
            props.outstanding === null ||
            props.outstanding <= 0 ||
            !recordId(props.customerId)
          }
        >
          <Plus className="mr-1 h-4 w-4" /> Record payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Record an existing payment entry. This does not charge a customer or confirm settlement.
          </DialogDescription>
        </DialogHeader>
        {open ? <RecordPaymentForm key={epoch} {...props} close={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
const METHODS = ["cash", "card", "bank_transfer", "gcash", "check", "other"] as const;
function RecordPaymentForm(props: PaymentProps & { close: () => void }) {
  const { invoiceId, customerId, outstanding, invoiceStatus, invoiceTotal } = props;
  const ack = useWriteAcknowledgment(props, props.close);
  const [amount, setAmount] = useState(
    outstanding !== null && outstanding > 0 ? String(outstanding) : "",
  );
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const record = useMutation({
    mutationFn: async () => {
      ack.check();
      const units = minorUnits(amount);
      const balance = minorUnits(outstanding);
      if (
        units === null ||
        units <= 0 ||
        balance === null ||
        balance <= 0 ||
        units > balance ||
        !recordId(customerId) ||
        !METHODS.some((value) => value === method) ||
        reference.length > 200 ||
        notes.length > 2_000
      )
        throw new Error("Invalid payment draft");
      const amt = amountNumber(units);
      const ref = reference.trim() || null;
      const total = minorUnits(invoiceTotal);
      if (total === null || !invoiceStatus) throw new Error("Incomplete invoice");
      const totalAmount = amountNumber(total);
      props.beginWrite();
      try {
        const payment = receipt(
          await invoiceDb
            .from("payments")
            .insert({
              invoice_id: invoiceId,
              customer_id: customerId,
              amount: amt,
              payment_type: method,
              status: "completed",
              transaction_date: new Date().toISOString(),
              transaction_id: ref,
              notes: notes.trim() || null,
            })
            .select("id,invoice_id,customer_id,amount,payment_type,status,transaction_id")
            .single(),
          ["id", "invoice_id", "customer_id", "amount", "payment_type", "status", "transaction_id"],
        );
        if (
          !recordId(payment.id) ||
          payment.invoice_id !== invoiceId ||
          payment.customer_id !== customerId ||
          minorUnits(payment.amount) !== units ||
          payment.payment_type !== method ||
          payment.status !== "completed" ||
          (ref !== null
            ? payment.transaction_id !== ref
            : payment.transaction_id !== null && !recordId(payment.transaction_id))
        )
          throw new FinancialWriteUncertain();
        ack.check();
        if (units === balance) {
          // This retained follow-up is not atomic balance/settlement authority.
          // Optimistic filters and returned rows expose conflicts, not concurrency safety.
          const invoice = receipt(
            await invoiceDb
              .from("invoices")
              .update({ status: "paid", payment_method: method })
              .eq("id", invoiceId)
              .eq("customer_id", customerId)
              .eq("status", invoiceStatus)
              .eq("total", totalAmount)
              .select("id,customer_id,status,payment_method,total")
              .single(),
            ["id", "customer_id", "status", "payment_method", "total"],
          );
          if (
            invoice.id !== invoiceId ||
            invoice.customer_id !== customerId ||
            invoice.status !== "paid" ||
            invoice.payment_method !== method ||
            minorUnits(invoice.total) !== total
          )
            throw new FinancialWriteUncertain();
          ack.check();
        }
      } catch {
        throw new FinancialWriteUncertain();
      }
    },
    onSuccess: () => ack.success("Payment entry recorded"),
    onError: ack.error,
  });
  const disabled = !props.canWrite || record.isPending;
  return (
    <>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="payment-amount">Amount ₱ *</Label>
            <Input
              id="payment-amount"
              type="number"
              step="0.01"
              value={amount}
              disabled={disabled}
              onChange={(event) => setAmount(event.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Recorded balance: {money(outstanding)}
            </p>
          </div>
          <div>
            <Label htmlFor="payment-method">Method *</Label>
            <Select value={method} onValueChange={setMethod} disabled={disabled}>
              <SelectTrigger id="payment-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="payment-reference">Reference / transaction #</Label>
          <Input
            id="payment-reference"
            value={reference}
            disabled={disabled}
            onChange={(event) => setReference(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="payment-notes">Notes</Label>
          <Textarea
            id="payment-notes"
            value={notes}
            disabled={disabled}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={props.close}>
          Cancel
        </Button>
        <Button disabled={disabled || !amount} onClick={() => record.mutate()}>
          {record.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}

// ---------- Add from inventory ----------

type InventoryPick = {
  id: string;
  name: string;
  sku: string | null;
  quantity: number | null;
  sell_price_per_unit: Numeric;
  unit_price: Numeric;
  cost_per_unit: Numeric;
};

type InventoryProps = InvoiceEditorScope & {
  invoiceStatus: string | null;
  customerId: string | null;
};
function AddFromInventoryDialog(props: InventoryProps) {
  const [open, setOpen] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (next) setEpoch((value) => value + 1);
  };
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={!props.canWrite}>
          <Package className="mr-1 h-4 w-4" /> Add from inventory
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add inventory item to invoice</DialogTitle>
          <DialogDescription>
            This records an invoice line. Stock, cost posting and financial reconciliation require
            separate verification.
          </DialogDescription>
        </DialogHeader>
        {open ? <InventoryForm key={epoch} {...props} close={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function InventoryForm(props: InventoryProps & { close: () => void }) {
  const { userId, invoiceId, invoiceStatus, customerId } = props;
  const ack = useWriteAcknowledgment(props, props.close);
  const pickerLifetime = useId();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<InventoryPick | null>(null);
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const searchValid = search.length <= 80 && /^[\p{L}\p{N} ._/-]*$/u.test(search);
  const pickerQ = useQuery({
    queryKey: [
      "shop-manager",
      userId,
      "invoices",
      "inventory-pick",
      invoiceId,
      search,
      pickerLifetime,
    ],
    enabled: searchValid && props.canWrite,
    staleTime: 0,
    gcTime: 0,
    placeholderData: undefined,
    retry: false,
    queryFn: async () => {
      let q = invoiceDb
        .from("inventory_items")
        .select("id,name,sku,quantity,sell_price_per_unit,unit_price,cost_per_unit")
        .order("name")
        .order("id")
        .limit(25);
      if (search.trim())
        q = q.or(`name.ilike.%${search}%,sku.ilike.%${search}%,part_number.ilike.%${search}%`);
      const { data, error } = await q;
      if (error || !Array.isArray(data) || data.length > 25)
        throw new Error("Inventory unavailable");
      const ids = new Set<string>();
      for (const item of data) {
        const value = row(item);
        if (
          !value ||
          !recordId(value.id) ||
          ids.has(value.id) ||
          typeof value.name !== "string" ||
          (value.sku !== null && typeof value.sku !== "string") ||
          (value.quantity !== null &&
            (typeof value.quantity !== "number" ||
              !Number.isSafeInteger(value.quantity) ||
              value.quantity < 0)) ||
          [value.sell_price_per_unit, value.unit_price, value.cost_per_unit].some(
            (amount) => !sourceNumeric(amount),
          )
        )
          throw new Error("Inventory unavailable");
        ids.add(value.id);
      }
      return data as InventoryPick[];
    },
  });
  const results = useMemo(
    () => (pickerQ.isSuccess ? pickerQ.data : []),
    [pickerQ.isSuccess, pickerQ.data],
  );
  const draft = JSON.stringify(selected);
  useLayoutEffect(() => {
    if (!selected) return;
    const latest = results.find((item) => item.id === selected.id);
    if (!latest || JSON.stringify(latest) !== draft) setSelected(null);
  }, [results, selected, draft]);
  const pick = (row: InventoryPick) => {
    setSelected(row);
    setPrice(String(row.sell_price_per_unit ?? row.unit_price ?? ""));
    if (!qty) setQty("1");
  };
  const add = useMutation({
    mutationFn: async () => {
      ack.check();
      const count = Number(qty);
      const priceUnits = minorUnits(price);
      const costUnits = minorUnits(selected?.cost_per_unit);
      if (
        !selected ||
        !searchValid ||
        !pickerQ.isSuccess ||
        pickerQ.isFetching ||
        !results.some((item) => item === selected) ||
        !Number.isSafeInteger(count) ||
        count <= 0 ||
        !Number.isSafeInteger(selected.quantity) ||
        selected.quantity! < count ||
        priceUnits === null ||
        costUnits === null ||
        !invoiceStatus
      )
        throw new Error("Invalid inventory draft");
      const totalUnits = priceUnits * count;
      const lineTotal = amountNumber(totalUnits);
      const priceAmount = amountNumber(priceUnits);
      const unitCost = amountNumber(costUnits);
      props.beginWrite();
      try {
        const inserted = receipt(
          await invoiceDb
            .from("invoice_items")
            .insert({
              invoice_id: invoiceId,
              inventory_item_id: selected.id,
              name: selected.name,
              description: selected.sku ? `SKU ${selected.sku}` : null,
              quantity: count,
              price: priceAmount,
              total: lineTotal,
              unit_cost: unitCost,
              hours: false,
            })
            .select("id,invoice_id,inventory_item_id,quantity,price,total")
            .single(),
          ["id", "invoice_id", "inventory_item_id", "quantity", "price", "total"],
        );
        if (
          !recordId(inserted.id) ||
          inserted.invoice_id !== invoiceId ||
          inserted.inventory_item_id !== selected.id ||
          !(typeof inserted.quantity === "number" || typeof inserted.quantity === "string") ||
          !/^\d+$/.test(String(inserted.quantity)) ||
          Number(inserted.quantity) !== count ||
          minorUnits(inserted.price) !== priceUnits ||
          minorUnits(inserted.total) !== totalUnits
        )
          throw new FinancialWriteUncertain();
        ack.check();
        const lines = childRead<Record<string, unknown>>(
          await invoiceDb
            .from("invoice_items")
            .select("id,invoice_id,total", { count: "exact" })
            .eq("invoice_id", invoiceId)
            .order("id")
            .limit(DISPLAY_LIMIT + 1),
          invoiceId,
        );
        if (!lines.complete || !lines.rows.some((item) => item.id === inserted.id))
          throw new FinancialWriteUncertain();
        let subtotalUnits = 0;
        for (const item of lines.rows) {
          const units = minorUnits(item.total);
          if (units === null) throw new FinancialWriteUncertain();
          subtotalUnits += units;
          if (!Number.isSafeInteger(subtotalUnits)) throw new FinancialWriteUncertain();
        }
        ack.check();
        const invoice = receipt(
          await invoiceDb
            .from("invoices")
            .select("id,customer_id,status,tax")
            .eq("id", invoiceId)
            .maybeSingle(),
          ["id", "customer_id", "status", "tax"],
        );
        const taxUnits = minorUnits(invoice.tax);
        if (
          invoice.id !== invoiceId ||
          invoice.customer_id !== customerId ||
          invoice.status !== invoiceStatus ||
          taxUnits === null
        )
          throw new FinancialWriteUncertain();
        const subtotal = amountNumber(subtotalUnits);
        const total = amountNumber(subtotalUnits + taxUnits);
        ack.check();
        let update = invoiceDb
          .from("invoices")
          .update({ subtotal, total })
          .eq("id", invoiceId)
          .eq("status", invoiceStatus)
          .eq("tax", amountNumber(taxUnits));
        update =
          customerId === null
            ? update.is("customer_id", null)
            : update.eq("customer_id", customerId);
        const updated = receipt(await update.select("id,customer_id,subtotal,tax,total").single(), [
          "id",
          "customer_id",
          "subtotal",
          "tax",
          "total",
        ]);
        if (
          updated.id !== invoiceId ||
          updated.customer_id !== customerId ||
          minorUnits(updated.subtotal) !== subtotalUnits ||
          minorUnits(updated.tax) !== taxUnits ||
          minorUnits(updated.total) !== subtotalUnits + taxUnits
        )
          throw new FinancialWriteUncertain();
        ack.check();
      } catch {
        throw new FinancialWriteUncertain();
      }
    },
    onSuccess: () => ack.success("Invoice line recorded"),
    onError: ack.error,
  });
  const disabled = !props.canWrite || add.isPending;
  return (
    <>
      <div className="space-y-3">
        <Input
          placeholder="Search inventory by name, SKU, or part #"
          value={search}
          disabled={disabled}
          onChange={(e) => {
            setSelected(null);
            setSearch(e.target.value);
          }}
        />
        <div className="max-h-64 overflow-y-auto border rounded">
          {!searchValid ? (
            <p className="p-4 text-sm">
              Use letters, numbers, spaces, dots, dashes or slashes (up to 80 characters).
            </p>
          ) : pickerQ.isError ? (
            <ReadFailure label="inventory" retry={() => void pickerQ.refetch()} />
          ) : pickerQ.isFetching ? (
            <div className="p-4 text-sm text-muted-foreground">Searching…</div>
          ) : !pickerQ.isSuccess ? (
            <p className="p-4 text-sm">Inventory results are unconfirmed.</p>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No inventory found.</div>
          ) : (
            results.map((r) => (
              <button
                type="button"
                key={r.id}
                disabled={disabled}
                onClick={() => pick(r)}
                className={
                  "w-full text-left px-3 py-2 border-b last:border-0 hover:bg-muted flex justify-between items-center " +
                  (selected?.id === r.id ? "bg-muted" : "")
                }
              >
                <div>
                  <div className="font-medium text-sm">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.sku ?? "no SKU"} · in stock: {r.quantity ?? "unknown"}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div>{money(r.sell_price_per_unit ?? r.unit_price)}</div>
                  <div className="text-xs text-muted-foreground">cost {money(r.cost_per_unit)}</div>
                </div>
              </button>
            ))
          )}
        </div>
        {selected ? (
          <div className="grid grid-cols-2 gap-3 border-t pt-3">
            <div>
              <Label htmlFor="invoice-quantity">Quantity *</Label>
              <Input
                id="invoice-quantity"
                type="number"
                min="1"
                step="1"
                value={qty}
                disabled={disabled}
                onChange={(e) => setQty(e.target.value)}
              />
              <div className="mt-1 text-xs text-muted-foreground">
                Available: {selected.quantity ?? "unknown"}
              </div>
            </div>
            <div>
              <Label htmlFor="invoice-price">Sell price ₱ *</Label>
              <Input
                id="invoice-price"
                type="number"
                step="0.01"
                value={price}
                disabled={disabled}
                onChange={(e) => setPrice(e.target.value)}
              />
              <div className="mt-1 text-xs text-muted-foreground">
                Cost {money(selected.cost_per_unit)} · Verify line amounts before saving.
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Pick an item above to set quantity and price.
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={props.close}>
          Cancel
        </Button>
        <Button
          disabled={disabled || !selected || !pickerQ.isSuccess || pickerQ.isFetching}
          onClick={() => add.mutate()}
        >
          {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to invoice"}
        </Button>
      </DialogFooter>
    </>
  );
}
