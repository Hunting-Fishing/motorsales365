// Actual route + real QueryClient; native-select bridge and fluent SDK doubles.
// No browser widget, JWT/RLS, native authority, transaction/retry or live SQL proof.
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route } from "@/routes/_authenticated/workspace.work-orders.new";

type Result = { data: unknown; error: unknown; count?: unknown };
type Response = Result | Promise<Result> | (() => Result | Promise<Result>);
type Request = {
  userId: string | null;
  table: string;
  projection: string;
  options?: unknown;
  filters: Record<string, string>;
  orders: { column: string; options: unknown }[];
  limit?: number;
  signal?: AbortSignal;
  retry?: boolean;
  mode: "options" | "single" | "write";
  payload?: Record<string, unknown>;
};
const state = vi.hoisted(() => ({
  userId: "account-a" as string | null,
  loading: false,
  responses: {} as Record<string, Response>,
  read: vi.fn(),
  write: vi.fn(),
  rpc: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: state.userId
      ? { id: state.userId, shop_id: "DO-NOT-USE-AUTH-SHOP", user_metadata: { shop_id: "SPOOFED" } }
      : null,
    loading: state.loading,
  }),
}));
vi.mock("@/components/site-layout", () => ({
  SiteLayout: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
}));
vi.mock("sonner", () => ({
  toast: { success: state.success, warning: state.warning, error: state.error },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({ options }),
  useRouter: () => ({ navigate: state.navigate }),
  Link: ({
    to,
    params,
    children,
    ...props
  }: React.PropsWithChildren<{ to: string; params?: { id: string }; className?: string }>) => (
    <a {...props} href={to.replace("$id", params?.id ?? "")}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/ui/select", () => {
  const SelectTrigger = (_props: React.PropsWithChildren<{ id?: string }>) => null;
  const SelectContent = ({ children }: React.PropsWithChildren) => <>{children}</>;
  return {
    SelectTrigger,
    SelectContent,
    SelectValue: () => null,
    SelectItem: ({ value, children }: React.PropsWithChildren<{ value: string }>) => (
      <option value={value}>{children}</option>
    ),
    Select: ({
      value,
      onValueChange,
      disabled,
      children,
    }: React.PropsWithChildren<{
      value: string;
      onValueChange: (value: string) => void;
      disabled?: boolean;
    }>) => {
      const entries = React.Children.toArray(children).filter(
        React.isValidElement,
      ) as React.ReactElement<React.PropsWithChildren<{ id?: string }>>[];
      const trigger = entries.find((entry) => entry.type === SelectTrigger);
      const content = entries.find((entry) => entry.type === SelectContent);
      return (
        <select
          id={trigger?.props.id}
          value={value}
          disabled={disabled}
          onChange={(event) => onValueChange(event.target.value)}
        >
          <option value="">Select…</option>
          {content?.props.children}
        </select>
      );
    },
  };
});
vi.mock("@/lib/shop-manager/db", () => ({
  smSupabase: {
    rpc: (...args: unknown[]) => state.rpc(...args),
    from: (table: string) => {
      const request: Request = {
        userId: state.userId,
        table,
        projection: "",
        filters: {},
        orders: [],
        mode: "options",
      };
      const execute = () => {
        const captured = {
          ...request,
          filters: { ...request.filters },
          orders: [...request.orders],
        };
        if (request.mode === "write") return Promise.resolve(state.write(captured));
        state.read(captured);
        const target =
          request.mode === "single" ? request.filters.id : (request.filters.customer_id ?? "all");
        const response = state.responses[
          `${request.userId}:${table}:${request.mode}:${target}`
        ] ?? { data: request.mode === "single" ? null : [], error: null };
        // Deliberately ignore cancellation to exercise late-result UI fences.
        return Promise.resolve()
          .then(() => (typeof response === "function" ? response() : response))
          .then((result) => ({
            ...result,
            ...(Array.isArray(result.data) && !Object.hasOwn(result, "count")
              ? { count: result.data.length }
              : {}),
          }));
      };
      const builder = {
        select: (projection: string, options?: unknown) => {
          request.projection = projection;
          request.options = options;
          return builder;
        },
        eq: (column: string, value: string) => {
          request.filters[column] = value;
          return builder;
        },
        order: (column: string, options: unknown) => {
          request.orders.push({ column, options });
          return builder;
        },
        limit: (limit: number) => {
          request.limit = limit;
          return builder;
        },
        abortSignal: (signal: AbortSignal) => {
          request.signal = signal;
          return builder;
        },
        retry: (retry: boolean) => {
          request.retry = retry;
          return builder;
        },
        insert: (payload: Record<string, unknown>) => {
          request.mode = "write";
          request.payload = payload;
          return builder;
        },
        maybeSingle: () => {
          request.mode = "single";
          return execute();
        },
        single: () => execute(),
        then: (resolve: (result: Result) => unknown, reject: (reason: unknown) => unknown) =>
          execute().then(resolve, reject),
      };
      return builder;
    },
  },
}));

const Page = Route.options.component as React.ComponentType;
const CUSTOMER_FIELDS = "id,shop_id,first_name,last_name";
const VEHICLE_FIELDS = "id,customer_id,year,make,model,license_plate";
const RECEIPT_FIELDS =
  "id,shop_id,customer_id,vehicle_id,status,priority,service_type,customer_complaint,description,estimated_hours,initial_mileage";
const UNKNOWN =
  "A work-order write may have completed. Review existing work orders before attempting another creation.";
const PREFLIGHT_FAILURE =
  "Could not confirm the selected customer and vehicle. Refresh and review your selections.";
const clients: QueryClient[] = [];
const ids = new Map<string, string>();
function idFor(label: string) {
  let id = ids.get(label);
  if (!id) {
    id = `aaaaaaaa-aaaa-4aaa-8aaa-${String(ids.size + 1).padStart(12, "0")}`;
    ids.set(label, id);
  }
  return id;
}
function customer(label = "CUSTOMER-A", overrides: Record<string, unknown> = {}) {
  return {
    id: idFor(label),
    shop_id: idFor(`${label}-shop`),
    first_name: label,
    last_name: "Visible customer",
    ...overrides,
  };
}
function vehicle(
  label = "VEHICLE-A",
  customerId = idFor("CUSTOMER-A"),
  overrides: Record<string, unknown> = {},
) {
  return {
    id: idFor(label),
    customer_id: customerId,
    year: 2026,
    make: label,
    model: "Visible vehicle",
    license_plate: "SYNTHETIC",
    ...overrides,
  };
}
function result(data: unknown, count?: unknown): Result {
  return { data, error: null, ...(arguments.length > 1 ? { count } : {}) };
}
function key(
  table: string,
  mode: "options" | "single" = "options",
  target = "all",
  userId = "account-a",
) {
  return `${userId}:${table}:${mode}:${target}`;
}
function populate(userId = "account-a", suffix = "A") {
  const c = customer(`CUSTOMER-${suffix}`);
  const v = vehicle(`VEHICLE-${suffix}`, c.id);
  state.responses[key("customers", "options", "all", userId)] = result([c]);
  state.responses[key("customers", "single", c.id, userId)] = result(c);
  state.responses[key("vehicles", "options", c.id, userId)] = result([v]);
  state.responses[key("vehicles", "single", v.id, userId)] = result(v);
}
function receipt(request: Request): Result {
  return result({ ...request.payload });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function show(
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } }),
) {
  clients.push(client);
  const view = () => (
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>
  );
  return { ...render(view()), view, client };
}
function reads(table: string, mode?: "options" | "single"): Request[] {
  return state.read.mock.calls
    .map(([request]) => request as Request)
    .filter((request) => request.table === table && (!mode || request.mode === mode));
}
function select(label: string, value: string) {
  fireEvent.change(screen.getByRole("combobox", { name: label }), { target: { value } });
}
function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
async function optionsReady() {
  await screen.findByText("Showing 1 of 1 visible customers in this snapshot.");
}
async function chooseCustomer(suffix = "A") {
  select("Customer", idFor(`CUSTOMER-${suffix}`));
  await screen.findByText("Showing 1 of 1 visible vehicles in this snapshot.");
}
async function prepare(withVehicle = true) {
  await optionsReady();
  await chooseCustomer();
  if (withVehicle) select("Vehicle (optional)", idFor("VEHICLE-A"));
  fill("Customer complaint", "  Synthetic brake noise  ");
}
function submit() {
  fireEvent.submit(screen.getByRole("button", { name: "Create work order" }).closest("form")!);
}
async function recorded() {
  expect(await screen.findByText("Work order entry recorded.")).toBeInTheDocument();
}

