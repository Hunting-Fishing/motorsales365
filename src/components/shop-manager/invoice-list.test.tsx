import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route } from "@/routes/_authenticated/workspace.invoices";

// Real React Query/component lifetimes, synthetic SDK responses only. This does
// not exercise JWT selection, RLS, HTTP cancellation or financial posting.
type DbResult = { data: unknown; error: unknown; count: unknown };
type Response = DbResult | Promise<DbResult> | (() => DbResult | Promise<DbResult>);
type Request = {
  userId: string | null;
  table: string;
  projection?: string;
  options?: unknown;
  orders: { column: string; options: unknown }[];
  limit?: number;
  signal?: AbortSignal;
};
const state = vi.hoisted(() => ({
  userId: "account-a" as string | null,
  loading: false,
  responses: {} as Record<string, Response>,
  read: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.userId ? { id: state.userId } : null, loading: state.loading }),
}));
vi.mock("@/components/site-layout", () => ({
  SiteLayout: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({ options }),
  Link: ({
    to,
    params,
    children,
    ...props
  }: React.PropsWithChildren<{
    to: string;
    params?: { id: string };
    className?: string;
  }>) => (
    <a {...props} href={to.replace("$id", params?.id ?? "")}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/shop-manager/db", () => ({
  smSupabase: {
    from: (table: string) => {
      const request: Request = { userId: state.userId, table, orders: [] };
      const builder = {
        select: (projection: string, options: unknown) => {
          request.projection = projection;
          request.options = options;
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
        then: (resolve: (result: DbResult) => unknown, reject: (error: unknown) => unknown) => {
          state.read({ ...request, orders: [...request.orders] });
          const response = state.responses[request.userId ?? "signed-out"];
          // Deliberately ignore aborts here: a late transport double must not
          // repaint the UI even when the transport does not honor cancellation.
          return Promise.resolve()
            .then(() => (typeof response === "function" ? response() : response))
            .then(resolve, reject);
        },
      };
      return builder;
    },
  },
}));

const List = Route.options.component as React.ComponentType;
const ErrorView = Route.options.errorComponent as React.ComponentType<{
  error: unknown;
  reset: () => void;
}>;
const listKey = (userId = "account-a") => ["shop-manager", userId, "invoices", "list"];
const clients: QueryClient[] = [];
function invoice(id = "INV-A", overrides: Record<string, unknown> = {}) {
  return {
    id,
    customer: "Private customer A",
    customer_email: "customer-a@example.test",
    customer_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    date: "2026-10-15",
    due_date: "2026-10-30",
    status: "issued",
    subtotal: "100.125",
    tax: "0",
    total: "100.125",
    work_order_id: null,
    ...overrides,
  };
}
function result(rows: unknown[] = [invoice()], count: unknown = rows.length): DbResult {
  return { data: rows, error: null, count };
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
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }),
) {
  clients.push(client);
  const view = () => (
    <QueryClientProvider client={client}>
      <List />
    </QueryClientProvider>
  );
  return { ...render(view()), view, client };
}
async function ready(id = "INV-A") {
  return screen.findByRole("link", { name: id });
}
function search(value: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Search displayed invoices" }), {
    target: { value },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.userId = "account-a";
  state.loading = false;
  state.responses = {
    "account-a": result(),
    "account-b": result([invoice("INV-B", { customer: "Private customer B" })]),
  };
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
});

