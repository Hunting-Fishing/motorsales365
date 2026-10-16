import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowLeft, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { smSupabase } from "@/lib/shop-manager/db";

const CUSTOMER_FIELDS = "id,shop_id,first_name,last_name";
const VEHICLE_FIELDS = "id,customer_id,year,make,model";
const HEADER_FIELDS =
  "id,quote_number,customer_id,vehicle_id,status,subtotal,tax_rate,tax_amount,total_amount,expiry_date,notes,terms_conditions";
const ITEM_FIELDS =
  "id,quote_id,name,description,category,quantity,unit_price,total_price,item_type,display_order";
const OPTIONS_FAILURE = "Could not load quote options. Please try again.";
const VERIFY_FAILURE =
  "Could not verify this customer and vehicle. Refresh options before trying again.";
const UNKNOWN_FAILURE =
  "Save status unknown. Check quotes before trying again. This draft is locked to prevent duplicate saves.";
const INPUT_FAILURE =
  "Check every line, quantity, price, tax rate and date. Amounts must fit the supported range and resolve to whole cents; extra precision is not rounded.";
const TEXT_FAILURE =
  "Check the text fields. Names support up to 200 characters; descriptions, notes and terms support up to 4,000 each. Remove unsupported characters before saving.";
const LIMIT = 100;
// Interim browser/caller resource bounds (UTF-16 units, matching maxLength),
// not database-wide text/business policy. Never silently truncate a value.
const NAME_LIMIT = 200;
const TEXT_LIMIT = 4000;
function validText(value: string, limit: number): boolean {
  if (value.length > limit || value.includes("\0")) return false;
  // JSON/PostgreSQL UTF-8 text cannot encode unpaired UTF-16 surrogates.
  // Allow paired emoji/Unicode without requiring a newer browser API.
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++index);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
}
const MAX_CENTS = 9999999999n; // Retained native numeric(10,2), not an accounting policy.
const uuid = z.string().regex(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
const customerSchema = z
  .object({ id: uuid, shop_id: uuid, first_name: z.string(), last_name: z.string() })
  .strict();
const vehicleSchema = z
  .object({
    id: uuid,
    customer_id: uuid.nullable(),
    year: z.number().int().nullable(),
    make: z.string(),
    model: z.string(),
  })
  .strict();
type Customer = z.infer<typeof customerSchema>;
type Vehicle = z.infer<typeof vehicleSchema>;
type Result = { data: unknown; error: unknown; count?: unknown };
type Builder = PromiseLike<Result> & {
  select(fields: string, options?: { count: "exact" }): Builder;
  eq(column: string, value: string): Builder;
  order(column: string, options: { ascending: true; nullsFirst: false }): Builder;
  limit(count: number): Builder;
  abortSignal(signal: AbortSignal): Builder;
  retry(enabled: false): Builder;
  maybeSingle(): Builder;
  insert(value: Record<string, unknown> | Record<string, unknown>[]): Builder;
};
const db = smSupabase as unknown as {
  from(table: "customers" | "vehicles" | "quotes" | "quote_items"): Builder;
};
const sameId = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
function complete(value: unknown, fields: string): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === fields.split(",").length &&
    fields.split(",").every((key) => Object.hasOwn(value, key))
  );
}
type Options<T> = { rows: T[]; count: number | null; version: number };
function parseOptions<T extends { id: string }>(
  result: Result,
  fields: string,
  schema: z.ZodType<T>,
  version: number,
): Options<T> {
  if (
    result.error ||
    !Array.isArray(result.data) ||
    result.data.length > LIMIT + 1 ||
    (result.count !== null &&
      (typeof result.count !== "number" ||
        !Number.isSafeInteger(result.count) ||
        result.count < result.data.length))
  )
    throw new Error(OPTIONS_FAILURE);
  const seen = new Set<string>();
  const rows: T[] = [];
  for (let index = 0; index < result.data.length; index++) {
    const value: unknown = result.data[index];
    if (!Object.hasOwn(result.data, index) || !complete(value, fields))
      throw new Error(OPTIONS_FAILURE);
    const row = schema.parse(value);
    if (seen.has(row.id.toLowerCase())) throw new Error(OPTIONS_FAILURE);
    seen.add(row.id.toLowerCase());
    rows.push(row);
  }
  return { rows: rows.slice(0, LIMIT), count: result.count as number | null, version };
}
// Exact bounded decimal parsing; no null/empty coercion or hidden rounding.
function scaled(value: unknown, scale: number, max: bigint): bigint | null {
  const text = typeof value === "number" && Number.isFinite(value) ? String(value) : value;
  if (typeof text !== "string" || text.length > 40 || !/^\d+(?:\.\d+)?$/.test(text)) return null;
  const [whole, rawFraction = ""] = text.split(".");
  const fraction = rawFraction.replace(/0+$/, "");
  if (fraction.length > scale) return null;
  const amount = BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, "0") || "0");
  return amount <= max ? amount : null;
}
function decimal(value: bigint, scale = 2): string {
  const factor = 10n ** BigInt(scale);
  return `${value / factor}.${String(value % factor).padStart(scale, "0")}`;
}
function validDate(value: string): boolean {
  if (value === "") return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
type Line = {
  key: string;
  name: string;
  description: string;
  quantity: string;
  unit_price: string;
  item_type: "labor" | "part" | "service";
};
const newLine = (): Line => ({
  key: crypto.randomUUID(),
  name: "",
  description: "",
  quantity: "1",
  unit_price: "0",
  item_type: "part",
});
function draftAmounts(items: Line[], taxRate: string) {
  if (items.length < 1 || items.length > LIMIT) return null;
  const percent = scaled(taxRate, 2, 99999n); // Native numeric(5,4) fraction after % / 100.
  if (percent === null) return null;
  let subtotal = 0n;
  const lines = [];
  for (const item of items) {
    const quantity = scaled(item.quantity, 2, MAX_CENTS);
    const price = scaled(item.unit_price, 2, MAX_CENTS);
    if (
      !item.name.trim() ||
      quantity === null ||
      quantity === 0n ||
      price === null ||
      !["part", "service", "labor"].includes(item.item_type) ||
      (quantity * price) % 100n !== 0n
    )
      return null;
    const total = (quantity * price) / 100n;
    subtotal += total;
    if (total > MAX_CENTS || subtotal > MAX_CENTS) return null;
    lines.push({
      quantity: decimal(quantity),
      unit_price: decimal(price),
      total_price: decimal(total),
    });
  }
  if ((subtotal * percent) % 10000n !== 0n) return null;
  const tax = (subtotal * percent) / 10000n;
  if (tax > MAX_CENTS || subtotal + tax > MAX_CENTS) return null;
  return {
    lines,
    subtotal: decimal(subtotal),
    tax_rate: decimal(percent, 4),
    tax_amount: decimal(tax),
    total_amount: decimal(subtotal + tax),
  };
}
function confirmRow(raw: unknown, expected: Record<string, unknown>, fields: string): void {
  if (!complete(raw, fields)) throw new Error(UNKNOWN_FAILURE);
  for (const [key, value] of Object.entries(expected)) {
    const actual = raw[key];
    if (
      ["id", "quote_id", "customer_id", "vehicle_id"].includes(key) &&
      typeof value === "string"
    ) {
      if (!uuid.safeParse(actual).success || !sameId(String(actual), value))
        throw new Error(UNKNOWN_FAILURE);
    } else if (
      [
        "subtotal",
        "tax_amount",
        "total_amount",
        "quantity",
        "unit_price",
        "total_price",
        "tax_rate",
      ].includes(key)
    ) {
      const scale = key === "tax_rate" ? 4 : 2;
      const parsed = scaled(actual, scale, key === "tax_rate" ? 99999n : MAX_CENTS);
      if (
        parsed === null ||
        parsed !== scaled(value, scale, key === "tax_rate" ? 99999n : MAX_CENTS)
      )
        throw new Error(UNKNOWN_FAILURE);
    } else if (actual !== value) throw new Error(UNKNOWN_FAILURE);
  }
}
export const Route = createFileRoute("/_authenticated/workspace/quotes/new")({
  head: () => ({
    meta: [
      { title: "New Quote — Shop Manager" },
      { name: "description", content: "Create a new customer quote." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewQuotePage,
  errorComponent: ({ reset }) => (
    <SiteLayout>
      <p role="alert">Could not open quote creation.</p>
      <Button onClick={reset}>Retry</Button>
    </SiteLayout>
  ),
});
function NewQuotePage() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <SiteLayout>
        <p role="status">Checking account…</p>
      </SiteLayout>
    );
  if (!user)
    return (
      <SiteLayout>
        <p>Sign in to create a quote.</p>
      </SiteLayout>
    );
  return <QuoteDraft key={user.id} accountId={user.id} />;
}
type Flight = {
  controller: AbortController;
  revision: number;
  customerVersion: number;
  vehicleVersion: number;
  customerId: string;
  vehicleId: string;
  lost: boolean;
  dispatched: boolean;
};
function QuoteDraft({ accountId }: { accountId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lifetime = useId();
  const alive = useRef(true);
  const flight = useRef<Flight | null>(null);
  const revision = useRef(0);
  const customerVersion = useRef(0);
  const vehicleVersion = useRef(0);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmedId, setConfirmedId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [taxRate, setTaxRate] = useState("12");
  const [expiry, setExpiry] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [items, setItems] = useState<Line[]>(() => [newLine()]);
  const customers = useQuery({
    queryKey: ["shop-manager", accountId, "quotes", "new", "customers", lifetime],
    queryFn: async ({ signal }) => {
      if (signal.aborted) throw new Error(OPTIONS_FAILURE);
      const result = await db
        .from("customers")
        .select(CUSTOMER_FIELDS, { count: "exact" })
        .order("last_name", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true, nullsFirst: false })
        .limit(LIMIT + 1)
        .abortSignal(signal)
        .retry(false);
      if (signal.aborted) throw new Error(OPTIONS_FAILURE);
      return parseOptions(result, CUSTOMER_FIELDS, customerSchema, ++customerVersion.current);
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnMount: "always",
    placeholderData: undefined,
  });
  const customerOptions = !customers.isFetching && !customers.isError ? customers.data : undefined;
  const customer = customerOptions?.rows.find((row) => sameId(row.id, customerId));
  const vehicles = useQuery({
    queryKey: [
      "shop-manager",
      accountId,
      "quotes",
      "new",
      "vehicles",
      lifetime,
      customer?.id ?? "",
      customerOptions?.version ?? 0,
    ],
    enabled: !!customer,
    queryFn: async ({ signal }) => {
      if (!customer || signal.aborted) throw new Error(OPTIONS_FAILURE);
      const result = await db
        .from("vehicles")
        .select(VEHICLE_FIELDS, { count: "exact" })
        .eq("customer_id", customer.id)
        .order("id", { ascending: true, nullsFirst: false })
        .limit(LIMIT + 1)
        .abortSignal(signal)
        .retry(false);
      if (signal.aborted) throw new Error(OPTIONS_FAILURE);
      const parsed = parseOptions(result, VEHICLE_FIELDS, vehicleSchema, ++vehicleVersion.current);
      // Check customer binding for all rows, including the undisplayed sentinel.
      for (const row of result.data as unknown[]) {
        const value = vehicleSchema.parse(row);
        if (!value.customer_id || !sameId(value.customer_id, customer.id))
          throw new Error(OPTIONS_FAILURE);
      }
      return parsed;
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnMount: "always",
    placeholderData: undefined,
  });
  const vehicleOptions = !vehicles.isFetching && !vehicles.isError ? vehicles.data : undefined;
  const vehicle = vehicleOptions?.rows.find((row) => sameId(row.id, vehicleId));
  const ready = !!customer && !!vehicleOptions && (!vehicleId || !!vehicle);
  const context = useRef({
    ready,
    customerId,
    vehicleId,
    customerVersion: customerOptions?.version,
    vehicleVersion: vehicleOptions?.version,
  });
  const current = useCallback((attempt: Flight): boolean => {
    const c = context.current;
    if (
      !alive.current ||
      flight.current !== attempt ||
      attempt.lost ||
      attempt.controller.signal.aborted
    )
      return false;
    if (
      !c.ready ||
      revision.current !== attempt.revision ||
      c.customerId !== attempt.customerId ||
      c.vehicleId !== attempt.vehicleId ||
      c.customerVersion !== attempt.customerVersion ||
      c.vehicleVersion !== attempt.vehicleVersion
    ) {
      attempt.lost = true;
      attempt.controller.abort();
      return false;
    }
    return true;
  }, []);
  // Publish only committed context. An abandoned/suspended render must not
  // abort a valid attempt or strand a confirmed header before its items.
  useLayoutEffect(() => {
    context.current = {
      ready,
      customerId,
      vehicleId,
      customerVersion: customerOptions?.version,
      vehicleVersion: vehicleOptions?.version,
    };
    const attempt = flight.current;
    // A committed loss is monotonic: matching values after A→B→A cannot revive it.
    if (attempt && !current(attempt) && attempt.dispatched) {
      setLocked(true);
      setMessage(UNKNOWN_FAILURE);
    }
  }, [ready, customerId, vehicleId, customerOptions?.version, vehicleOptions?.version, current]);
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (flight.current) {
        flight.current.lost = true;
        flight.current.controller.abort();
      }
    };
  }, []);
  function change(action: () => void) {
    if (saving || locked || flight.current) return;
    revision.current++;
    setMessage("");
    action();
  }
  const amounts = draftAmounts(items, taxRate);
  const frozen = saving || locked;
  async function submit() {
    if (flight.current || locked || !ready || !customer || !customerOptions || !vehicleOptions)
      return;
    // Validate every supplied text field before even the fresh-by-ID reads.
    // A known-invalid line must not allow a valid header to save first.
    if (
      !validText(notes, TEXT_LIMIT) ||
      !validText(terms, TEXT_LIMIT) ||
      items.some(
        (line) => !validText(line.name, NAME_LIMIT) || !validText(line.description, TEXT_LIMIT),
      )
    ) {
      setMessage(TEXT_FAILURE);
      return;
    }
    if (!amounts || !validDate(expiry)) {
      setMessage(INPUT_FAILURE);
      return;
    }
    const attempt: Flight = {
      controller: new AbortController(),
      revision: revision.current,
      customerVersion: customerOptions.version,
      vehicleVersion: vehicleOptions.version,
      customerId,
      vehicleId,
      lost: false,
      dispatched: false,
    };
    flight.current = attempt;
    setSaving(true);
    setMessage("");
    const signal = attempt.controller.signal;
    const guard = () => {
      if (!current(attempt)) throw new Error(VERIFY_FAILURE);
    };
    try {
      guard();
      const customerResult = await db
        .from("customers")
        .select(CUSTOMER_FIELDS)
        .eq("id", customer.id)
        .abortSignal(signal)
        .retry(false)
        .maybeSingle();
      guard();
      if (customerResult.error || !complete(customerResult.data, CUSTOMER_FIELDS))
        throw new Error(VERIFY_FAILURE);
      const freshCustomer = customerSchema.parse(customerResult.data);
      if (
        !sameId(freshCustomer.id, customer.id) ||
        !sameId(freshCustomer.shop_id, customer.shop_id)
      )
        throw new Error(VERIFY_FAILURE);
      if (vehicleId) {
        guard();
        const vehicleResult = await db
          .from("vehicles")
          .select(VEHICLE_FIELDS)
          .eq("id", vehicleId)
          .eq("customer_id", freshCustomer.id)
          .abortSignal(signal)
          .retry(false)
          .maybeSingle();
        guard();
        if (vehicleResult.error || !complete(vehicleResult.data, VEHICLE_FIELDS))
          throw new Error(VERIFY_FAILURE);
        const freshVehicle = vehicleSchema.parse(vehicleResult.data);
        if (
          !sameId(freshVehicle.id, vehicleId) ||
          !freshVehicle.customer_id ||
          !sameId(freshVehicle.customer_id, freshCustomer.id)
        )
          throw new Error(VERIFY_FAILURE);
      }
      const quoteId = crypto.randomUUID();
      // Existing native INSERT trigger supplies the number. It is not a
      // transaction/retry identity, and no client timestamp numbering is used.
      const header = {
        id: quoteId,
        customer_id: freshCustomer.id,
        vehicle_id: vehicleId || null,
        status: "draft",
        subtotal: amounts.subtotal,
        tax_rate: amounts.tax_rate,
        tax_amount: amounts.tax_amount,
        total_amount: amounts.total_amount,
        expiry_date: expiry || null,
        notes: notes.trim() || null,
        terms_conditions: terms.trim() || null,
      };
      guard();
      attempt.dispatched = true;
      const result = await db
        .from("quotes")
        .insert(header)
        .select(HEADER_FIELDS)
        .abortSignal(signal)
        .retry(false)
        .maybeSingle();
      guard();
      if (result.error) throw new Error(UNKNOWN_FAILURE);
      confirmRow(result.data, header, HEADER_FIELDS);
      if (
        !complete(result.data, HEADER_FIELDS) ||
        typeof result.data.quote_number !== "string" ||
        !result.data.quote_number.trim()
      )
        throw new Error(UNKNOWN_FAILURE);
      const rows = items.map((line, index) => ({
        id: crypto.randomUUID(),
        quote_id: quoteId,
        name: line.name.trim(),
        description: line.description.trim() || null,
        category: line.item_type,
        ...amounts.lines[index],
        item_type: line.item_type,
        display_order: index,
      }));
      guard();
      const resultItems = await db
        .from("quote_items")
        .insert(rows)
        .select(ITEM_FIELDS)
        .abortSignal(signal)
        .retry(false);
      guard();
      if (
        resultItems.error ||
        !Array.isArray(resultItems.data) ||
        resultItems.data.length !== rows.length
      )
        throw new Error(UNKNOWN_FAILURE);
      const expected = new Map(rows.map((row) => [row.id.toLowerCase(), row]));
      for (let index = 0; index < resultItems.data.length; index++) {
        const row: unknown = resultItems.data[index];
        if (
          !Object.hasOwn(resultItems.data, index) ||
          !complete(row, ITEM_FIELDS) ||
          typeof row.id !== "string"
        )
          throw new Error(UNKNOWN_FAILURE);
        const match = expected.get(row.id.toLowerCase());
        if (!match) throw new Error(UNKNOWN_FAILURE);
        confirmRow(row, match, ITEM_FIELDS);
        expected.delete(row.id.toLowerCase());
      }
      guard();
      setLocked(true);
      setConfirmedId(quoteId);
      setMessage("Quote and line items confirmed.");
      toast.success("Quote and line items confirmed");
      void queryClient
        .invalidateQueries({
          queryKey: ["shop-manager", accountId, "quotes", "list"],
          exact: false,
        })
        .catch(() => {});
      void Promise.resolve(
        navigate({ to: "/workspace/quotes/$id", params: { id: quoteId } }),
      ).catch(() => {});
    } catch {
      if (alive.current && flight.current === attempt) {
        if (attempt.dispatched) {
          setLocked(true);
          setMessage(UNKNOWN_FAILURE);
        } else setMessage(VERIFY_FAILURE);
      }
    } finally {
      if (alive.current && flight.current === attempt) {
        flight.current = null;
        setSaving(false);
      }
    }
  }
  const optionSummary = <T,>(name: string, value: Options<T> | undefined) =>
    value ? (
      <p className="text-xs text-muted-foreground">
        Showing {value.rows.length} {name} options
        {value.count === null ? "; total unknown" : ` of ${value.count} visible`}.
        {value.count === null || value.count > value.rows.length
          ? " Only the first 100 are shown."
          : ""}
      </p>
    ) : null;
  const editLine = (index: number, value: Partial<Line>) =>
    change(() =>
      setItems((rows) => rows.map((row, at) => (at === index ? { ...row, ...value } : row))),
    );
  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <FileText aria-hidden="true" className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">New Quote</h1>
            <p className="text-muted-foreground">Draft an estimate for a customer.</p>
          </div>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Review the customer, vehicle and estimate before saving. If a save cannot be confirmed,
          check quotes before trying again.
        </p>
        {message ? (
          <p role={confirmedId ? "status" : "alert"} className="mb-4">
            {message}
          </p>
        ) : null}
        {confirmedId ? (
          <Link to="/workspace/quotes/$id" params={{ id: confirmedId }}>
            Open confirmed quote
          </Link>
        ) : null}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Customer & vehicle</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={`${lifetime}-customer`}>Customer *</Label>
              <select
                id={`${lifetime}-customer`}
                className="h-9 w-full rounded-md border bg-background px-3"
                value={customerId}
                disabled={frozen || !customerOptions}
                onChange={(e) =>
                  change(() => {
                    setCustomerId(e.target.value);
                    setVehicleId("");
                  })
                }
              >
                <option value="">Pick a customer…</option>
                {customerOptions?.rows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {`${row.first_name} ${row.last_name}`.trim() || row.id}
                  </option>
                ))}
              </select>
              {customers.isFetching ? (
                <p role="status">Loading customers…</p>
              ) : customers.isError ? (
                <>
                  <p role="alert">{OPTIONS_FAILURE}</p>
                  <Button disabled={frozen} onClick={() => void customers.refetch()}>
                    Retry customers
                  </Button>
                </>
              ) : (
                optionSummary("customer", customerOptions)
              )}
              <Button
                variant="ghost"
                disabled={frozen || customers.isFetching}
                onClick={() => void customers.refetch()}
              >
                Refresh customers
              </Button>
            </div>
            <div>
              <Label htmlFor={`${lifetime}-vehicle`}>Vehicle (optional)</Label>
              <select
                id={`${lifetime}-vehicle`}
                className="h-9 w-full rounded-md border bg-background px-3"
                value={vehicleId}
                disabled={frozen || !customer || !vehicleOptions}
                onChange={(e) => change(() => setVehicleId(e.target.value))}
              >
                <option value="">No vehicle</option>
                {customer &&
                  vehicleOptions?.rows.map((row) => (
                    <option key={row.id} value={row.id}>
                      {[row.year, row.make, row.model]
                        .filter((part) => part !== null && part !== "")
                        .join(" ") || row.id}
                    </option>
                  ))}
              </select>
              {customer ? (
                vehicles.isFetching ? (
                  <p role="status">Loading vehicles…</p>
                ) : vehicles.isError ? (
                  <>
                    <p role="alert">{OPTIONS_FAILURE}</p>
                    <Button disabled={frozen} onClick={() => void vehicles.refetch()}>
                      Retry vehicles
                    </Button>
                  </>
                ) : (
                  optionSummary("vehicle", vehicleOptions)
                )
              ) : (
                <p>Select a current customer first.</p>
              )}
            </div>
            <div>
              <Label htmlFor={`${lifetime}-expiry`}>Expiry date</Label>
              <Input
                id={`${lifetime}-expiry`}
                type="date"
                value={expiry}
                disabled={frozen}
                onChange={(e) => change(() => setExpiry(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor={`${lifetime}-tax`}>Tax rate (%)</Label>
              <Input
                id={`${lifetime}-tax`}
                type="number"
                step="0.01"
                value={taxRate}
                disabled={frozen}
                onChange={(e) => change(() => setTaxRate(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Review the applicable tax percentage before saving.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line items</CardTitle>
            <Button
              size="sm"
              variant="outline"
              disabled={frozen || items.length >= LIMIT}
              onClick={() => change(() => setItems((rows) => [...rows, newLine()]))}
            >
              <Plus aria-hidden="true" className="mr-1 h-4 w-4" />
              Add line
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((line, index) => (
              <div key={line.key} className="grid gap-2 rounded border p-3 sm:grid-cols-12">
                <div className="sm:col-span-4">
                  <Label htmlFor={`${line.key}-name`}>Name {index + 1}</Label>
                  <Input
                    id={`${line.key}-name`}
                    value={line.name}
                    maxLength={NAME_LIMIT}
                    aria-describedby={`${lifetime}-line-help`}
                    disabled={frozen}
                    onChange={(e) => editLine(index, { name: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label htmlFor={`${line.key}-type`}>Type {index + 1}</Label>
                  <select
                    id={`${line.key}-type`}
                    className="h-9 w-full rounded-md border bg-background px-3"
                    value={line.item_type}
                    disabled={frozen}
                    onChange={(e) => {
                      if (
                        e.target.value === "part" ||
                        e.target.value === "service" ||
                        e.target.value === "labor"
                      )
                        editLine(index, { item_type: e.target.value });
                    }}
                  >
                    <option value="labor">Labor</option>
                    <option value="part">Part</option>
                    <option value="service">Service</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`${line.key}-quantity`}>Quantity {index + 1}</Label>
                  <Input
                    id={`${line.key}-quantity`}
                    type="number"
                    step="0.01"
                    value={line.quantity}
                    disabled={frozen}
                    onChange={(e) => editLine(index, { quantity: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`${line.key}-price`}>Unit price {index + 1} (₱)</Label>
                  <Input
                    id={`${line.key}-price`}
                    type="number"
                    step="0.01"
                    value={line.unit_price}
                    disabled={frozen}
                    onChange={(e) => editLine(index, { unit_price: e.target.value })}
                  />
                </div>
                <div className="flex items-end sm:col-span-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove line ${index + 1}`}
                    disabled={frozen || items.length === 1}
                    onClick={() =>
                      change(() => setItems((rows) => rows.filter((_, at) => at !== index)))
                    }
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </div>
                <div className="sm:col-span-12">
                  <Label htmlFor={`${line.key}-description`}>Description {index + 1}</Label>
                  <Input
                    id={`${line.key}-description`}
                    value={line.description}
                    maxLength={TEXT_LIMIT}
                    aria-describedby={`${lifetime}-line-help`}
                    disabled={frozen}
                    onChange={(e) => editLine(index, { description: e.target.value })}
                  />
                </div>
              </div>
            ))}
            <p id={`${lifetime}-line-help`} className="text-xs text-muted-foreground">
              Up to 100 lines. Quantity and unit price support two decimal places; calculated
              amounts must resolve to whole cents without rounding. Names: up to 200 characters;
              descriptions: up to 4,000 each.
            </p>
          </CardContent>
        </Card>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Notes & terms</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={`${lifetime}-notes`}>Notes</Label>
              <Textarea
                id={`${lifetime}-notes`}
                value={notes}
                maxLength={TEXT_LIMIT}
                aria-describedby={`${lifetime}-text-help`}
                disabled={frozen}
                onChange={(e) => change(() => setNotes(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor={`${lifetime}-terms`}>Terms & conditions</Label>
              <Textarea
                id={`${lifetime}-terms`}
                value={terms}
                maxLength={TEXT_LIMIT}
                aria-describedby={`${lifetime}-text-help`}
                disabled={frozen}
                onChange={(e) => change(() => setTerms(e.target.value))}
              />
            </div>
            <p id={`${lifetime}-text-help`} className="text-xs text-muted-foreground sm:col-span-2">
              Notes and terms: up to 4,000 characters each.
            </p>
          </CardContent>
        </Card>
        <Card className="mb-6">
          <CardContent className="grid grid-cols-3 gap-4 pt-6 text-sm">
            <div>
              Subtotal<div>{amounts ? `₱${amounts.subtotal}` : "Amount unavailable"}</div>
            </div>
            <div>
              Tax<div>{amounts ? `₱${amounts.tax_amount}` : "Amount unavailable"}</div>
            </div>
            <div>
              Total<div>{amounts ? `₱${amounts.total_amount}` : "Amount unavailable"}</div>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link to="/workspace/quotes">
              <ArrowLeft aria-hidden="true" className="mr-1 h-4 w-4" />
              Cancel
            </Link>
          </Button>
          <Button onClick={() => void submit()} disabled={frozen || !ready}>
            {saving ? <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create quote
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