beforeEach(() => {
  vi.clearAllMocks();
  state.userId = "account-a";
  state.loading = false;
  state.responses = {};
  populate();
  populate("account-b", "B");
  state.write.mockImplementation(receipt);
  state.navigate.mockResolvedValue(undefined);
  vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
    idFor("NEW-WORK-ORDER") as `${string}-${string}-${string}-${string}-${string}`,
  );
});
afterEach(() => {
  expect(state.rpc).not.toHaveBeenCalled();
  expect(state.error).not.toHaveBeenCalled();
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  vi.restoreAllMocks();
});

describe("New work-order caller receipt and current-draft boundaries", () => {
  it.each(["signed-out", "auth-loading"])(
    "does not read or render private caches while %s",
    (mode) => {
      if (mode === "signed-out") state.userId = null;
      else state.loading = true;
      const client = new QueryClient();
      client.setQueryData(["shop-manager", "customers", "options"], [customer("CACHED-SECRET")]);
      client.setQueryData(
        ["shop-manager", "account-a", "work-orders", "create", "customers", "old-lifetime"],
        { rows: [customer("OTHER-SECRET")], count: 1, version: 1 },
      );
      show(client);
      expect(screen.getByRole("status")).toHaveTextContent(
        mode === "signed-out" ? "Sign in to create a work order." : "Checking account…",
      );
      expect(screen.queryByRole("heading", { name: "New Work Order" })).not.toBeInTheDocument();
      expect(screen.queryByText(/SECRET/)).not.toBeInTheDocument();
      expect(state.read).not.toHaveBeenCalled();
      expect(state.write).not.toHaveBeenCalled();
    },
  );

  it("pins fresh account/lifetime options, full projections, count/sentinel, signals and SDK retry(false)", async () => {
    const { client } = show();
    await optionsReady();
    expect(reads("vehicles")).toHaveLength(0);
    expect(reads("customers")[0]).toMatchObject({
      userId: "account-a",
      projection: CUSTOMER_FIELDS,
      options: { count: "exact" },
      limit: 101,
      retry: false,
      orders: [
        { column: "last_name", options: { ascending: true, nullsFirst: false } },
        { column: "first_name", options: { ascending: true, nullsFirst: false } },
        { column: "id", options: { ascending: true, nullsFirst: false } },
      ],
    });
    await chooseCustomer();
    expect(reads("vehicles")[0]).toMatchObject({
      projection: VEHICLE_FIELDS,
      filters: { customer_id: idFor("CUSTOMER-A") },
      options: { count: "exact" },
      limit: 101,
      retry: false,
      orders: [{ column: "id", options: { ascending: true, nullsFirst: false } }],
    });
    for (const read of state.read.mock.calls.map(([request]) => request as Request))
      expect(read.signal).toBeInstanceOf(AbortSignal);
    const queries = client.getQueryCache().getAll();
    expect(queries).toHaveLength(2);
    for (const query of queries) {
      expect(query.queryKey.slice(0, 4)).toEqual([
        "shop-manager",
        "account-a",
        "work-orders",
        "create",
      ]);
      expect(query.options).toMatchObject({
        staleTime: 0,
        gcTime: 0,
        retry: false,
        placeholderData: undefined,
        refetchOnMount: "always",
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      });
    }
    expect(queries.find((query) => query.queryKey[4] === "customers")?.queryKey).toHaveLength(6);
    expect(queries.find((query) => query.queryKey[4] === "vehicles")?.queryKey).toHaveLength(8);
  });

  it("does not revive earlier-mount or legacy options before the fresh read settles", async () => {
    const pending = deferred<Result>();
    state.responses[key("customers")] = pending.promise;
    const client = new QueryClient();
    client.setQueryData(["shop-manager", "customers", "options"], [customer("LEGACY-SECRET")]);
    client.setQueryData(
      ["shop-manager", "account-a", "work-orders", "create", "customers", "old"],
      { rows: [customer("OLD-SECRET")], count: 1, version: 1 },
    );
    show(client);
    await waitFor(() => expect(reads("customers")).toHaveLength(1));
    expect(screen.getByText("Loading customer options…")).toBeInTheDocument();
    expect(screen.queryByText(/SECRET/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create work order" })).toBeDisabled();
    expect(reads("vehicles")).toHaveLength(0);
    await act(async () => pending.resolve(result([customer()])));
    await optionsReady();
    expect(screen.queryByText(/SECRET/)).not.toBeInTheDocument();
  });

  it("requires a customer and fresh vehicle options rather than invoking the legacy shop resolver", async () => {
    show();
    await optionsReady();
    fill("Customer complaint", "Synthetic complaint");
    submit();
    expect(screen.getByRole("button", { name: "Create work order" })).toBeDisabled();
    expect(state.write).not.toHaveBeenCalled();
    expect(reads("customers", "single")).toHaveLength(0);
    const pending = deferred<Result>();
    state.responses[key("vehicles", "options", idFor("CUSTOMER-A"))] = pending.promise;
    select("Customer", idFor("CUSTOMER-A"));
    await screen.findByText("Loading vehicle options…");
    submit();
    expect(state.write).not.toHaveBeenCalled();
    expect(reads("customers", "single")).toHaveLength(0);
    await act(async () => pending.resolve(result([], 0)));
    expect(
      await screen.findByText("No visible vehicles in this returned snapshot."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create work order" })).toBeEnabled();
  });

  it("preflights exact relationships and acknowledges all submitted fields before scoped effects", async () => {
    const { client } = show();
    const invalidation = vi.spyOn(client, "invalidateQueries");
    await prepare();
    fill("Service type", "  Brake inspection  ");
    fill("Description / scope", "  Synthetic scope  ");
    fill("Estimated hours", "9007199254740993.0001");
    fill("Mileage in", "123,456");
    submit();
    await recorded();
    expect(reads("customers", "single")[0]).toMatchObject({
      projection: CUSTOMER_FIELDS,
      filters: { id: idFor("CUSTOMER-A") },
      retry: false,
    });
    expect(reads("vehicles", "single")[0]).toMatchObject({
      projection: VEHICLE_FIELDS,
      filters: { id: idFor("VEHICLE-A"), customer_id: idFor("CUSTOMER-A") },
      retry: false,
    });
    expect(state.write).toHaveBeenCalledTimes(1);
    expect(state.write.mock.calls[0][0]).toMatchObject({
      table: "work_orders",
      projection: RECEIPT_FIELDS,
      retry: false,
      payload: {
        shop_id: idFor("CUSTOMER-A-shop"),
        customer_id: idFor("CUSTOMER-A"),
        vehicle_id: idFor("VEHICLE-A"),
        status: "pending",
        priority: "normal",
        service_type: "Brake inspection",
        customer_complaint: "Synthetic brake noise",
        description: "Synthetic scope",
        estimated_hours: "9007199254740993.0001",
        initial_mileage: 123456,
      },
    });
    const payload = state.write.mock.calls[0][0].payload;
    expect(Object.keys(payload).sort()).toEqual(RECEIPT_FIELDS.split(",").sort());
    expect(payload.id).toBe(idFor("NEW-WORK-ORDER"));
    expect(payload.shop_id).not.toBe(state.userId);
    expect(state.success).toHaveBeenCalledWith("Work order entry recorded.");
    expect(state.navigate).toHaveBeenCalledWith({
      to: "/workspace/work-orders/$id",
      params: { id: idFor("NEW-WORK-ORDER") },
    });
    expect(invalidation).toHaveBeenCalledWith({
      queryKey: ["shop-manager", "account-a", "work-orders", "list"],
      exact: false,
    });
    expect(invalidation).toHaveBeenCalledWith({
      queryKey: ["shop-manager", "account-a", "customer", idFor("CUSTOMER-A"), "work-orders"],
      exact: false,
    });
    expect(invalidation).toHaveBeenCalledWith({
      queryKey: ["shop-manager", "account-a", "vehicle", idFor("VEHICLE-A"), "work-orders"],
      exact: false,
    });
    expect(invalidation.mock.calls.every(([args]) => args?.queryKey?.[1] === "account-a")).toBe(
      true,
    );
    submit();
    expect(state.write).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Create work order" })).toBeDisabled();
  });

  it("supports explicit customer-only creation and leaves optional inputs null without assuming zero", async () => {
    show();
    await prepare(false);
    submit();
    await recorded();
    expect(reads("vehicles", "single")).toHaveLength(0);
    expect(state.write.mock.calls[0][0].payload).toMatchObject({
      vehicle_id: null,
      estimated_hours: null,
      initial_mileage: null,
      description: null,
      service_type: null,
    });
  });

  it.each([null, 500])(
    "allows a chosen fresh visible customer despite count %j after identity revalidation",
    async (count) => {
      state.responses[key("customers")] = result(
        Array.from({ length: 101 }, (_, index) =>
          customer(index === 0 ? "CUSTOMER-A" : `CAPPED-${index}`),
        ),
        count,
      );
      show();
      await screen.findByRole("option", { name: "CUSTOMER-A Visible customer" });
      expect(
        within(screen.getByRole("combobox", { name: "Customer" })).getAllByRole("option"),
      ).toHaveLength(101);
      expect(
        screen.queryByRole("option", { name: "CAPPED-100 Visible customer" }),
      ).not.toBeInTheDocument();
      expect(screen.getByText(/The picker is incomplete or unverified/)).toBeInTheDocument();
      await chooseCustomer();
      fill("Customer complaint", "Capped picker selected row");
      submit();
      await recorded();
      expect(reads("customers", "single")).toHaveLength(1);
      expect(state.write).toHaveBeenCalledTimes(1);
    },
  );

  it.each([null, 7])("never claims an empty customer list for count %j", async (count) => {
    state.responses[key("customers")] = result([], count);
    show();
    expect(
      await screen.findByText("No customers rows were returned; an empty list is not confirmed."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No visible customers in this returned snapshot."),
    ).not.toBeInTheDocument();
    expect(state.write).not.toHaveBeenCalled();
  });

  it.each(["customer", "vehicle"])(
    "redacts %s picker errors and uses independent manual retry",
    async (kind) => {
      const table = kind === "customer" ? "customers" : "vehicles";
      const target = kind === "customer" ? "all" : idFor("CUSTOMER-A");
      state.responses[key(table, "options", target)] = {
        data: [],
        error: { message: "RAW-PRIVATE-DB-ERROR" },
        count: 0,
      };
      const { container } = show();
      if (kind === "vehicle") {
        await optionsReady();
        select("Customer", idFor("CUSTOMER-A"));
      }
      expect(
        await screen.findByText(
          kind === "customer"
            ? "Could not load customer options. Please try again."
            : "Could not load vehicle options. Please try again.",
        ),
      ).toBeInTheDocument();
      expect(container).not.toHaveTextContent("RAW-PRIVATE-DB-ERROR");
      expect(screen.getByRole("button", { name: "Create work order" })).toBeDisabled();
      state.responses[key(table, "options", target)] = result(
        kind === "customer" ? [customer()] : [vehicle()],
      );
      fireEvent.click(
        screen.getByRole("button", {
          name: kind === "customer" ? "Retry customers" : "Retry vehicles",
        }),
      );
      await screen.findByText(
        kind === "customer"
          ? "Showing 1 of 1 visible customers in this snapshot."
          : "Showing 1 of 1 visible vehicles in this snapshot.",
      );
      expect(reads(table, "options")).toHaveLength(2);
      expect(reads("customers", "single")).toHaveLength(0);
    },
  );

  it.each([
    "missing shop",
    "bad shop",
    "duplicate UUID alias",
    "bad hidden sentinel",
    "undefined count",
    "smaller count",
    "too many rows",
  ])("fails closed on malformed customer picker %s", async (mode) => {
    let rows: Record<string, unknown>[] = [customer()];
    let count: unknown = 1;
    if (mode === "missing shop") delete rows[0].shop_id;
    if (mode === "bad shop") rows[0].shop_id = "AUTH-UUID-IS-NOT-A-SHOP";
    if (mode === "duplicate UUID alias")
      rows.push(customer("DUPLICATE", { id: String(rows[0].id).toUpperCase() }));
    if (mode === "bad hidden sentinel") {
      rows = Array.from({ length: 101 }, (_, index) => customer(`SENTINEL-${index}`));
      rows[100].shop_id = null;
    }
    if (mode === "undefined count") count = undefined;
    else if (mode === "smaller count") count = 0;
    else count = rows.length;
    if (mode === "too many rows") {
      rows = Array.from({ length: 102 }, (_, index) => customer(`EXCESS-${index}`));
      count = 102;
    }
    state.responses[key("customers")] = result(rows, count);
    show();
    expect(
      await screen.findByText("Could not load customer options. Please try again."),
    ).toBeInTheDocument();
    expect(reads("vehicles")).toHaveLength(0);
    expect(state.write).not.toHaveBeenCalled();
  });

  it.each([
    "foreign customer",
    "null customer",
    "duplicate UUID alias",
    "missing projected field",
    "bad hidden sentinel",
  ])("fails closed on malformed vehicle picker %s", async (mode) => {
    let rows: Record<string, unknown>[] = [vehicle()];
    if (mode === "foreign customer") rows[0].customer_id = idFor("OTHER-CUSTOMER");
    if (mode === "null customer") rows[0].customer_id = null;
    if (mode === "duplicate UUID alias")
      rows.push(
        vehicle("DUPLICATE", idFor("CUSTOMER-A"), { id: String(rows[0].id).toUpperCase() }),
      );
    if (mode === "missing projected field") delete rows[0].year;
    if (mode === "bad hidden sentinel") {
      rows = Array.from({ length: 101 }, (_, index) => vehicle(`SENTINEL-${index}`));
      rows[100].customer_id = idFor("OTHER-CUSTOMER");
    }
    state.responses[key("vehicles", "options", idFor("CUSTOMER-A"))] = result(rows);
    show();
    await optionsReady();
    select("Customer", idFor("CUSTOMER-A"));
    expect(
      await screen.findByText("Could not load vehicle options. Please try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create work order" })).toBeDisabled();
    expect(state.write).not.toHaveBeenCalled();
  });

  it.each([
    ["Estimated hours", "-1"],
    ["Estimated hours", "1e3"],
    ["Estimated hours", "NaN"],
    ["Estimated hours", "1,000"],
    ["Estimated hours", ".5"],
    ["Estimated hours", "1".repeat(65)],
    ["Mileage in", "-1"],
    ["Mileage in", "1.5"],
    ["Mileage in", "1e3"],
    ["Mileage in", "1,2"],
    ["Mileage in", "2147483648"],
    ["Mileage in", "9007199254740993"],
  ])("rejects unsupported %s input %j before any revalidation/write", async (label, value) => {
    show();
    await prepare();
    fill(label, value);
    submit();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(state.write).not.toHaveBeenCalled();
    expect(reads("customers", "single")).toHaveLength(0);
  });

  it.each(["Status", "Priority"])("does not dispatch unsupported forged %s", async (label) => {
    show();
    await prepare();
    const control = screen.getByRole("combobox", { name: label });
    const option = document.createElement("option");
    option.value = "unsupported";
    option.textContent = "unsupported";
    control.append(option);
    fireEvent.change(control, { target: { value: "unsupported" } });
    submit();
    expect(await screen.findByText("Choose a supported status and priority.")).toBeInTheDocument();
    expect(state.write).not.toHaveBeenCalled();
  });

  it("keeps pre-dispatch validation correctable without a false success", async () => {
    show();
    await optionsReady();
    await chooseCustomer();
    submit();
    expect(await screen.findByText("Add a customer complaint or description.")).toBeInTheDocument();
    expect(state.write).not.toHaveBeenCalled();
    fill("Description / scope", "Corrected scope");
    submit();
    await recorded();
    expect(state.write).toHaveBeenCalledTimes(1);
  });

  it("fails closed with a fixed message if request UUID generation is unavailable", async () => {
    vi.mocked(globalThis.crypto.randomUUID).mockImplementation(() => {
      throw new Error("RAW-IDENTITY-ERROR");
    });
    const { container } = show();
    await prepare();
    submit();
    expect(
      await screen.findByText("A work-order request identity is unavailable. Please try again."),
    ).toBeInTheDocument();
    expect(container).not.toHaveTextContent("RAW-IDENTITY-ERROR");
    expect(state.write).not.toHaveBeenCalled();
    expect(reads("customers", "single")).toHaveLength(0);
  });

  it.each([
    "customer absent",
    "customer shop changed",
    "customer ID changed",
    "customer error",
    "vehicle absent",
    "vehicle moved",
    "vehicle ID changed",
    "vehicle error",
  ])("stops before insert when preflight finds %s", async (mode) => {
    if (mode.startsWith("customer"))
      state.responses[key("customers", "single", idFor("CUSTOMER-A"))] =
        mode === "customer absent"
          ? result(null)
          : mode === "customer error"
            ? { data: null, error: { message: "RAW-PREFLIGHT-SECRET" } }
            : result(
                customer(
                  "CUSTOMER-A",
                  mode === "customer shop changed"
                    ? { shop_id: idFor("OTHER-SHOP") }
                    : { id: idFor("OTHER-CUSTOMER") },
                ),
              );
    else
      state.responses[key("vehicles", "single", idFor("VEHICLE-A"))] =
        mode === "vehicle absent"
          ? result(null)
          : mode === "vehicle error"
            ? { data: null, error: { message: "RAW-PREFLIGHT-SECRET" } }
            : result(
                vehicle(
                  "VEHICLE-A",
                  mode === "vehicle moved" ? idFor("OTHER-CUSTOMER") : idFor("CUSTOMER-A"),
                  mode === "vehicle ID changed" ? { id: idFor("OTHER-VEHICLE") } : {},
                ),
              );
    const { container } = show();
    await prepare();
    submit();
    expect(await screen.findByText(PREFLIGHT_FAILURE)).toBeInTheDocument();
    expect(container).not.toHaveTextContent("RAW-PREFLIGHT-SECRET");
    expect(state.write).not.toHaveBeenCalled();
    expect(state.success).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Create work order" })).toBeEnabled();
  });

  it.each(RECEIPT_FIELDS.split(","))(
    "holds ambiguous creation when returned receipt omits %s",
    async (field) => {
      state.write.mockImplementation((request: Request) => {
        const data = receipt(request).data as Record<string, unknown>;
        delete data[field];
        return result(data);
      });
      show();
      await prepare();
      submit();
      expect(await screen.findByText(UNKNOWN)).toBeInTheDocument();
      expect(state.success).not.toHaveBeenCalled();
      expect(state.navigate).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Create work order" })).toBeDisabled();
      submit();
      expect(state.write).toHaveBeenCalledTimes(1);
      expect(reads("customers", "single")).toHaveLength(1);
    },
  );

  it.each([
    ["shop_id", idFor("OTHER-SHOP")],
    ["customer_id", idFor("OTHER-CUSTOMER")],
    ["vehicle_id", idFor("OTHER-VEHICLE")],
    ["id", "not-a-uuid"],
    ["id", idFor("OTHER-WORK-ORDER")],
    ["status", "changed"],
    ["priority", "urgent"],
    ["description", "changed"],
    ["customer_complaint", "changed"],
    ["service_type", "changed"],
    ["estimated_hours", 0],
    ["initial_mileage", 0],
  ])("holds mismatched returned %s without navigating/invalidation", async (field, value) => {
    state.write.mockImplementation((request: Request) =>
      result({ ...(receipt(request).data as object), [field]: value }),
    );
    const { client } = show();
    const invalidation = vi.spyOn(client, "invalidateQueries");
    await prepare();
    submit();
    expect(await screen.findByText(UNKNOWN)).toBeInTheDocument();
    expect(state.success).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
    expect(invalidation).not.toHaveBeenCalled();
  });

  it.each([
    "sdk error",
    "rejected response",
    "null response",
    "array response",
    "extra response key",
  ])("does not retry or acknowledge post-dispatch %s", async (mode) => {
    state.write.mockImplementation((request: Request) =>
      mode === "sdk error"
        ? { data: receipt(request).data, error: { message: "RAW-WRITE-SECRET" } }
        : mode === "rejected response"
          ? Promise.reject(new Error("RAW-WRITE-SECRET"))
          : mode === "null response"
            ? result(null)
            : mode === "array response"
              ? result([receipt(request).data])
              : result({ ...(receipt(request).data as object), unexpected: true }),
    );
    const { container } = show();
    await prepare();
    submit();
    expect(await screen.findByText(UNKNOWN)).toBeInTheDocument();
    expect(container).not.toHaveTextContent("RAW-WRITE-SECRET");
    expect(state.warning).toHaveBeenCalledWith(UNKNOWN);
    expect(state.success).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Refresh customers" }));
    submit();
    expect(state.write).toHaveBeenCalledTimes(1);
    expect(reads("customers", "options")).toHaveLength(1);
  });

  it("accepts case-equivalent returned UUID relationships and decimal numeric equality without rounding", async () => {
    state.write.mockImplementation((request: Request) =>
      result({
        ...(receipt(request).data as object),
        id: idFor("NEW-WORK-ORDER").toUpperCase(),
        shop_id: String(request.payload?.shop_id).toUpperCase(),
        customer_id: String(request.payload?.customer_id).toUpperCase(),
        vehicle_id: String(request.payload?.vehicle_id).toUpperCase(),
        estimated_hours: 1.25,
      }),
    );
    show();
    await prepare();
    fill("Estimated hours", "001.2500");
    submit();
    await recorded();
    expect(state.write.mock.calls[0][0].payload.estimated_hours).toBe("001.2500");
  });

  it("does not acknowledge a lossy returned decimal", async () => {
    state.write.mockImplementation((request: Request) =>
      result({ ...(receipt(request).data as object), estimated_hours: 9007199254740992 }),
    );
    show();
    await prepare();
    fill("Estimated hours", "9007199254740993");
    submit();
    expect(await screen.findByText(UNKNOWN)).toBeInTheDocument();
    expect(state.success).not.toHaveBeenCalled();
  });

  it("blocks overlapping submits and input changes while a single write is pending", async () => {
    const pending = deferred<Result>();
    state.write.mockReturnValue(pending.promise);
    show();
    await prepare();
    submit();
    await waitFor(() => expect(state.write).toHaveBeenCalledTimes(1));
    const form = screen.getByLabelText("Customer complaint").closest("form")!;
    fireEvent.submit(form);
    fill("Customer complaint", "FORGED-PENDING-EDIT");
    expect(screen.getByLabelText("Customer complaint")).toHaveValue("  Synthetic brake noise  ");
    expect(state.write).toHaveBeenCalledTimes(1);
    expect(reads("customers", "single")).toHaveLength(1);
    await act(async () => pending.resolve(receipt(state.write.mock.calls[0][0])));
    await recorded();
  });

  it("invalidates the customer choice after refresh and requires reselection even with identical rows", async () => {
    show();
    await prepare();
    fireEvent.click(screen.getByRole("button", { name: "Refresh customers" }));
    await waitFor(() => expect(reads("customers", "options")).toHaveLength(2));
    await optionsReady();
    expect(screen.getByRole("combobox", { name: "Customer" })).toHaveValue("");
    expect(screen.getByRole("button", { name: "Create work order" })).toBeDisabled();
    expect(screen.getByLabelText("Customer complaint")).toHaveValue("  Synthetic brake noise  ");
    submit();
    expect(state.write).not.toHaveBeenCalled();
    await chooseCustomer();
    submit();
    await recorded();
    expect(state.write.mock.calls[0][0].payload.vehicle_id).toBeNull();
  });

  it("does not reuse a pending vehicle response across customer A→B→A", async () => {
    const oldA = deferred<Result>();
    const newA = deferred<Result>();
    const b = customer("CUSTOMER-B");
    state.responses[key("customers")] = result([customer(), b]);
    state.responses[key("vehicles", "options", b.id)] = result([vehicle("VEHICLE-B", b.id)]);
    state.responses[key("vehicles", "options", idFor("CUSTOMER-A"))] = oldA.promise;
    show();
    await screen.findByText("Showing 2 of 2 visible customers in this snapshot.");
    select("Customer", idFor("CUSTOMER-A"));
    await waitFor(() => expect(reads("vehicles")).toHaveLength(1));
    select("Customer", b.id);
    await screen.findByRole("option", { name: "2026 VEHICLE-B Visible vehicle" });
    state.responses[key("vehicles", "options", idFor("CUSTOMER-A"))] = newA.promise;
    select("Customer", idFor("CUSTOMER-A"));
    await waitFor(() => expect(reads("vehicles")).toHaveLength(3));
    expect(reads("vehicles")[0].signal?.aborted).toBe(true);
    await act(async () => oldA.resolve(result([vehicle("LATE-VEHICLE")])));
    expect(screen.queryByRole("option", { name: /LATE-VEHICLE/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create work order" })).toBeDisabled();
    await act(async () => newA.resolve(result([vehicle()])));
    await screen.findByRole("option", { name: "2026 VEHICLE-A Visible vehicle" });
  });

  it("stops preflight dispatch after account change and does not carry the old draft", async () => {
    const pending = deferred<Result>();
    state.responses[key("customers", "single", idFor("CUSTOMER-A"))] = pending.promise;
    const { view, rerender, client } = show();
    const invalidation = vi.spyOn(client, "invalidateQueries");
    await prepare();
    submit();
    await waitFor(() => expect(reads("customers", "single")).toHaveLength(1));
    state.userId = "account-b";
    rerender(view());
    await optionsReady();
    expect(screen.getByLabelText("Customer complaint")).toHaveValue("");
    expect(reads("customers", "single")[0].signal?.aborted).toBe(true);
    await act(async () => pending.resolve(result(customer())));
    expect(state.write).not.toHaveBeenCalled();
    expect(reads("vehicles", "single")).toHaveLength(0);
    expect(state.success).not.toHaveBeenCalled();
    expect(state.warning).not.toHaveBeenCalled();
    expect(invalidation).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it("stops the next insert if source options start refreshing during preflight", async () => {
    const pending = deferred<Result>();
    const refresh = deferred<Result>();
    state.responses[key("customers", "single", idFor("CUSTOMER-A"))] = pending.promise;
    const { client } = show();
    await prepare();
    submit();
    await waitFor(() => expect(reads("customers", "single")).toHaveLength(1));
    state.responses[key("customers")] = refresh.promise;
    await act(async () => {
      void client.invalidateQueries({
        queryKey: ["shop-manager", "account-a", "work-orders", "create", "customers"],
      });
    });
    await screen.findByText("Loading customer options…");
    await act(async () => pending.resolve(result(customer())));
    expect(await screen.findByText(PREFLIGHT_FAILURE)).toBeInTheDocument();
    expect(state.write).not.toHaveBeenCalled();
    await act(async () => refresh.resolve(result([customer()])));
  });

  it("suppresses late write effects across account A→B→A and preserves the new draft", async () => {
    const pending = deferred<Result>();
    state.write.mockReturnValue(pending.promise);
    const { view, rerender, client } = show();
    const invalidation = vi.spyOn(client, "invalidateQueries");
    await prepare();
    submit();
    await waitFor(() => expect(state.write).toHaveBeenCalledTimes(1));
    state.userId = "account-b";
    rerender(view());
    await optionsReady();
    state.userId = "account-a";
    rerender(view());
    await optionsReady();
    fill("Customer complaint", "NEW-MOUNT-DRAFT");
    await act(async () => pending.resolve(receipt(state.write.mock.calls[0][0])));
    expect(screen.getByLabelText("Customer complaint")).toHaveValue("NEW-MOUNT-DRAFT");
    expect(screen.queryByText("Work order entry recorded.")).not.toBeInTheDocument();
    expect(screen.queryByText(UNKNOWN)).not.toBeInTheDocument();
    expect(state.success).not.toHaveBeenCalled();
    expect(state.warning).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
    expect(invalidation).not.toHaveBeenCalled();
    expect(state.write).toHaveBeenCalledTimes(1);
  });

  it("permanently loses preflight authority when a refresh is observed then cancelled back to the old snapshot", async () => {
    const pending = deferred<Result>();
    const refreshing = deferred<Result>();
    state.responses[key("customers", "single", idFor("CUSTOMER-A"))] = pending.promise;
    const { client } = show();
    await prepare();
    submit();
    await waitFor(() => expect(reads("customers", "single")).toHaveLength(1));
    state.responses[key("customers")] = refreshing.promise;
    const queryKey = ["shop-manager", "account-a", "work-orders", "create", "customers"];
    await act(async () => {
      void client.invalidateQueries({ queryKey });
    });
    await screen.findByText("Loading customer options…");
    await act(async () => {
      await client.cancelQueries({ queryKey });
    });
    await optionsReady();
    expect(screen.getByRole("combobox", { name: "Customer" })).toHaveValue(idFor("CUSTOMER-A"));
    await act(async () => pending.resolve(result(customer())));
    expect(await screen.findByText(PREFLIGHT_FAILURE)).toBeInTheDocument();
    expect(reads("vehicles", "single")).toHaveLength(0);
    expect(state.write).not.toHaveBeenCalled();
    await act(async () => refreshing.resolve(result([customer()])));
  });

  it("does not revive post-dispatch effects after observed refresh cancellation restores the same versions", async () => {
    const pending = deferred<Result>();
    const refreshing = deferred<Result>();
    state.write.mockReturnValue(pending.promise);
    const { client } = show();
    const invalidation = vi.spyOn(client, "invalidateQueries");
    await prepare();
    submit();
    await waitFor(() => expect(state.write).toHaveBeenCalledTimes(1));
    state.responses[key("customers")] = refreshing.promise;
    const queryKey = ["shop-manager", "account-a", "work-orders", "create", "customers"];
    await act(async () => {
      void client.invalidateQueries({ queryKey });
    });
    await screen.findByText("Loading customer options…");
    await act(async () => {
      await client.cancelQueries({ queryKey });
    });
    await optionsReady();
    invalidation.mockClear();
    await act(async () => pending.resolve(receipt(state.write.mock.calls[0][0])));
    expect(await screen.findByText(UNKNOWN)).toBeInTheDocument();
    expect(state.success).not.toHaveBeenCalled();
    expect(state.warning).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
    expect(invalidation).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Create work order" })).toBeDisabled();
    await act(async () => refreshing.resolve(result([customer()])));
  });

  it("holds a late acknowledged write if current options changed after dispatch", async () => {
    const pending = deferred<Result>();
    const refreshing = deferred<Result>();
    state.write.mockReturnValue(pending.promise);
    const { client } = show();
    const invalidation = vi.spyOn(client, "invalidateQueries");
    await prepare();
    submit();
    await waitFor(() => expect(state.write).toHaveBeenCalledTimes(1));
    state.responses[key("customers")] = refreshing.promise;
    await act(async () => {
      void client.invalidateQueries({
        queryKey: ["shop-manager", "account-a", "work-orders", "create", "customers"],
      });
    });
    await screen.findByText("Loading customer options…");
    invalidation.mockClear();
    await act(async () => pending.resolve(receipt(state.write.mock.calls[0][0])));
    expect(await screen.findByText(UNKNOWN)).toBeInTheDocument();
    expect(state.success).not.toHaveBeenCalled();
    expect(state.warning).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
    expect(invalidation).not.toHaveBeenCalled();
    await act(async () => refreshing.resolve(result([customer()])));
    expect(screen.getByRole("button", { name: "Create work order" })).toBeDisabled();
  });

  it("has no late mutation callbacks after unmount", async () => {
    const pending = deferred<Result>();
    state.write.mockReturnValue(pending.promise);
    const { unmount, client } = show();
    const invalidation = vi.spyOn(client, "invalidateQueries");
    await prepare();
    submit();
    await waitFor(() => expect(state.write).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => pending.reject(new Error("RAW-LATE-ERROR")));
    expect(state.success).not.toHaveBeenCalled();
    expect(state.warning).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
    expect(invalidation).not.toHaveBeenCalled();
  });
});