describe("Account-scoped bounded invoice list", () => {
  it("uses the fixed exact-count projection, deterministic TEXT order, sentinel and account key", async () => {
    const { client } = show();
    expect(await ready()).toHaveAttribute("href", "/workspace/invoices/INV-A");
    expect(
      screen.getByText("Showing 1 of 1 visible invoices in this snapshot."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("All counted visible invoices are shown for this snapshot."),
    ).toBeInTheDocument();
    expect(state.read).toHaveBeenCalledTimes(1);
    expect(state.read.mock.calls[0][0]).toMatchObject({
      userId: "account-a",
      table: "invoices",
      projection:
        "id,customer,customer_email,customer_id,date,due_date,status,subtotal,tax,total,work_order_id",
      options: { count: "exact" },
      limit: 101,
      orders: [
        { column: "date", options: { ascending: false, nullsFirst: false } },
        { column: "id", options: { ascending: false, nullsFirst: false } },
      ],
    });
    expect(state.read.mock.calls[0][0].signal).toBeInstanceOf(AbortSignal);
    const accountQueries = client.getQueryCache().findAll({ queryKey: listKey() });
    expect(accountQueries).toHaveLength(1);
    expect(accountQueries[0].queryKey).toHaveLength(5);
    expect(typeof accountQueries[0].queryKey[4]).toBe("string");
    expect(accountQueries[0].state.data).toMatchObject({ count: 1, hasMore: false });
    expect(client.getQueryData(["shop-manager", "invoices", "list"])).toBeUndefined();
  });

  it.each(["signed-out", "auth-loading"])(
    "does not query or render seeded private caches while %s",
    (mode) => {
      if (mode === "signed-out") state.userId = null;
      else state.loading = true;
      const client = new QueryClient();
      const cached = { rows: [invoice("CACHED-PRIVATE")], count: 1, hasMore: false };
      client.setQueryData(listKey(), cached);
      client.setQueryData(["shop-manager", "invoices", "list"], cached.rows);
      const { container } = show(client);
      expect(container).toBeEmptyDOMElement();
      expect(state.read).not.toHaveBeenCalled();
    },
  );

  it("ignores the legacy global cache", async () => {
    const client = new QueryClient();
    client.setQueryData(["shop-manager", "invoices", "list"], [invoice("LEGACY-SECRET")]);
    show(client);
    expect(screen.queryByText("LEGACY-SECRET")).not.toBeInTheDocument();
    await ready();
    expect(screen.queryByText("LEGACY-SECRET")).not.toBeInTheDocument();
  });

  it("forces a mount fetch and ignores earlier-mount same-account cached data until it settles", async () => {
    const pending = deferred<DbResult>();
    state.responses["account-a"] = pending.promise;
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    client.setQueryData([...listKey(), "earlier-mount"], {
      rows: [invoice("STALE-PRIVATE")],
      count: 1,
      hasMore: false,
    });
    show(client);
    expect(screen.queryByText("STALE-PRIVATE")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading invoices");
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
    await act(async () => pending.resolve(result()));
    await ready();
    expect(screen.queryByText("STALE-PRIVATE")).not.toBeInTheDocument();
  });

  it("does not repaint seeded rows when a mount refresh fails", async () => {
    const pending = deferred<DbResult>();
    state.responses["account-a"] = pending.promise;
    const client = new QueryClient();
    client.setQueryData([...listKey(), "earlier-mount"], {
      rows: [invoice("STALE-PRIVATE")],
      count: 1,
      hasMore: false,
    });
    show(client);
    await act(async () =>
      pending.resolve({ data: null, error: { message: "secret SQL" }, count: null }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load invoices");
    expect(screen.queryByText("STALE-PRIVATE")).not.toBeInTheDocument();
    expect(screen.queryByText("secret SQL")).not.toBeInTheDocument();
    expect(screen.queryByText(/No visible invoices/)).not.toBeInTheDocument();
  });

  it("masks settled rows during background refresh and after an error, then retries without losing search", async () => {
    const { client } = show();
    await ready();
    search("INV-A");
    const pending = deferred<DbResult>();
    state.responses["account-a"] = pending.promise;
    act(() => {
      void client.invalidateQueries({ queryKey: listKey(), exact: false });
    });
    await screen.findByRole("status");
    expect(screen.queryByRole("link", { name: "INV-A" })).not.toBeInTheDocument();
    await act(async () =>
      pending.resolve({ data: null, error: "private database error", count: null }),
    );
    await screen.findByRole("alert");
    expect(screen.queryByRole("link", { name: "INV-A" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("INV-A");
    state.responses["account-a"] = result();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await ready();
    expect(screen.queryByText("private database error")).not.toBeInTheDocument();
  });

  it("remounts search and removes prior-account rows on an observed account change", async () => {
    const { rerender, view } = show();
    await ready();
    search("INV-A");
    state.userId = "account-b";
    rerender(view());
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.queryByText("Private customer A")).not.toBeInTheDocument();
    await ready("INV-B");
    state.userId = "account-a";
    rerender(view());
    expect(screen.queryByRole("link", { name: "INV-B" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");
    await ready();
  });

  it("cannot revive an old pending response through observed account A to B to A", async () => {
    const oldA = deferred<DbResult>();
    let aReads = 0;
    state.responses["account-a"] = () =>
      ++aReads === 1 ? oldA.promise : result([invoice("NEW-A")]);
    const { rerender, view, client } = show();
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
    const oldSignal = state.read.mock.calls[0][0].signal as AbortSignal;
    const oldKey = client.getQueryCache().findAll({ queryKey: listKey() })[0].queryKey;
    state.userId = "account-b";
    rerender(view());
    await ready("INV-B");
    expect(oldSignal.aborted).toBe(true);
    state.userId = "account-a";
    rerender(view());
    await ready("NEW-A");
    const currentKey = client
      .getQueryCache()
      .findAll({ queryKey: listKey(), type: "active" })[0].queryKey;
    expect(currentKey).not.toEqual(oldKey);
    await act(async () => oldA.resolve(result([invoice("OLD-A-SECRET")])));
    expect(screen.queryByText("OLD-A-SECRET")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "NEW-A" })).toBeInTheDocument();
  });

  it("does not paint a late previous-account rejection on the new account", async () => {
    const oldA = deferred<DbResult>();
    state.responses["account-a"] = oldA.promise;
    const { rerender, view } = show();
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
    state.userId = "account-b";
    rerender(view());
    await ready("INV-B");
    await act(async () => oldA.reject(new Error("old private failure")));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("old private failure")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "INV-B" })).toBeInTheDocument();
  });

  it.each(["sign-out", "loading", "unmount"])(
    "aborts the UI lifetime and ignores late data after %s",
    async (mode) => {
      const pending = deferred<DbResult>();
      state.responses["account-a"] = pending.promise;
      const { container, rerender, view, unmount } = show();
      await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
      const signal = state.read.mock.calls[0][0].signal as AbortSignal;
      if (mode === "unmount") unmount();
      else {
        if (mode === "sign-out") state.userId = null;
        else state.loading = true;
        rerender(view());
      }
      expect(signal.aborted).toBe(true);
      expect(container).toBeEmptyDOMElement();
      await act(async () => pending.resolve(result([invoice("LATE-PRIVATE")])));
      expect(screen.queryByText("LATE-PRIVATE")).not.toBeInTheDocument();
    },
  );

  it("filters displayed records without a monetary sum or false outstanding balance", async () => {
    state.responses["account-a"] = result([
      invoice("PARTIALLY-PAID", { total: "1000", status: "issued" }),
      invoice("OTHER", { total: "2000", status: "custom native status" }),
    ]);
    show();
    await ready("PARTIALLY-PAID");
    expect(screen.getByLabelText("Filtered record count")).toHaveTextContent("2");
    expect(screen.queryByText(/outstanding/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Total (filtered)")).not.toBeInTheDocument();
    expect(screen.getByText(/not an accounts-receivable balance/)).toBeInTheDocument();
    search("partially");
    expect(screen.getByLabelText("Filtered record count")).toHaveTextContent("1");
    expect(screen.queryByRole("link", { name: "OTHER" })).not.toBeInTheDocument();
    search("not-present");
    expect(screen.getByText("No displayed invoices match your search.")).toBeInTheDocument();
    expect(screen.getByLabelText("Filtered record count")).toHaveTextContent("0");
  });

  it("displays only 100 records and uses the 101st solely as a truncation sentinel", async () => {
    state.responses["account-a"] = result(
      Array.from({ length: 101 }, (_, index) => invoice(`CAP-${index}`)),
    );
    show();
    await ready("CAP-0");
    expect(
      screen.getByText("Showing 100 of 101 visible invoices in this snapshot."),
    ).toBeInTheDocument();
    expect(screen.getByText(/More visible records exist/)).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(101);
    expect(screen.queryByRole("link", { name: "CAP-100" })).not.toBeInTheDocument();
    search("CAP-100");
    expect(screen.getByText("No displayed invoices match your search.")).toBeInTheDocument();
  });

  it.each([0, 1, 100])(
    "reports count-unavailable completeness honestly with %i returned records",
    async (length) => {
      state.responses["account-a"] = result(
        Array.from({ length }, (_, index) => invoice(`UNKNOWN-${index}`)),
        null,
      );
      show();
      await screen.findByText(
        `Showing ${length} returned invoices. Total visible count unavailable.`,
      );
      expect(screen.getByText(/Completeness is unverified/)).toBeInTheDocument();
      expect(screen.queryByText(/All counted visible/)).not.toBeInTheDocument();
    },
  );

  it("still reports truncation when the sentinel exists but count is unavailable", async () => {
    state.responses["account-a"] = result(
      Array.from({ length: 101 }, (_, index) => invoice(`UNKNOWN-${index}`)),
      null,
    );
    show();
    await ready("UNKNOWN-0");
    expect(screen.getByText(/More visible records exist/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "UNKNOWN-100" })).not.toBeInTheDocument();
  });

  it("does not call an underfilled page complete when the exact visible count is larger", async () => {
    state.responses["account-a"] = result([invoice()], 500);
    show();
    await ready();
    expect(
      screen.getByText("Showing 1 of 500 visible invoices in this snapshot."),
    ).toBeInTheDocument();
    expect(screen.getByText(/More visible records exist/)).toBeInTheDocument();
    expect(screen.queryByText(/All counted visible/)).not.toBeInTheDocument();
  });

  it("distinguishes an actual successful visible-empty snapshot from failure", async () => {
    state.responses["account-a"] = result([], 0);
    show();
    await screen.findByText("No visible invoices in this returned snapshot.");
    expect(
      screen.getByText("Showing 0 of 0 visible invoices in this snapshot."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each(["resolved", "rejected"])(
    "masks a %s SDK failure, never shows false empty, and supports manual retry",
    async (mode) => {
      state.responses["account-a"] =
        mode === "resolved"
          ? { data: null, count: null, error: { message: "sensitive SQL/customer detail" } }
          : () => Promise.reject(new Error("sensitive SQL/customer detail"));
      show();
      await screen.findByRole("alert");
      expect(screen.queryByText(/sensitive SQL/)).not.toBeInTheDocument();
      expect(screen.queryByText(/No visible invoices/)).not.toBeInTheDocument();
      expect(state.read).toHaveBeenCalledTimes(1);
      state.responses["account-a"] = result();
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      await ready();
      expect(state.read).toHaveBeenCalledTimes(2);
    },
  );

  it.each<[string, DbResult]>([
    ["null data", { data: null, error: null, count: 0 }],
    ["wrong data type", { data: {}, error: null, count: 0 }],
    ["missing count", { data: [], error: null, count: undefined }],
    ["negative count", result([], -1)],
    ["fractional count", result([], 0.5)],
    ["numeric-string count", result([], "0")],
    ["infinite count", result([], Infinity)],
    ["count smaller than result", result([invoice()], 0)],
    [
      "over-cap response",
      result(Array.from({ length: 102 }, (_, index) => invoice(`OVER-${index}`))),
    ],
    ["duplicate opaque ID", result([invoice(), invoice()])],
    ["missing row field", result([{ id: "INCOMPLETE" }])],
    ["unexpected row field", result([invoice("EXTRA", { private_extra: "hidden" })])],
  ])("rejects %s as a generic load failure instead of an empty list", async (_name, response) => {
    state.responses["account-a"] = response;
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load invoices");
    expect(screen.queryByText(/No visible invoices/)).not.toBeInTheDocument();
    expect(screen.queryByText("hidden")).not.toBeInTheDocument();
  });

  it("validates the hidden 101st row rather than silently discarding a malformed sentinel", async () => {
    state.responses["account-a"] = result([
      ...Array.from({ length: 100 }, (_, index) => invoice(`VALID-${index}`)),
      invoice("BAD-SENTINEL", { date: { secret: true } }),
    ]);
    show();
    await screen.findByRole("alert");
    expect(screen.queryByText("VALID-0")).not.toBeInTheDocument();
  });

  it("preserves opaque, case-distinct invoice IDs and unparsed native date text", async () => {
    state.responses["account-a"] = result([
      invoice("Inv/custom:opaque", { date: "02/03/legacy-text", due_date: "When collected" }),
      invoice("inv/custom:opaque", {
        date: "not a date",
        due_date: "2026-10-16T00:01:00+14:00",
        work_order_id: "opaque-wo",
      }),
    ]);
    show();
    expect(await ready("Inv/custom:opaque")).toHaveAttribute(
      "href",
      "/workspace/invoices/Inv/custom:opaque",
    );
    expect(screen.getByRole("link", { name: "inv/custom:opaque" })).toBeInTheDocument();
    for (const text of [
      "02/03/legacy-text",
      "When collected",
      "not a date",
      "2026-10-16T00:01:00+14:00",
    ])
      expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "open" })).toHaveAttribute(
      "href",
      "/workspace/work-orders/opaque-wo",
    );
    expect(screen.queryByText("Invalid Date")).not.toBeInTheDocument();
  });

  it.each<[unknown, string]>([
    [
      "12345678901234567890.12345678901234567890",
      "12,345,678,901,234,567,890.12345678901234567890",
    ],
    ["20.50", "20.50"],
    ["1.234", "1.234"],
    ["0", "0"],
    [0, "0"],
    ["-.5000", "-0.5000"],
    ["+000123.4500", "123.4500"],
    ["1.234e-5", "0.00001234"],
    [1e-25, `0.${"0".repeat(24)}1`],
    ["1e30", "1,000,000,000,000,000,000,000,000,000,000"],
    [1000.123456789, "1,000.123456789"],
  ])(
    "preserves received decimal precision for %s without currency rounding",
    async (amount, displayed) => {
      state.responses["account-a"] = result([invoice("PRECISION", { total: amount })]);
      show();
      const link = await ready("PRECISION");
      const row = link.closest("tr");
      expect(row).not.toBeNull();
      expect(within(row!).getByRole("cell", { name: displayed })).toBeInTheDocument();
    },
  );

  it.each([
    null,
    undefined,
    "",
    " ",
    "NaN",
    "Infinity",
    NaN,
    Infinity,
    -Infinity,
    false,
    {},
    "0x10",
    "1e9999",
    "1".repeat(513),
  ])("labels an unavailable or unsupported amount honestly (%s)", async (amount) => {
    state.responses["account-a"] = result([invoice("INVALID-AMOUNT", { total: amount })]);
    show();
    const link = await ready("INVALID-AMOUNT");
    expect(within(link.closest("tr")!).getByText("Amount unavailable")).toBeInTheDocument();
    expect(screen.queryByText("NaN")).not.toBeInTheDocument();
    expect(screen.queryByText("Infinity")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps route-level error details generic, supports reset, and hides them when signed out", () => {
    const reset = vi.fn();
    const { rerender, container } = render(
      <ErrorView error={new Error("private route stack/SQL")} reset={reset} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load invoices");
    expect(screen.queryByText("private route stack/SQL")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(reset).toHaveBeenCalledTimes(1);
    state.userId = null;
    rerender(<ErrorView error={new Error("private route stack/SQL")} reset={reset} />);
    expect(container).toBeEmptyDOMElement();
  });
});
