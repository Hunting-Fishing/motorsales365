import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useId, useMemo, useState } from "react";
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
import { useAuth } from "@/hooks/use-auth";
import { smSupabase } from "@/lib/shop-manager/db";

const DISPLAY_LIMIT = 100;
const FETCH_LIMIT = DISPLAY_LIMIT + 1;
const LOAD_FAILURE = "Could not load invoices. Please try again.";
const PROJECTION =
  "id,customer,customer_email,customer_id,date,due_date,status,subtotal,tax,total,work_order_id";

type InvoiceRow = {
  id: string;
  customer: string | null;
  customer_email: string | null;
  customer_id: string | null;
  date: string | null;
  due_date: string | null;
  status: string | null;
  subtotal: unknown;
  tax: unknown;
  total: unknown;
  work_order_id: string | null;
};
type InvoiceSnapshot = { rows: InvoiceRow[]; count: number | null; hasMore: boolean };
type InvoiceResponse = { data: unknown; error: unknown; count: unknown };
type InvoiceRead = PromiseLike<InvoiceResponse> & {
  order(column: "date" | "id", options: { ascending: false; nullsFirst: false }): InvoiceRead;
  limit(count: number): InvoiceRead;
  abortSignal(signal: AbortSignal): InvoiceRead;
};
type InvoiceClient = {
  from(table: "invoices"): {
    select(projection: string, options: { count: "exact" }): InvoiceRead;
  };
};
const invoiceClient = smSupabase as unknown as InvoiceClient;

function parseSnapshot(data: unknown, count: unknown): InvoiceSnapshot {
  if (
    !Array.isArray(data) ||
    data.length > FETCH_LIMIT ||
    (count !== null && (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0)) ||
    (typeof count === "number" && count < data.length)
  )
    throw new Error(LOAD_FAILURE);

  const ids = new Set<string>();
  const rows = data.map((value: unknown): InvoiceRow => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(LOAD_FAILURE);
    const row = value as Record<string, unknown>;
    if (
      Object.keys(row).length !== PROJECTION.split(",").length ||
      !PROJECTION.split(",").every((key) => Object.hasOwn(row, key)) ||
      typeof row.id !== "string" ||
      ids.has(row.id) ||
      ![
        "customer",
        "customer_email",
        "customer_id",
        "date",
        "due_date",
        "status",
        "work_order_id",
      ].every((key) => row[key] === null || typeof row[key] === "string")
    )
      throw new Error(LOAD_FAILURE);
    // Native invoice IDs are opaque TEXT: case and formatting are significant.
    ids.add(row.id);
    return row as InvoiceRow;
  });
  return {
    rows: rows.slice(0, DISPLAY_LIMIT),
    count: count as number | null,
    hasMore: rows.length > DISPLAY_LIMIT || (typeof count === "number" && count > rows.length),
  };
}

