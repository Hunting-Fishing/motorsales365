import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route } from "@/routes/_authenticated/workspace.quotes";

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
  retry?: boolean;
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
        retry: (retry: boolean) => {
          request.retry = retry;
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
const listKey = (userId = "account-a") => ["shop-manager", userId, "quotes", "list"];
const clients: QueryClient[] = [];
const fixtureIds = new Map<string, string>();
function idFor(label: string) {
  let id = fixtureIds.get(label);
  if (!id) {
    id = `aaaaaaaa-aaaa-4aaa-8aaa-${String(fixtureIds.size + 1).padStart(12, "0")}`;
    fixtureIds.set(label, id);
  }
  return id;
}
function quote(label = "QUOTE-A", overrides: Record<string, unknown> = {}) {
  return {
    id: idFor(label),
    quote_number: label,
    customer_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    created_at: "2026-10-15T23:59:59.123456+14:00",
    expiry_date: "2026-10-30",
    status: "sent",
    total_amount: "100.125",
    converted_to_work_order_id: null,
    ...overrides,
  };
}
function result(rows: unknown[] = [quote()], count: unknown = rows.length): DbResult {
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
async function ready(id = "QUOTE-A") {
  return screen.findByRole("link", { name: id });
}
function search(value: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Search displayed quotes" }), {
    target: { value },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.userId = "account-a";
  state.loading = false;
  state.responses = {
    "account-a": result(),
    "account-b": result([quote("QUOTE-B")]),
  };
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
});

describe("Account-scoped bounded quote list", () => {
  it("uses the fixed exact-count projection, deterministic timestamp/UUID order, sentinel and account key", async () => {
    const { client } = show();
    expect(await ready()).toHaveAttribute("href", `/workspace/quotes/${idFor("QUOTE-A")}`);
    expect(screen.getByRole("link", { name: "New Quote" })).toHaveAttribute(
      "href",
      "/workspace/quotes/new",
    );
    expect(screen.getByRole("link", { name: "← Back to Shop Manager" })).toHaveAttribute(
      "href",
      "/workspace",
    );
    expect(screen.getByText("Showing 1 of 1 visible quotes in this snapshot.")).toBeInTheDocument();
    expect(
      screen.getByText("All counted visible quotes are shown for this snapshot."),
    ).toBeInTheDocument();
    expect(state.read).toHaveBeenCalledTimes(1);
    expect(state.read.mock.calls[0][0]).toMatchObject({
      userId: "account-a",
      table: "quotes",
      projection:
        "id,quote_number,customer_id,status,total_amount,expiry_date,created_at,converted_to_work_order_id",
      options: { count: "exact" },
      limit: 101,
      retry: false,
      orders: [
        { column: "created_at", options: { ascending: false, nullsFirst: false } },
        { column: "id", options: { ascending: false, nullsFirst: false } },
      ],
    });
    expect(state.read.mock.calls[0][0].signal).toBeInstanceOf(AbortSignal);
    const accountQueries = client.getQueryCache().findAll({ queryKey: listKey() });
    expect(accountQueries).toHaveLength(1);
    expect(accountQueries[0].queryKey).toHaveLength(5);
    expect(typeof accountQueries[0].queryKey[4]).toBe("string");
    expect(accountQueries[0].state.data).toMatchObject({ count: 1, hasMore: false });
    expect(client.getQueryData(["shop-manager", "quotes", "list"])).toBeUndefined();
  });

  it.each(["signed-out", "auth-loading"])(
    "does not query or render seeded private caches while %s",
    (mode) => {
      if (mode === "signed-out") state.userId = null;
      else state.loading = true;
      const client = new QueryClient();
      const cached = { rows: [quote("CACHED-PRIVATE")], count: 1, hasMore: false };
      client.setQueryData(listKey(), cached);
      client.setQueryData(["shop-manager", "quotes", "list"], cached.rows);
      const { container } = show(client);
      expect(container).toBeEmptyDOMElement();
      expect(state.read).not.toHaveBeenCalled();
    },
  );

  it("ignores the legacy global cache", async () => {
    const client = new QueryClient();
    client.setQueryData(["shop-manager", "quotes", "list"], [quote("LEGACY-SECRET")]);
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
      rows: [quote("STALE-PRIVATE")],
      count: 1,
      hasMore: false,
    });
    show(client);
    expect(screen.queryByText("STALE-PRIVATE")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading quotes");
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
    await act(async () => pending.resolve(result()));
    await ready();
    expect(screen.queryByText("STALE-PRIVATE")).not.toBeInTheDocument();
  });

  it("does not use an application-wide private placeholder while the current read is pending", async () => {
    const pending = deferred<DbResult>();
    state.responses["account-a"] = pending.promise;
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Infinity,
          placeholderData: { rows: [quote("GLOBAL-PLACEHOLDER-SECRET")], count: 1, hasMore: false },
        },
      },
    });
    show(client);
    expect(screen.queryByText("GLOBAL-PLACEHOLDER-SECRET")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading quotes");
    await act(async () => pending.resolve(result()));
    await ready();
    expect(screen.queryByText("GLOBAL-PLACEHOLDER-SECRET")).not.toBeInTheDocument();
  });

  it("does not repaint seeded rows when a mount refresh fails", async () => {
    const pending = deferred<DbResult>();
    state.responses["account-a"] = pending.promise;
    const client = new QueryClient();
    client.setQueryData([...listKey(), "earlier-mount"], {
      rows: [quote("STALE-PRIVATE")],
      count: 1,
      hasMore: false,
    });
    show(client);
    await act(async () =>
      pending.resolve({ data: null, error: { message: "secret SQL" }, count: null }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load quotes");
    expect(screen.queryByText("STALE-PRIVATE")).not.toBeInTheDocument();
    expect(screen.queryByText("secret SQL")).not.toBeInTheDocument();
    expect(screen.queryByText(/No visible quotes/)).not.toBeInTheDocument();
  });

  it("masks settled rows during background refresh and after an error, then retries without losing search", async () => {
    const { client } = show();
    await ready();
    search("QUOTE-A");
    const pending = deferred<DbResult>();
    state.responses["account-a"] = pending.promise;
    act(() => {
      void client.invalidateQueries({ queryKey: listKey(), exact: false });
    });
    await screen.findByRole("status");
    expect(screen.queryByRole("link", { name: "QUOTE-A" })).not.toBeInTheDocument();
    await act(async () =>
      pending.resolve({ data: null, error: "private database error", count: null }),
    );
    await screen.findByRole("alert");
    expect(screen.queryByRole("link", { name: "QUOTE-A" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("QUOTE-A");
    state.responses["account-a"] = result();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await ready();
    expect(screen.queryByText("private database error")).not.toBeInTheDocument();
  });

  it("remounts search and removes prior-account rows on an observed account change", async () => {
    const { rerender, view } = show();
    await ready();
    search("QUOTE-A");
    state.userId = "account-b";
    rerender(view());
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.queryByRole("link", { name: "QUOTE-A" })).not.toBeInTheDocument();
    await ready("QUOTE-B");
    state.userId = "account-a";
    rerender(view());
    expect(screen.queryByRole("link", { name: "QUOTE-B" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");
    await ready();
  });

  it("cannot revive an old pending response through observed account A to B to A", async () => {
    const oldA = deferred<DbResult>();
    let aReads = 0;
    state.responses["account-a"] = () => (++aReads === 1 ? oldA.promise : result([quote("NEW-A")]));
    const { rerender, view, client } = show();
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
    const oldSignal = state.read.mock.calls[0][0].signal as AbortSignal;
    const oldKey = client.getQueryCache().findAll({ queryKey: listKey() })[0].queryKey;
    state.userId = "account-b";
    rerender(view());
    await ready("QUOTE-B");
    expect(oldSignal.aborted).toBe(true);
    state.userId = "account-a";
    rerender(view());
    await ready("NEW-A");
    const currentKey = client
      .getQueryCache()
      .findAll({ queryKey: listKey(), type: "active" })[0].queryKey;
    expect(currentKey).not.toEqual(oldKey);
    await act(async () => oldA.resolve(result([quote("OLD-A-SECRET")])));
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
    await ready("QUOTE-B");
    await act(async () => oldA.reject(new Error("old private failure")));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("old private failure")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "QUOTE-B" })).toBeInTheDocument();
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
      await act(async () => pending.resolve(result([quote("LATE-PRIVATE")])));
      expect(screen.queryByText("LATE-PRIVATE")).not.toBeInTheDocument();
    },
  );

  it("filters displayed records without aggregating estimates into revenue or a balance", async () => {
    state.responses["account-a"] = result([
      quote("PROPOSAL-A", { total_amount: "1000", status: "sent" }),
      quote("OTHER", { total_amount: "2000", status: "custom native status" }),
    ]);
    show();
    await ready("PROPOSAL-A");
    expect(screen.getByLabelText("Filtered record count")).toHaveTextContent("2");
    expect(screen.queryByText(/outstanding/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Total (filtered)")).not.toBeInTheDocument();
    expect(screen.getByText(/not revenue, payments, or a receivables balance/)).toBeInTheDocument();
    search("proposal");
    expect(screen.getByLabelText("Filtered record count")).toHaveTextContent("1");
    expect(screen.queryByRole("link", { name: "OTHER" })).not.toBeInTheDocument();
    search("not-present");
    expect(screen.getByText("No displayed quotes match your search.")).toBeInTheDocument();
    expect(screen.getByLabelText("Filtered record count")).toHaveTextContent("0");
  });

  it("displays only 100 records and uses the 101st solely as a truncation sentinel", async () => {
    state.responses["account-a"] = result(
      Array.from({ length: 101 }, (_, index) => quote(`CAP-${index}`)),
    );
    show();
    await ready("CAP-0");
    expect(
      screen.getByText("Showing 100 of 101 visible quotes in this snapshot."),
    ).toBeInTheDocument();
    expect(screen.getByText(/More visible records exist/)).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(101);
    expect(screen.queryByRole("link", { name: "CAP-100" })).not.toBeInTheDocument();
    search("CAP-100");
    expect(screen.getByText("No displayed quotes match your search.")).toBeInTheDocument();
  });

  it.each([0, 1, 100])(
    "reports count-unavailable completeness honestly with %i returned records",
    async (length) => {
      state.responses["account-a"] = result(
        Array.from({ length }, (_, index) => quote(`UNKNOWN-${index}`)),
        null,
      );
      show();
      await screen.findByText(
        `Showing ${length} returned quotes. Total visible count unavailable.`,
      );
      expect(screen.getByText(/Completeness is unverified/)).toBeInTheDocument();
      expect(screen.queryByText(/All counted visible/)).not.toBeInTheDocument();
    },
  );

  it("still reports truncation when the sentinel exists but count is unavailable", async () => {
    state.responses["account-a"] = result(
      Array.from({ length: 101 }, (_, index) => quote(`UNKNOWN-${index}`)),
      null,
    );
    show();
    await ready("UNKNOWN-0");
    expect(screen.getByText(/More visible records exist/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "UNKNOWN-100" })).not.toBeInTheDocument();
  });

  it("does not call an underfilled page complete when the exact visible count is larger", async () => {
    state.responses["account-a"] = result([quote()], 500);
    show();
    await ready();
    expect(
      screen.getByText("Showing 1 of 500 visible quotes in this snapshot."),
    ).toBeInTheDocument();
    expect(screen.getByText(/More visible records exist/)).toBeInTheDocument();
    expect(screen.queryByText(/All counted visible/)).not.toBeInTheDocument();
  });

  it("distinguishes an actual successful visible-empty snapshot from failure", async () => {
    state.responses["account-a"] = result([], 0);
    show();
    await screen.findByText("No visible quotes in this returned snapshot.");
    expect(screen.getByText("Showing 0 of 0 visible quotes in this snapshot.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([null, 3])(
    "does not confirm an empty list for zero returned rows with count %s",
    async (count) => {
      state.responses["account-a"] = result([], count);
      show();
      await screen.findByText(
        count === null
          ? "No quote rows were returned. An empty quote list is not confirmed because the visible count is unavailable."
          : "No quote rows were returned despite a positive visible count. This snapshot is incomplete.",
      );
      expect(
        screen.queryByText("No visible quotes in this returned snapshot."),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/All counted visible/)).not.toBeInTheDocument();
      state.responses["account-a"] = result([], 0);
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      await screen.findByText("No visible quotes in this returned snapshot.");
    },
  );

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
      expect(screen.queryByText(/No visible quotes/)).not.toBeInTheDocument();
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
    ["NaN count", result([], NaN)],
    ["unsafe count", result([], Number.MAX_SAFE_INTEGER + 1)],
    ["count smaller than result", result([quote()], 0)],
    [
      "over-cap response",
      result(Array.from({ length: 102 }, (_, index) => quote(`OVER-${index}`))),
    ],
    ["duplicate UUID", result([quote(), quote()])],
    [
      "case-insensitive duplicate UUID",
      result([quote(), quote("OTHER", { id: quote().id.toUpperCase() })]),
    ],
    ["missing row field", result([{ id: "INCOMPLETE" }])],
    [
      "missing selected amount field",
      result([
        Object.fromEntries(
          Object.entries(quote("MISSING-AMOUNT")).filter(([key]) => key !== "total_amount"),
        ),
      ]),
    ],
    ["null row", result([null])],
    ["primitive row", result(["not-a-row"])],
    ["unexpected row field", result([quote("EXTRA", { private_extra: "hidden" })])],
    ["non-UUID quote ID", result([quote("BAD-ID", { id: "opaque-invoice-style-text" })])],
    ["null quote ID", result([quote("BAD-ID", { id: null })])],
    ["malformed customer UUID", result([quote("BAD-CUSTOMER", { customer_id: "not-a-uuid" })])],
    [
      "malformed work-order UUID",
      result([quote("BAD-WO", { converted_to_work_order_id: "not-a-uuid" })]),
    ],
    ["null required status", result([quote("NULL-STATUS", { status: null })])],
    ["null required timestamp", result([quote("NULL-CREATED", { created_at: null })])],
    ["numeric timestamp", result([quote("NUMERIC-CREATED", { created_at: 2026 })])],
    ["object timestamp", result([quote("OBJECT-CREATED", { created_at: {} })])],
    ["boolean timestamp", result([quote("BAD-CREATED", { created_at: false })])],
    ["numeric expiry", result([quote("BAD-EXPIRY", { expiry_date: 2026 })])],
    ["object expiry", result([quote("WRONG-EXPIRY", { expiry_date: {} })])],
    ["sparse array", result(new Array(1))],
  ])("rejects %s as a generic load failure instead of an empty list", async (_name, response) => {
    state.responses["account-a"] = response;
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load quotes");
    expect(screen.queryByText(/No visible quotes/)).not.toBeInTheDocument();
    expect(screen.queryByText("hidden")).not.toBeInTheDocument();
    expect(screen.queryByText("draft")).not.toBeInTheDocument();
  });

  it.each(["expiry type", "duplicate UUID"])(
    "validates the hidden 101st row including %s",
    async (fault) => {
      state.responses["account-a"] = result([
        ...Array.from({ length: 100 }, (_, index) => quote(`VALID-${index}`)),
        fault === "expiry type"
          ? quote("BAD-SENTINEL", { expiry_date: { private_detail: "hidden" } })
          : quote("VALID-0"),
      ]);
      show();
      await screen.findByRole("alert");
      expect(screen.queryByText("VALID-0")).not.toBeInTheDocument();
    },
  );

  it("preserves UUID navigation, opaque quote numbers and calendar/offset timestamp text", async () => {
    const targetId = "ABCDEFAB-CDEF-4ABC-8DEF-ABCDEFABCDEF";
    const workOrderId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    state.responses["account-a"] = result([
      quote("Quote/custom:opaque", {
        id: targetId,
        created_at: "2026-10-16T00:01:00+14:00",
        expiry_date: "2026-10-16",
        converted_to_work_order_id: workOrderId,
      }),
      quote("quote/custom:opaque", {
        created_at: "2026-10-15T23:59:00-12:00",
        expiry_date: "2024-02-29",
      }),
    ]);
    show();
    expect(await ready("Quote/custom:opaque")).toHaveAttribute(
      "href",
      `/workspace/quotes/${targetId}`,
    );
    expect(screen.getByRole("link", { name: "quote/custom:opaque" })).toBeInTheDocument();
    for (const text of [
      "2026-10-16",
      "2024-02-29",
      "2026-10-15T23:59:00-12:00",
      "2026-10-16T00:01:00+14:00",
    ])
      expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View WO →" })).toHaveAttribute(
      "href",
      `/workspace/work-orders/${workOrderId}`,
    );
    expect(screen.queryByText("Invalid Date")).not.toBeInTheDocument();
  });

  it("uses a full UUID for an unnumbered quote and does not invent expiry or draft status", async () => {
    const id = "00000000-0000-0000-0000-000000000000";
    state.responses["account-a"] = result([
      quote("UNNUMBERED", {
        id,
        quote_number: null,
        customer_id: null,
        expiry_date: null,
        created_at: "0001-01-01T00:00:00Z",
        status: "",
      }),
    ]);
    show();
    const link = await ready(id);
    expect(link).toHaveAttribute("href", `/workspace/quotes/${id}`);
    expect(within(link.closest("tr")!).getByText("Status unavailable")).toBeInTheDocument();
    expect(screen.queryByText("draft")).not.toBeInTheDocument();
    expect(screen.getByText("0001-01-01T00:00:00Z")).toBeInTheDocument();
    search(id);
    expect(screen.getByLabelText("Filtered record count")).toHaveTextContent("1");
  });

  it.each<[string, string]>([
    ["infinity", "-infinity"],
    ["-infinity", "infinity"],
    ["12026-01-01T00:00:00+00:00", "12026-01-01"],
    ["294276-01-01T00:00:00+00:00", "5874897-01-01"],
    ["0001-01-01T00:00:00+00:00 BC", "0001-01-01 BC"],
    ["0099-01-08T04:05:06+00:00 BC", "0099-01-08 BC"],
    ["2026-10-16T12:34:56+00:00:30", "2026-10-16"],
  ])(
    "preserves native timestamp %s and date %s without browser parsing or expiry policy",
    async (created, expiry) => {
      // Synthetic source representations only, not live API/date-range acceptance.
      state.responses["account-a"] = result([
        quote("NATIVE-DATE", {
          created_at: created,
          expiry_date: expiry,
        }),
      ]);
      show();
      const link = await ready("NATIVE-DATE");
      const row = link.closest("tr")!;
      expect(within(row).getByRole("cell", { name: created })).toBeInTheDocument();
      expect(within(row).getByRole("cell", { name: expiry })).toBeInTheDocument();
      expect(row.querySelector("time")).toBeNull();
      expect(screen.queryByText("Invalid Date")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(within(row).getByText("sent")).toBeInTheDocument();
    },
  );

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
      state.responses["account-a"] = result([quote("PRECISION", { total_amount: amount })]);
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
    state.responses["account-a"] = result([quote("INVALID-AMOUNT", { total_amount: amount })]);
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
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load quotes");
    expect(screen.queryByText("private route stack/SQL")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(reset).toHaveBeenCalledTimes(1);
    state.userId = null;
    rerender(<ErrorView error={new Error("private route stack/SQL")} reset={reset} />);
    expect(container).toBeEmptyDOMElement();
  });
});
