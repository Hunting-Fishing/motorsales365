import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  CustomerCommercialInvoice,
  CustomerCommercialKind,
  CustomerCommercialQuote,
  CustomerCommercialResult,
} from "@/lib/customer-commercial";
import { CustomerCommercialHistory } from "./customer-commercial-history";

type Request = {
  data: { expectedAccountId: string; customerId: string; kind: CustomerCommercialKind };
  signal: AbortSignal;
};
const state = vi.hoisted(() => ({
  userId: "employee-a" as string | null,
  responses: {} as Record<string, unknown>,
  read: vi.fn(),
  legacyFrom: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.userId ? { id: state.userId } : null }),
}));
vi.mock("@/lib/customer-commercial.functions", () => ({
  getCustomerCommercialSnapshot: (request: Request) => state.read(request),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/shop-manager/db", () => ({
  smSupabase: {
    from: (table: string) => {
      state.legacyFrom(table);
      throw new Error("Commercial history must not use the global browser reader.");
    },
  },
}));
vi.mock("@tanstack/react-router", () => ({
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

// Full transport DTO fixtures with synthetic IDs; no schema validation, JWT,
// middleware, HTTP, SQL ordering, RLS or database cancellation runs in this suite.
const invoice = (id = "invoice-a", customerId = "customer-a"): CustomerCommercialInvoice => ({
  id,
  customer_id: customerId,
  date: "2026-10-15",
  due_date: "2026-11-15",
  status: "paid",
  total: 750,
  created_at: "2026-10-15T08:00:00Z",
});
const quote = (id = "quote-a", customerId = "customer-a"): CustomerCommercialQuote => ({
  id,
  customer_id: customerId,
  quote_number: `Q-${id}`,
  created_at: "2026-10-15T08:00:00Z",
  expiry_date: "2026-11-15",
  status: "sent",
  total_amount: 1000,
});
const kinds = ["invoices", "quotes"] as const;
const cap = {
  invoices: "Showing the 25 most recently recorded invoices.",
  quotes: "Showing the 25 most recent visible quotes.",
} as const;
const queryKey = (account: string, customer: string, kind: CustomerCommercialKind) =>
  ["shop-manager", account, "customer", customer, kind] as const;
const responseKey = (account: string, customer: string, kind: CustomerCommercialKind) =>
  `${account}|${customer}|${kind}`;
const linkName = (kind: CustomerCommercialKind, id: string) =>
  kind === "invoices" ? `Invoice ${id}` : `Q-${id}`;
function snapshot(
  kind: CustomerCommercialKind,
  id = "record-a",
  {
    customer = "customer-a",
    available = true,
    hasMore = false,
    count = 1,
  }: { customer?: string; available?: boolean; hasMore?: boolean; count?: number } = {},
): CustomerCommercialResult {
  return kind === "invoices"
    ? {
        kind,
        available,
        hasMore,
        rows: Array.from({ length: count }, (_, i) =>
          invoice(count > 1 ? `${id}-${i}` : id, customer),
        ),
      }
    : {
        kind,
        available,
        hasMore,
        rows: Array.from({ length: count }, (_, i) =>
          quote(count > 1 ? `${id}-${i}` : id, customer),
        ),
      };
}
function respond(
  kind: CustomerCommercialKind,
  result: unknown,
  account = "employee-a",
  customer = "customer-a",
) {
  state.responses[responseKey(account, customer, kind)] = result;
}
function deferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<unknown>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const clients = new Set<QueryClient>();
function show({
  customerId = "customer-a",
  cached = [] as { account: string; customer: string; result: CustomerCommercialResult }[],
} = {}) {
  let customer = customerId;
  // Host defaults intentionally favor cached data. The component must override
  // them itself, rather than depending on the application's global defaults.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
  });
  clients.add(client);
  for (const entry of cached)
    client.setQueryData(queryKey(entry.account, entry.customer, entry.result.kind), entry.result);
  const view = () => (
    <QueryClientProvider client={client}>
      <CustomerCommercialHistory customerId={customer} />
    </QueryClientProvider>
  );
  const result = render(view());
  return {
    ...result,
    client,
    update: (nextCustomer = customer) => {
      customer = nextCustomer;
      result.rerender(view());
    },
  };
}
function requests(kind?: CustomerCommercialKind) {
  return state.read.mock.calls
    .map(([request]) => request as Request)
    .filter((request) => !kind || request.data.kind === kind);
}
function card(kind: CustomerCommercialKind) {
  return within(screen.getByRole("region", { name: `Customer ${kind}`, exact: true }));
}

beforeEach(() => {
  vi.clearAllMocks();
  state.userId = "employee-a";
  state.responses = {};
  state.read.mockImplementation(async ({ data }: Request) => {
    const result = state.responses[responseKey(data.expectedAccountId, data.customerId, data.kind)];
    if (result instanceof Error) throw result;
    return result ?? snapshot(data.kind, "unused", { count: 0, customer: data.customerId });
  });
});
afterEach(() => {
  cleanup();
  for (const client of clients) client.clear();
  clients.clear();
  vi.unstubAllEnvs();
  expect(state.legacyFrom).not.toHaveBeenCalled();
});

describe("Customer commercial history private read snapshots", () => {
  it("mounts no private observers or reads while signed out even with prefilled account caches", () => {
    state.userId = null;
    const shown = show({
      cached: kinds.map((kind) => ({
        account: "employee-a",
        customer: "customer-a",
        result: snapshot(kind, "cached-private", { hasMore: true }),
      })),
    });
    expect(shown.container).toBeEmptyDOMElement();
    expect(state.read).not.toHaveBeenCalled();
    expect(shown.client.getQueryCache().getAll()).toHaveLength(2);
    for (const query of shown.client.getQueryCache().getAll())
      expect(query.getObserversCount()).toBe(0);
  });

  it("uses only two exact account/customer/source requests with signals and fresh-query options", async () => {
    const shown = show();
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(2));
    expect(
      requests()
        .map((request) => request.data.kind)
        .sort(),
    ).toEqual([...kinds]);
    for (const request of requests()) {
      expect(request.data).toEqual({
        expectedAccountId: "employee-a",
        customerId: "customer-a",
        kind: request.data.kind,
      });
      expect(request.signal).toBeInstanceOf(AbortSignal);
      expect(request.signal.aborted).toBe(false);
    }
    for (const query of shown.client.getQueryCache().getAll()) {
      expect(query.queryKey).toEqual(
        queryKey("employee-a", "customer-a", query.queryKey[4] as CustomerCommercialKind),
      );
      expect(query.options).toMatchObject({
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: "always",
        retry: false,
      });
      expect(query.options.placeholderData).toBeUndefined();
    }
    expect(await screen.findByText("No invoices for this customer yet.")).toBeInTheDocument();
    expect(screen.getByText("No quotes for this customer yet.")).toBeInTheDocument();
  });

  it("retains quote, arbitrary TEXT invoice and workspace links with PHP amounts and status", async () => {
    respond("invoices", snapshot("invoices", "LEGACY-INV-2026/A"));
    respond("quotes", snapshot("quotes", "quote-a"));
    show();
    expect(await screen.findByRole("link", { name: "Invoice LEGACY-INV-2026/A" })).toHaveAttribute(
      "href",
      "/workspace/invoices/LEGACY-INV-2026/A",
    );
    expect(screen.getByRole("link", { name: "Q-quote-a" })).toHaveAttribute(
      "href",
      "/workspace/quotes/quote-a",
    );
    expect(screen.getByRole("link", { name: "Open invoice workspace" })).toHaveAttribute(
      "href",
      "/workspace/invoices",
    );
    expect(screen.getByRole("link", { name: "Open quote workspace" })).toHaveAttribute(
      "href",
      "/workspace/quotes",
    );
    expect(screen.getByText(/₱\s*750\.00/)).toBeInTheDocument();
    expect(screen.getByText(/₱\s*1,000\.00/)).toBeInTheDocument();
    expect(screen.getByText("paid")).toBeInTheDocument();
    expect(screen.getByText("sent")).toBeInTheDocument();
    expect(screen.queryByText(/lifetime|all-time total/i)).not.toBeInTheDocument();
  });

  it("preserves received numeric precision, signs and unknown amounts without converting PHP", async () => {
    respond("invoices", {
      kind: "invoices",
      available: true,
      hasMore: false,
      rows: [
        { ...invoice("fine"), total: 1.234 },
        { ...invoice("tiny"), total: 1e-25 },
        { ...invoice("negative"), total: -12.345 },
        { ...invoice("zero"), total: 0 },
        { ...invoice("unknown"), total: null },
      ],
    });
    respond("quotes", {
      kind: "quotes",
      available: true,
      hasMore: false,
      rows: [{ ...quote(), total_amount: null }],
    });
    show();
    await screen.findByRole("link", { name: "Invoice fine" });
    expect(screen.getByText(/₱\s*1\.234$/)).toBeInTheDocument();
    expect(screen.getByText(/₱\s*1e-25$/)).toBeInTheDocument();
    expect(screen.getByText(/(?:-\s*₱\s*12\.345|₱\s*-12\.345)$/)).toBeInTheDocument();
    expect(screen.getByText(/₱\s*0\.00$/)).toBeInTheDocument();
    expect(screen.getAllByText("Amount not set")).toHaveLength(2);
    expect(screen.queryByText(/USD|\$0\.00/)).not.toBeInTheDocument();
  });

  it("does not reinterpret arbitrary invoice TEXT dates and preserves valid calendar days in a negative UTC offset", async () => {
    vi.stubEnv("TZ", "America/Los_Angeles");
    respond("invoices", {
      kind: "invoices",
      available: true,
      hasMore: false,
      rows: [
        { ...invoice("calendar"), date: "2026-10-15", due_date: "2026-11-15" },
        { ...invoice("legacy"), date: "10/15/2026", due_date: "next Friday" },
        { ...invoice("invalid-day"), date: "2026-02-30", due_date: "2026-13-01" },
        { ...invoice("empty-text"), date: "", due_date: "", created_at: null },
        { ...invoice("year-zero"), date: "0000-01-01", due_date: "0000-12-31" },
        { ...invoice("early-year"), date: "0099-01-02", due_date: null },
      ],
    });
    respond("quotes", {
      kind: "quotes",
      available: true,
      hasMore: false,
      rows: [{ ...quote(), quote_number: null, expiry_date: null }],
    });
    show();
    await screen.findByRole("link", { name: "Invoice calendar" });
    const calendar = within(screen.getByRole("link", { name: "Invoice calendar" }).closest("li")!);
    expect(
      calendar.getByText(/Issued.*(?:10\/15\/2026|15 Oct 2026|Oct 15, 2026)/),
    ).toBeInTheDocument();
    expect(calendar.queryByText(/10\/14\/2026|Oct 14, 2026/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Date format not recognized/)).toHaveLength(4);
    expect(screen.getByRole("link", { name: "Invoice year-zero" }).closest("li")).toHaveTextContent(
      "Issued Date format not recognized · Due Date format not recognized",
    );
    const early = screen.getByRole("link", { name: "Invoice early-year" }).closest("li")!;
    expect(early).toHaveTextContent(/(?:1\/2\/99|2 Jan 99|Jan 2, 99)/);
    expect(early).not.toHaveTextContent("1999");
    expect(screen.getByRole("link", { name: "Quote quote-a" })).toBeInTheDocument();
    expect(screen.getByText(/Expires Date not set/)).toBeInTheDocument();
  });

  for (const kind of kinds) {
    const other = kind === "invoices" ? "quotes" : "invoices";

    it(`renders the 25 returned ${kind} with the server cap flag and never calls them a complete total`, async () => {
      respond(kind, snapshot(kind, "record", { count: 25, hasMore: true }));
      show();
      expect(await screen.findByText(cap[kind])).toBeInTheDocument();
      expect(card(kind).getAllByRole("listitem")).toHaveLength(25);
      expect(
        card(kind).getByRole("link", { name: linkName(kind, "record-24") }),
      ).toBeInTheDocument();
      expect(
        card(kind).queryByRole("link", { name: linkName(kind, "record-25") }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/lifetime|all-time total/i)).not.toBeInTheDocument();
    });

    it(`does not infer a ${kind} cap from 25 rows when hasMore is false`, async () => {
      respond(kind, snapshot(kind, "exact", { count: 25 }));
      show();
      await screen.findByRole("link", { name: linkName(kind, "exact-24") });
      expect(card(kind).getAllByRole("listitem")).toHaveLength(25);
      expect(screen.queryByText(cap[kind])).not.toBeInTheDocument();
    });

    it(`distinguishes unavailable ${kind} from a visible empty result and hides unavailable rows/caps`, async () => {
      // Defensive display control: malformed mock envelope rows are not a claim
      // that the real server accepts available:false with private payload rows.
      respond(kind, snapshot(kind, "hidden-unavailable", { available: false, hasMore: true }));
      show();
      expect(await card(kind).findByText(/unavailable/i)).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: linkName(kind, "hidden-unavailable") }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(cap[kind])).not.toBeInTheDocument();
      expect(screen.queryByText(`No ${kind} for this customer yet.`)).not.toBeInTheDocument();
      expect(screen.getByText(`No ${other} for this customer yet.`)).toBeInTheDocument();
    });

    it(`keeps ${kind} failures generic and retries only that source without hiding the other source`, async () => {
      respond(kind, new Error("PRIVATE backend diagnostic"));
      respond(other, snapshot(other, "independent"));
      show();
      expect(await card(kind).findByRole("alert")).toHaveTextContent(
        `Could not load this customer's ${kind}.`,
      );
      expect(
        screen.getByRole("link", { name: linkName(other, "independent") }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
      expect(screen.queryByText(`No ${kind} for this customer yet.`)).not.toBeInTheDocument();
      respond(kind, snapshot(kind, "recovered"));
      fireEvent.click(screen.getByRole("button", { name: `Retry ${kind}` }));
      expect(
        await screen.findByRole("link", { name: linkName(kind, "recovered") }),
      ).toBeInTheDocument();
      expect(requests(kind)).toHaveLength(2);
      expect(requests(other)).toHaveLength(1);
    });

    it(`masks a matching cached ${kind} body and cap until the current mount fetch finishes`, async () => {
      const pending = deferred();
      respond(kind, pending.promise);
      const shown = show({
        cached: [
          {
            account: "employee-a",
            customer: "customer-a",
            result: snapshot(kind, "stale-cached", { hasMore: true }),
          },
        ],
      });
      expect(
        screen.queryByRole("link", { name: linkName(kind, "stale-cached") }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(cap[kind])).not.toBeInTheDocument();
      expect(card(kind).getByRole("status")).toBeInTheDocument();
      await waitFor(() => expect(requests(kind)).toHaveLength(1));
      expect(shown.client.getQueryData(queryKey("employee-a", "customer-a", kind))).toEqual(
        snapshot(kind, "stale-cached", { hasMore: true }),
      );
      await act(async () => pending.resolve(snapshot(kind, "fresh-current")));
      expect(
        await screen.findByRole("link", { name: linkName(kind, "fresh-current") }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: linkName(kind, "stale-cached") }),
      ).not.toBeInTheDocument();
    });

    it(`hides ${kind} rows and cap immediately during its own refresh, then shows unavailable without touching ${other}`, async () => {
      respond(kind, snapshot(kind, "before-refresh", { hasMore: true }));
      respond(other, snapshot(other, "other-visible", { hasMore: true }));
      show();
      await screen.findByRole("link", { name: linkName(kind, "before-refresh") });
      await screen.findByText(cap[other]);
      const pending = deferred();
      respond(kind, pending.promise);
      fireEvent.click(screen.getByRole("button", { name: `Refresh ${kind}` }));
      expect(
        screen.queryByRole("link", { name: linkName(kind, "before-refresh") }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(cap[kind])).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: linkName(other, "other-visible") }),
      ).toBeInTheDocument();
      expect(screen.getByText(cap[other])).toBeInTheDocument();
      await act(async () =>
        pending.resolve(snapshot(kind, "none", { available: false, count: 0 })),
      );
      expect(await card(kind).findByText(/unavailable/i)).toBeInTheDocument();
      expect(screen.queryByText(`No ${kind} for this customer yet.`)).not.toBeInTheDocument();
      expect(screen.queryByText(cap[kind])).not.toBeInTheDocument();
      expect(requests(kind)).toHaveLength(2);
      expect(requests(other)).toHaveLength(1);
    });

    it(`does not restore old ${kind} rows or cap after a refresh rejection, and retry recovers`, async () => {
      respond(kind, snapshot(kind, "before-error", { hasMore: true }));
      show();
      await screen.findByText(cap[kind]);
      const pending = deferred();
      respond(kind, pending.promise);
      fireEvent.click(screen.getByRole("button", { name: `Refresh ${kind}` }));
      expect(
        screen.queryByRole("link", { name: linkName(kind, "before-error") }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(cap[kind])).not.toBeInTheDocument();
      await act(async () => pending.reject(new Error("PRIVATE refresh failure")));
      expect(await card(kind).findByRole("alert")).toHaveTextContent(
        `Could not load this customer's ${kind}.`,
      );
      expect(
        screen.queryByRole("link", { name: linkName(kind, "before-error") }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(cap[kind])).not.toBeInTheDocument();
      expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
      respond(kind, snapshot(kind, "after-retry"));
      fireEvent.click(screen.getByRole("button", { name: `Retry ${kind}` }));
      expect(
        await screen.findByRole("link", { name: linkName(kind, "after-retry") }),
      ).toBeInTheDocument();
      expect(requests(kind)).toHaveLength(3);
      expect(requests(other)).toHaveLength(1);
    });
  }

  it("aborts old account source signals, resets private UI and ignores late successes after an account switch", async () => {
    const pending = { invoices: deferred(), quotes: deferred() };
    for (const kind of kinds) respond(kind, pending[kind].promise);
    const shown = show();
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(2));
    const old = requests();
    state.userId = "employee-b";
    for (const kind of kinds) respond(kind, snapshot(kind, "new-account"), "employee-b");
    shown.update();
    expect(old.every((request) => request.signal.aborted)).toBe(true);
    for (const kind of kinds)
      await screen.findByRole("link", { name: linkName(kind, "new-account") });
    await act(async () => {
      for (const kind of kinds)
        pending[kind].resolve(snapshot(kind, "late-old-account", { hasMore: true }));
    });
    for (const kind of kinds) {
      expect(
        screen.queryByRole("link", { name: linkName(kind, "late-old-account") }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: linkName(kind, "new-account") })).toBeInTheDocument();
      expect(screen.queryByText(cap[kind])).not.toBeInTheDocument();
    }
    await waitFor(() =>
      expect(
        shown.client
          .getQueryCache()
          .getAll()
          .some((query) => query.queryKey.includes("employee-a")),
      ).toBe(false),
    );
    expect(
      requests()
        .slice(-2)
        .every((request) => request.data.expectedAccountId === "employee-b"),
    ).toBe(true);
  });

  it("aborts previous customer signals and ignores late rejection/success without replacing the new customer's sources", async () => {
    const oldInvoice = deferred();
    const oldQuote = deferred();
    respond("invoices", oldInvoice.promise);
    respond("quotes", oldQuote.promise);
    const shown = show();
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(2));
    const old = requests();
    for (const kind of kinds)
      respond(
        kind,
        snapshot(kind, "new-customer", { customer: "customer-b" }),
        "employee-a",
        "customer-b",
      );
    shown.update("customer-b");
    expect(old.every((request) => request.signal.aborted)).toBe(true);
    for (const kind of kinds)
      await screen.findByRole("link", { name: linkName(kind, "new-customer") });
    await act(async () => {
      oldInvoice.reject(new Error("PRIVATE old-customer failure"));
      oldQuote.resolve(snapshot("quotes", "late-old-customer", { hasMore: true }));
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Q-late-old-customer" })).not.toBeInTheDocument();
    for (const kind of kinds)
      expect(
        screen.getByRole("link", { name: linkName(kind, "new-customer") }),
      ).toBeInTheDocument();
    expect(
      requests()
        .slice(-2)
        .every((request) => request.data.customerId === "customer-b"),
    ).toBe(true);
  });

  it("removes settled account/customer rows immediately on scope changes, requiring each scope's fresh fetch", async () => {
    for (const kind of kinds) respond(kind, snapshot(kind, "old-scope", { hasMore: true }));
    const shown = show();
    for (const kind of kinds)
      await screen.findByRole("link", { name: linkName(kind, "old-scope") });
    const pending = { invoices: deferred(), quotes: deferred() };
    for (const kind of kinds) respond(kind, pending[kind].promise, "employee-b");
    state.userId = "employee-b";
    shown.update();
    for (const kind of kinds) {
      expect(
        screen.queryByRole("link", { name: linkName(kind, "old-scope") }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(cap[kind])).not.toBeInTheDocument();
      expect(card(kind).getByRole("status")).toBeInTheDocument();
    }
    await act(async () => {
      for (const kind of kinds) pending[kind].resolve(snapshot(kind, "new-scope"));
    });
    for (const kind of kinds)
      await screen.findByRole("link", { name: linkName(kind, "new-scope") });
    const customerPending = deferred();
    respond("invoices", customerPending.promise, "employee-b", "customer-b");
    shown.update("customer-b");
    expect(screen.queryByRole("link", { name: "Invoice new-scope" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Q-new-scope" })).not.toBeInTheDocument();
    await act(async () =>
      customerPending.resolve(snapshot("invoices", "fresh-customer", { customer: "customer-b" })),
    );
    expect(await screen.findByRole("link", { name: "Invoice fresh-customer" })).toBeInTheDocument();
  });

  it("unmounts private history and aborts pending sources on signout without displaying late results", async () => {
    const pending = { invoices: deferred(), quotes: deferred() };
    for (const kind of kinds) respond(kind, pending[kind].promise);
    const shown = show();
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(2));
    const old = requests();
    state.userId = null;
    shown.update();
    expect(shown.container).toBeEmptyDOMElement();
    expect(old.every((request) => request.signal.aborted)).toBe(true);
    await act(async () => {
      pending.invoices.resolve(snapshot("invoices", "late-signedout", { hasMore: true }));
      pending.quotes.reject(new Error("PRIVATE signed-out failure"));
    });
    expect(shown.container).toBeEmptyDOMElement();
    expect(state.read).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(shown.client.getQueryCache().getAll()).toHaveLength(0));
    for (const kind of kinds) respond(kind, snapshot(kind, "new-signin"), "employee-b");
    state.userId = "employee-b";
    shown.update();
    for (const kind of kinds)
      await screen.findByRole("link", { name: linkName(kind, "new-signin") });
    expect(screen.queryByText(/PRIVATE|late-signedout/)).not.toBeInTheDocument();
  });
});