async function fetchInvoices(signal: AbortSignal): Promise<InvoiceSnapshot> {
  if (signal.aborted) throw new Error(LOAD_FAILURE);
  const { data, error, count } = await invoiceClient
    .from("invoices")
    .select(PROJECTION, { count: "exact" })
    // These native fields are TEXT. This is a stable text order, not a date interpretation.
    .order("date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false, nullsFirst: false })
    .limit(FETCH_LIMIT)
    .abortSignal(signal);
  if (error || signal.aborted) throw new Error(LOAD_FAILURE);
  return parseSnapshot(data, count);
}

// Presentation only, not accounting arithmetic. Preserve the received decimal digits;
// a JSON number cannot recover precision already lost before it reached this page.
// Bounds limit display work, not the database's NUMERIC precision or accounting policy.
function displayAmount(value: unknown): string {
  if (typeof value !== "string" && (typeof value !== "number" || !Number.isFinite(value)))
    return "Amount unavailable";
  const raw = String(value);
  if (raw.length > 512) return "Amount unavailable";
  const match = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d{1,4}))?$/.exec(raw);
  if (!match) return "Amount unavailable";
  const integer = match[2] ?? "0";
  const fraction = match[3] ?? match[4] ?? "";
  const digits = integer + fraction;
  const point = integer.length + Number(match[5] ?? 0);
  if (Math.abs(point) > 1024 || digits.length + Math.abs(point) > 1536) return "Amount unavailable";
  let whole: string;
  let decimal: string;
  if (point <= 0) {
    whole = "0";
    decimal = "0".repeat(-point) + digits;
  } else if (point >= digits.length) {
    whole = digits + "0".repeat(point - digits.length);
    decimal = "";
  } else {
    whole = digits.slice(0, point);
    decimal = digits.slice(point);
  }
  whole = whole.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${match[1] === "-" ? "-" : ""}${whole}${decimal ? `.${decimal}` : ""}`;
}

function InvoicesError({ reset }: { reset: () => void }) {
  const { user, loading } = useAuth();
  if (!user || loading) return null;
  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p role="alert" className="mt-2 text-destructive">
          {LOAD_FAILURE}
        </p>
        <Button className="mt-4" onClick={reset}>
          Retry
        </Button>
      </div>
    </SiteLayout>
  );
}

export const Route = createFileRoute("/_authenticated/workspace/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices — Shop Manager" },
      { name: "description", content: "Review a bounded snapshot of your visible shop invoices." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvoicesList,
  errorComponent: InvoicesError,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">Not found.</div>
    </SiteLayout>
  ),
});

function statusVariant(status: string | null) {
  switch ((status ?? "").toLowerCase()) {
    case "paid":
      return "secondary" as const;
    case "overdue":
    case "past_due":
      return "destructive" as const;
    case "sent":
    case "issued":
    case "open":
      return "default" as const;
    default:
      return "outline" as const;
  }
}

function InvoicesList() {
  const { user, loading } = useAuth();
  if (!user || loading) return null;
  return <AccountInvoices key={user.id} userId={user.id} />;
}

function AccountInvoices({ userId }: { userId: string }) {
  const readLifetime = useId();
  const query = useQuery({
    queryKey: ["shop-manager", userId, "invoices", "list", readLifetime],
    queryFn: ({ signal }) => fetchInvoices(signal),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    retry: false,
  });
  const [q, setQ] = useState("");
  // Account keys and cancellation isolate observed UI lifetimes, not the browser
  // client's bearer token or database authorization. Never paint a refreshing cache.
  const snapshot = !query.isFetching && !query.isError ? query.data : undefined;
  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    return (snapshot?.rows ?? []).filter(
      (row) =>
        !search ||
        [row.id, row.customer, row.customer_email, row.status].some((value) =>
          (value ?? "").toLowerCase().includes(search),
        ),
    );
  }, [snapshot, q]);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Receipt aria-hidden="true" className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Invoices</h1>
              <p className="text-muted-foreground">
                Visible invoice snapshot, ordered by stored date text and invoice ID.
              </p>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="text-muted-foreground">Filtered records</div>
            <div className="text-lg font-semibold" aria-label="Filtered record count">
              {snapshot ? filtered.length : "—"}
            </div>
          </div>
        </div>

        <div className="mb-4 relative max-w-md">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <Input
            aria-label="Search displayed invoices"
            className="pl-9"
            placeholder="Search invoice #, customer, status…"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Search filters only the displayed snapshot, not all shop records.
        </p>

        {query.isFetching || query.isPending ? (
          <div role="status" className="flex items-center gap-2 text-muted-foreground">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Loading invoices…
          </div>
        ) : query.isError || !snapshot ? (
          <Card>
            <CardContent className="py-6">
              <p role="alert" className="text-destructive">
                {LOAD_FAILURE}
              </p>
              <Button className="mt-3" onClick={() => void query.refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              <p>
                {snapshot.count === null
                  ? `Showing ${snapshot.rows.length} returned invoices. Total visible count unavailable.`
                  : `Showing ${snapshot.rows.length} of ${snapshot.count} visible invoices in this snapshot.`}
              </p>
              <p>
                {snapshot.hasMore
                  ? "More visible records exist; this page displays at most 100 invoices. Search does not include omitted records."
                  : snapshot.count === null
                    ? "Completeness is unverified because the total visible count is unavailable."
                    : "All counted visible invoices are shown for this snapshot."}
              </p>
            </div>
            {filtered.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  {snapshot.rows.length === 0
                    ? "No visible invoices in this returned snapshot."
                    : "No displayed invoices match your search."}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date (stored text)</TableHead>
                        <TableHead>Due (stored text)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Recorded total ₱</TableHead>
                        <TableHead>WO</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono">
                            <Link
                              to="/workspace/invoices/$id"
                              params={{ id: row.id }}
                              className="text-primary hover:underline"
                            >
                              {row.id || "(empty invoice ID)"}
                            </Link>
                          </TableCell>
                          <TableCell>{row.customer ?? row.customer_email ?? "—"}</TableCell>
                          <TableCell>{row.date ?? "—"}</TableCell>
                          <TableCell>{row.due_date ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(row.status)}>{row.status ?? "—"}</Badge>
                          </TableCell>
                          <TableCell className="text-right break-all">
                            {displayAmount(row.total)}
                          </TableCell>
                          <TableCell>
                            {row.work_order_id ? (
                              <Link
                                to="/workspace/work-orders/$id"
                                params={{ id: row.work_order_id }}
                                className="text-primary hover:underline"
                              >
                                open
                              </Link>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <p className="mt-6 text-sm text-muted-foreground">
          Recorded invoice totals are not an accounts-receivable balance. Open an invoice to review
          its recorded items and payments.
        </p>
        <div className="mt-4">
          <Button asChild variant="ghost">
            <Link to="/workspace">← Back to Shop Manager</Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
