import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useId, useMemo, useState } from "react";
import { z } from "zod";
import { FileText, Loader2, Plus, Search } from "lucide-react";
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
const LOAD_FAILURE = "Could not load quotes. Please try again.";
const PROJECTION =
  "id,quote_number,customer_id,status,total_amount,expiry_date,created_at,converted_to_work_order_id";
const uuid = z.string().regex(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
const quoteSchema = z
  .object({
    id: uuid,
    quote_number: z.string().nullable(),
    customer_id: uuid.nullable(),
    status: z.string(),
    // Unsupported values are labelled unavailable, never coerced to zero.
    total_amount: z.unknown(),
    // Keep native DATE/TSTZ text verbatim: PostgreSQL also supports infinity,
    // expanded/BC years and output forms outside a browser's ISO date parser.
    // Ordering is done by the database; this page does not infer expiry.
    expiry_date: z.string().nullable(),
    created_at: z.string(),
    converted_to_work_order_id: uuid.nullable(),
  })
  .strict();
type QuoteRow = z.infer<typeof quoteSchema>;
type QuoteSnapshot = { rows: QuoteRow[]; count: number | null; hasMore: boolean };
type QuoteResponse = { data: unknown; error: unknown; count: unknown };
type QuoteRead = PromiseLike<QuoteResponse> & {
  order(column: "created_at" | "id", options: { ascending: false; nullsFirst: false }): QuoteRead;
  limit(count: number): QuoteRead;
  abortSignal(signal: AbortSignal): QuoteRead;
  retry(enabled: false): QuoteRead;
};
type QuoteClient = {
  from(table: "quotes"): {
    select(projection: string, options: { count: "exact" }): QuoteRead;
  };
};
const quoteClient = smSupabase as unknown as QuoteClient;

function parseSnapshot(data: unknown, count: unknown): QuoteSnapshot {
  if (
    !Array.isArray(data) ||
    data.length > FETCH_LIMIT ||
    (count !== null && (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0)) ||
    (typeof count === "number" && count < data.length)
  )
    throw new Error(LOAD_FAILURE);
  for (let index = 0; index < data.length; index++) {
    if (!Object.hasOwn(data, index)) throw new Error(LOAD_FAILURE);
  }
  const ids = new Set<string>();
  // Check every complete row, including the undisplayed 101st sentinel.
  const rows = data.map((value: unknown): QuoteRow => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      !PROJECTION.split(",").every((key) => Object.hasOwn(value, key))
    )
      throw new Error(LOAD_FAILURE);
    const parsed = quoteSchema.safeParse(value);
    if (!parsed.success || ids.has(parsed.data.id.toLowerCase())) throw new Error(LOAD_FAILURE);
    ids.add(parsed.data.id.toLowerCase());
    return parsed.data;
  });
  return {
    rows: rows.slice(0, DISPLAY_LIMIT),
    count: count as number | null,
    hasMore: rows.length > DISPLAY_LIMIT || (typeof count === "number" && count > rows.length),
  };
}

async function fetchQuotes(signal: AbortSignal): Promise<QuoteSnapshot> {
  if (signal.aborted) throw new Error(LOAD_FAILURE);
  const { data, error, count } = await quoteClient
    .from("quotes")
    .select(PROJECTION, { count: "exact" })
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false, nullsFirst: false })
    .limit(FETCH_LIMIT)
    .abortSignal(signal)
    .retry(false);
  if (error || signal.aborted) throw new Error(LOAD_FAILURE);
  return parseSnapshot(data, count);
}

// Presentation, not accounting arithmetic. Preserve received decimal digits;
// a JSON number cannot recover precision already lost upstream. These bounds
// limit display work, not the database's NUMERIC scale or accounting policy.
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

