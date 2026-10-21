import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useId, useRef } from "react";
import { z } from "zod";
import { Loader2, FileText } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { QuoteWorkflowControl } from "@/components/shop-manager/quote-workflow";

const DISPLAY_LIMIT = 100;
const FETCH_LIMIT = DISPLAY_LIMIT + 1;
const QUOTE_FAILURE = "Could not load this quote. Please try again.";
const ITEMS_FAILURE = "Could not load quote items. Please try again.";
const QUOTE_PROJECTION =
  "id,quote_number,customer_id,vehicle_id,status,subtotal,tax_rate,tax_amount,total_amount,expiry_date,notes,terms_conditions,created_at,converted_to_work_order_id";
const ITEMS_PROJECTION =
  "id,quote_id,name,description,category,quantity,unit_price,total_price,item_type,display_order";
const uuid = z.string().regex(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
const quoteSchema = z
  .object({
    id: uuid,
    quote_number: z.string().nullable(),
    customer_id: uuid.nullable(),
    vehicle_id: uuid.nullable(),
    status: z.string(),
    subtotal: z.unknown(),
    tax_rate: z.unknown(),
    tax_amount: z.unknown(),
    total_amount: z.unknown(),
    // Native DATE/TSTZ can include infinity, expanded/BC years and other source
    // representations. Keep the text; do not calculate expiry or coerce dates.
    expiry_date: z.string().nullable(),
    notes: z.string().nullable(),
    terms_conditions: z.string().nullable(),
    created_at: z.string(),
    converted_to_work_order_id: uuid.nullable(),
  })
  .strict();
const itemSchema = z
  .object({
    id: uuid,
    quote_id: uuid,
    name: z.string(),
    description: z.string().nullable(),
    category: z.string().nullable(),
    quantity: z.unknown(),
    unit_price: z.unknown(),
    total_price: z.unknown(),
    item_type: z.string(),
    display_order: z.number().int().min(-2147483648).max(2147483647).nullable(),
  })
  .strict();
type Quote = z.infer<typeof quoteSchema>;
type Item = z.infer<typeof itemSchema>;
type ItemSnapshot = { rows: Item[]; count: number | null; complete: boolean };
type DbResult = { data: unknown; error: unknown; count?: unknown };
type NativeRead = PromiseLike<DbResult> & {
  select(projection: string, options?: { count: "exact" }): NativeRead;
  eq(column: "id" | "quote_id", value: string): NativeRead;
  order(
    column: "display_order" | "id",
    options: { ascending: true; nullsFirst: false },
  ): NativeRead;
  limit(count: number): NativeRead;
  abortSignal(signal: AbortSignal): NativeRead;
  retry(enabled: false): NativeRead;
  maybeSingle(): NativeRead;
};
const quoteDb = smSupabase as unknown as { from(table: "quotes" | "quote_items"): NativeRead };
const sameUuid = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();

function completeFields(value: unknown, projection: string): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    projection.split(",").every((key) => Object.hasOwn(value, key))
  );
}

async function fetchQuote(id: string, signal: AbortSignal): Promise<Quote | null> {
  if (!uuid.safeParse(id).success || signal.aborted) throw new Error(QUOTE_FAILURE);
  const result = await quoteDb
    .from("quotes")
    .select(QUOTE_PROJECTION)
    .eq("id", id)
    .abortSignal(signal)
    .retry(false)
    .maybeSingle();
  if (result.error || signal.aborted) throw new Error(QUOTE_FAILURE);
  if (result.data === null) return null;
  if (!completeFields(result.data, QUOTE_PROJECTION)) throw new Error(QUOTE_FAILURE);
  const parsed = quoteSchema.safeParse(result.data);
  if (!parsed.success || !sameUuid(parsed.data.id, id)) throw new Error(QUOTE_FAILURE);
  return parsed.data;
}

async function fetchItems(id: string, signal: AbortSignal): Promise<ItemSnapshot> {
  if (!uuid.safeParse(id).success || signal.aborted) throw new Error(ITEMS_FAILURE);
  const { data, error, count } = await quoteDb
    .from("quote_items")
    .select(ITEMS_PROJECTION, { count: "exact" })
    .eq("quote_id", id)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true, nullsFirst: false })
    .limit(FETCH_LIMIT)
    .abortSignal(signal)
    .retry(false);
  if (
    error ||
    signal.aborted ||
    !Array.isArray(data) ||
    data.length > FETCH_LIMIT ||
    (count !== null && (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0)) ||
    (typeof count === "number" && count < data.length)
  )
    throw new Error(ITEMS_FAILURE);
  const ids = new Set<string>();
  const rows: Item[] = [];
  // Validate all 101 complete rows, including quote binding and hidden sentinel.
  for (let index = 0; index < data.length; index++) {
    if (!Object.hasOwn(data, index) || !completeFields(data[index], ITEMS_PROJECTION))
      throw new Error(ITEMS_FAILURE);
    const parsed = itemSchema.safeParse(data[index]);
    if (
      !parsed.success ||
      !sameUuid(parsed.data.quote_id, id) ||
      ids.has(parsed.data.id.toLowerCase())
    )
      throw new Error(ITEMS_FAILURE);
    ids.add(parsed.data.id.toLowerCase());
    rows.push(parsed.data);
  }
  return {
    rows: rows.slice(0, DISPLAY_LIMIT),
    count: count as number | null,
    complete: typeof count === "number" && count === rows.length && count <= DISPLAY_LIMIT,
  };
}