function QuotesError({ reset }: { reset: () => void }) {
  const { user, loading } = useAuth();
  if (!user || loading) return null;
  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Quotes</h1>
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

export const Route = createFileRoute("/_authenticated/workspace/quotes")({
  head: () => ({
    meta: [
      { title: "Quotes — Shop Manager" },
      { name: "description", content: "Review a bounded snapshot of visible shop quotes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuotesList,
  errorComponent: QuotesError,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">Not found.</div>
    </SiteLayout>
  ),
});

function statusVariant(status: string): "default" | "outline" | "destructive" | "secondary" {
  const value = status.toLowerCase();
  if (value === "approved" || value === "converted") return "default";
  if (value === "rejected" || value === "expired") return "destructive";
  if (value === "sent") return "secondary";
  return "outline";
}

function QuotesList() {
  const { user, loading } = useAuth();
  if (!user || loading) return null;
  return <AccountQuotes key={user.id} userId={user.id} />;
}

function AccountQuotes({ userId }: { userId: string }) {
  const readLifetime = useId();
  const query = useQuery({
    queryKey: ["shop-manager", userId, "quotes", "list", readLifetime],
    queryFn: ({ signal }) => fetchQuotes(signal),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    placeholderData: undefined,
    retry: false,
  });
  const [q, setQ] = useState("");
  // Isolate observed UI lifetimes, not browser JWTs/database authorization.
  // Refreshing/failed cached rows are never a fresh snapshot for this render.
  const snapshot = !query.isFetching && !query.isError ? query.data : undefined;
  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    return (snapshot?.rows ?? []).filter(
      (row) =>
        !search ||
        [row.id, row.quote_number, row.status].some((value) =>
          (value ?? "").toLowerCase().includes(search),
        ),
    );
  }, [snapshot, q]);
  const emptyConfirmed = snapshot?.rows.length === 0 && snapshot.count === 0;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileText aria-hidden="true" className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Quotes</h1>
              <p className="text-muted-foreground">
                Visible quote snapshot, newest creation timestamp first.
              </p>
            </div>
          </div>
          <Button asChild>
            <Link to="/workspace/quotes/new">
              <Plus aria-hidden="true" className="mr-2 h-4 w-4" /> New Quote
            </Link>
          </Button>
        </div>
        <div className="mb-4 relative max-w-md">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <Input
            aria-label="Search displayed quotes"
            className="pl-9"
            placeholder="Search quote #, ID or status…"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Search filters only the displayed snapshot, not all shop records.
        </p>
        <div className="mb-4 text-sm">
          <span className="text-muted-foreground">Filtered records: </span>
          <span aria-label="Filtered record count">{snapshot ? filtered.length : "—"}</span>
        </div>

        {query.isFetching || query.isPending ? (
          <div role="status" className="flex items-center gap-2 text-muted-foreground">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Loading quotes…
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
                  ? `Showing ${snapshot.rows.length} returned quotes. Total visible count unavailable.`
                  : `Showing ${snapshot.rows.length} of ${snapshot.count} visible quotes in this snapshot.`}
              </p>
              <p>
                {snapshot.hasMore
                  ? "More visible records exist; this page displays at most 100 quotes. Search does not include omitted records."
                  : snapshot.count === null
                    ? "Completeness is unverified because the total visible count is unavailable."
                    : "All counted visible quotes are shown for this snapshot."}
              </p>
            </div>
            {filtered.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  <p>
                    {snapshot.rows.length > 0
                      ? "No displayed quotes match your search."
                      : emptyConfirmed
                        ? "No visible quotes in this returned snapshot."
                        : snapshot.count === null
                          ? "No quote rows were returned. An empty quote list is not confirmed because the visible count is unavailable."
                          : "No quote rows were returned despite a positive visible count. This snapshot is incomplete."}
                  </p>
                  {!emptyConfirmed && snapshot.rows.length === 0 && (
                    <Button className="mt-3" onClick={() => void query.refetch()}>
                      Retry
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quote #</TableHead>
                        <TableHead>Created (stored timestamp)</TableHead>
                        <TableHead>Expires (stored date)</TableHead>
                        <TableHead className="text-right">Recorded total ₱</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Work order</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((row) => (
                        <TableRow key={row.id.toLowerCase()}>
                          <TableCell className="font-medium">
                            <Link
                              to="/workspace/quotes/$id"
                              params={{ id: row.id }}
                              className="text-primary hover:underline"
                            >
                              {row.quote_number || row.id}
                            </Link>
                          </TableCell>
                          <TableCell>{row.created_at || "Timestamp unavailable"}</TableCell>
                          <TableCell>
                            {row.expiry_date === null ? "—" : row.expiry_date || "Date unavailable"}
                          </TableCell>
                          <TableCell className="text-right break-all">
                            {displayAmount(row.total_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(row.status)}>
                              {row.status || "Status unavailable"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {row.converted_to_work_order_id ? (
                              <Link
                                to="/workspace/work-orders/$id"
                                params={{ id: row.converted_to_work_order_id }}
                                className="text-primary hover:underline text-sm"
                              >
                                View WO →
                              </Link>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
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
          Recorded quote totals are not revenue, payments, or a receivables balance. Refresh to load
          a new snapshot.
        </p>
        <div className="mt-6">
          <Button asChild variant="ghost">
            <Link to="/workspace">← Back to Shop Manager</Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