// Received-value display only, never accounting arithmetic or a precision
// promise about a NUMERIC already decoded to a JavaScript number. Bounds limit
// rendering work rather than defining money, quantity or expiry policy.
function decimal(value: unknown): string | null {
  if (typeof value !== "string" && (typeof value !== "number" || !Number.isFinite(value)))
    return null;
  const raw = String(value);
  if (raw.length > 512) return null;
  const match = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d{1,4}))?$/.exec(raw);
  if (!match) return null;
  const integer = match[2] ?? "0";
  const fraction = match[3] ?? match[4] ?? "";
  const digits = integer + fraction;
  const point = integer.length + Number(match[5] ?? 0);
  if (Math.abs(point) > 1024 || digits.length + Math.abs(point) > 1536) return null;
  let whole: string;
  let tail: string;
  if (point <= 0) {
    whole = "0";
    tail = "0".repeat(-point) + digits;
  } else if (point >= digits.length) {
    whole = digits + "0".repeat(point - digits.length);
    tail = "";
  } else {
    whole = digits.slice(0, point);
    tail = digits.slice(point);
  }
  whole = whole.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${match[1] === "-" ? "-" : ""}${whole}${tail ? `.${tail}` : ""}`;
}
function money(value: unknown): string {
  const amount = decimal(value);
  return amount === null ? "Amount unavailable" : `₱${amount}`;
}

function QuoteError({ reset }: { reset: () => void }) {
  const { user, loading } = useAuth();
  if (!user || loading) return null;
  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Quote</h1>
        <p role="alert" className="mt-2 text-destructive">
          {QUOTE_FAILURE}
        </p>
        <Button className="mt-4" onClick={reset}>
          Retry quote
        </Button>
      </div>
    </SiteLayout>
  );
}
export const Route = createFileRoute("/_authenticated/workspace/quotes/$id")({
  head: () => ({
    meta: [{ title: "Quote — Shop Manager" }, { name: "robots", content: "noindex" }],
  }),
  component: QuoteDetail,
  errorComponent: QuoteError,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">Quote not found.</div>
    </SiteLayout>
  ),
});

function QuoteDetail() {
  const { user, loading } = useAuth();
  const { id } = Route.useParams();
  if (!user || loading) return null;
  return <AccountQuote key={`${user.id}:${id}`} userId={user.id} id={id} />;
}
function AccountQuote({ userId, id }: { userId: string; id: string }) {
  const readLifetime = useId();
  const successes = useRef(0);
  const primary = useQuery({
    queryKey: ["shop-manager", userId, "quotes", "detail", id, readLifetime],
    queryFn: async ({ signal }) => ({
      quote: await fetchQuote(id, signal),
      version: ++successes.current,
    }),
    enabled: uuid.safeParse(id).success,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    placeholderData: undefined,
    retry: false,
  });
  const fresh = primary.isSuccess && !primary.isFetching && primary.data;
  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-10">
        {!uuid.safeParse(id).success ||
        primary.isError ||
        (fresh && fresh.quote !== null && !sameUuid(fresh.quote.id, id)) ? (
          <>
            <h1 className="text-2xl font-bold">Quote</h1>
            <p role="alert" className="text-destructive">
              {QUOTE_FAILURE}
            </p>
            <Button className="mt-3" onClick={() => void primary.refetch()}>
              Retry quote
            </Button>
          </>
        ) : primary.isPending || primary.isFetching ? (
          <div role="status" className="flex items-center gap-2 text-muted-foreground">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Loading quote…
          </div>
        ) : !fresh || fresh.quote === null ? (
          <h1 className="text-2xl font-bold">Quote not found.</h1>
        ) : (
          // Each successful primary read supplies a new local witness. Even a
          // batched refresh with no fetching render cannot revive old item data.
          <FreshQuote
            key={`${readLifetime}:${fresh.version}`}
            quote={fresh.quote}
            userId={userId}
            id={id}
            readLifetime={readLifetime}
            refreshQuote={() => void primary.refetch()}
          />
        )}
        <div className="mt-6">
          <Button asChild variant="ghost">
            <Link to="/workspace/quotes">← Back to Quotes</Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}

function FreshQuote({
  quote,
  userId,
  id,
  readLifetime,
  refreshQuote,
}: {
  quote: Quote;
  userId: string;
  id: string;
  readLifetime: string;
  refreshQuote: () => void;
}) {
  const itemLifetime = useId();
  const itemsQuery = useQuery({
    queryKey: ["shop-manager", userId, "quotes", "items", id, readLifetime, itemLifetime],
    queryFn: ({ signal }) => fetchItems(id, signal),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    placeholderData: undefined,
    retry: false,
  });
  // UI witnesses/cancellation do not bind the browser JWT, establish RLS, or
  // prove immediate revocation. Every database request still requires RLS.
  const items = itemsQuery.isSuccess && !itemsQuery.isFetching ? itemsQuery.data : undefined;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileText aria-hidden="true" className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Quote {quote.quote_number || quote.id}</h1>
            <p className="text-muted-foreground">
              Created (stored timestamp): {quote.created_at || "Timestamp unavailable"}
            </p>
            <p className="text-muted-foreground">
              Expires (stored date):{" "}
              {quote.expiry_date === null
                ? "Date unavailable"
                : quote.expiry_date || "Date unavailable"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{quote.status || "Status unavailable"}</Badge>
          <Button variant="outline" onClick={refreshQuote}>
            Refresh quote
          </Button>
          {quote.converted_to_work_order_id ? (
            <Button asChild variant="outline">
              <Link
                to="/workspace/work-orders/$id"
                params={{ id: quote.converted_to_work_order_id }}
              >
                Open Work Order →
              </Link>
            </Button>
          ) : (
            <QuoteWorkflowControl accountId={userId} quoteId={id} onChanged={refreshQuote} />
          )}
        </div>
      </div>
      {!quote.converted_to_work_order_id && (
        <p className="mb-6 text-sm text-muted-foreground">
          Use the quote review to record customer approval and create a work order. Parts must be
          allocated separately; conversion does not deduct stock.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        {(
          [
            ["Recorded subtotal", quote.subtotal],
            ["Recorded tax", quote.tax_amount],
            ["Recorded total", quote.total_amount],
          ] as const
        ).map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold break-all">{money(value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Line items</CardTitle>
          <Button
            variant="outline"
            onClick={() => void itemsQuery.refetch()}
            disabled={itemsQuery.isFetching}
          >
            Refresh items
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {itemsQuery.isPending || itemsQuery.isFetching ? (
            <div role="status" className="px-4 py-8 flex items-center gap-2 text-muted-foreground">
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Loading quote items…
            </div>
          ) : itemsQuery.isError || !items ? (
            <div className="px-4 py-6">
              <p role="alert" className="text-destructive">
                {ITEMS_FAILURE}
              </p>
              <Button className="mt-3" onClick={() => void itemsQuery.refetch()}>
                Retry items
              </Button>
            </div>
          ) : (
            <>
              <div className="px-4 py-4 text-sm text-muted-foreground">
                <p>
                  {items.count === null
                    ? `Showing ${items.rows.length} returned items. Total visible count unavailable.`
                    : `Showing ${items.rows.length} of ${items.count} visible items in this snapshot.`}
                </p>
                <p>
                  {items.complete
                    ? "All counted visible items are shown for this snapshot."
                    : "This item snapshot is incomplete or its completeness is unverified. At most 100 items are displayed."}
                </p>
              </div>
              {items.rows.length === 0 ? (
                <div className="px-4 pb-8 text-sm text-muted-foreground">
                  {items.count === 0
                    ? "No visible items in this returned snapshot."
                    : items.count === null
                      ? "No item rows were returned. An empty item list is not confirmed because the visible count is unavailable."
                      : "No item rows were returned despite a positive visible count. This snapshot is incomplete."}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Recorded quantity</TableHead>
                      <TableHead className="text-right">Unit price</TableHead>
                      <TableHead className="text-right">Recorded total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.rows.map((item) => (
                      <TableRow key={item.id.toLowerCase()}>
                        <TableCell>
                          <div className="font-medium">{item.name || "Item name unavailable"}</div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground">{item.description}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.item_type || "Type unavailable"}</Badge>
                        </TableCell>
                        <TableCell className="text-right break-all">
                          {decimal(item.quantity) ?? "Quantity unavailable"}
                        </TableCell>
                        <TableCell className="text-right break-all">
                          {money(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right break-all">
                          {money(item.total_price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>
      {(quote.notes || quote.terms_conditions) && (
        <div className="grid gap-4 sm:grid-cols-2 mt-6">
          {quote.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{quote.notes}</CardContent>
            </Card>
          )}
          {quote.terms_conditions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Terms</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">
                {quote.terms_conditions}
              </CardContent>
            </Card>
          )}
        </div>
      )}
      <p className="mt-6 text-sm text-muted-foreground">
        Recorded estimates are not payments or a receivables balance. Refresh to load a new
        snapshot.
      </p>
    </>
  );
}
