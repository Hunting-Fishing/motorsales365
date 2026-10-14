import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  CustomerCommunication,
  CustomerCommunicationsResult,
} from "@/lib/customer-communications";
import { CustomerCommunicationsLog } from "./customer-communications-log";

type Request = {
  data: { expectedAccountId: string; customerId: string };
  signal: AbortSignal;
};
const accountA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const accountB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const customerA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const customerB = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const state = vi.hoisted(() => ({
  userId: null as string | null,
  responses: {} as Record<string, unknown>,
  read: vi.fn(),
  legacyFrom: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.userId ? { id: state.userId } : null }),
}));
vi.mock("@/lib/customer-communications.functions", () => ({
  getCustomerCommunicationsSnapshot: (request: Request) => state.read(request),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/shop-manager/db", () => ({
  smSupabase: {
    from: (table: string) => {
      state.legacyFrom(table);
      throw new Error("Communications must not use the global browser reader or writer.");
    },
  },
}));
vi.mock("sonner", () => ({ toast: { success: state.toast, error: state.toast } }));

// Complete transport DTO fixtures. The server function is mocked: no actual
// middleware/JWT, HTTP, SQL ordering, RLS, database cancellation or entry mutation
// is exercised. Abort assertions concern React Query's consumed client signals.
function communication(
  marker = "visible",
  index = 0,
  customerId = customerA,
): CustomerCommunication {
  return {
    id: `00000000-0000-4000-8000-${(index + 1).toString(16).padStart(12, "0")}`,
    customer_id: customerId,
    type: "email",
    direction: "outgoing",
    subject: `Subject ${marker}${index === 0 ? "" : ` ${index}`}`,
    content: `Content ${marker}${index === 0 ? "" : ` ${index}`}`,
    date: "2026-10-15T08:00:00Z",
    staff_member_name: "Synthetic staff",
    status: "completed",
  };
}
function snapshot(
  marker = "visible",
  { customer = customerA, count = 1, available = true, hasMore = false } = {},
): CustomerCommunicationsResult {
  return {
    available,
    hasMore,
    rows: Array.from({ length: count }, (_, index) => communication(marker, index, customer)),
  };
}
const capCopy = "Showing the 200 most recent visible communications.";
const emptyCopy = "No visible communications in this snapshot.";
const disabledCopy =
  "New entries are unavailable until staff attribution and entry validation are verified.";
const queryKey = (account = accountA, customer = customerA) =>
  ["shop-manager", account, "customer_communications", customer] as const;
const responseKey = (account: string, customer: string) => `${account}|${customer}`;
function respond(result: unknown, account = accountA, customer = customerA) {
  state.responses[responseKey(account, customer)] = result;
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
  customerId = customerA,
  cached = [] as { account: string; customer: string; result: CustomerCommunicationsResult }[],
} = {}) {
  let customer = customerId;
  // Prove freshness options are local even if the host favors retained caches.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
  });
  clients.add(client);
  for (const entry of cached)
    client.setQueryData(queryKey(entry.account, entry.customer), entry.result);
  const view = () => (
    <QueryClientProvider client={client}>
      <CustomerCommunicationsLog customerId={customer} />
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
function requests() {
  return state.read.mock.calls.map(([request]) => request as Request);
}
function expectCount(count: string) {
  expect(screen.getByText(/Communications \(/)).toHaveTextContent(`Communications (${count})`);
}
beforeEach(() => {
  vi.clearAllMocks();
  state.userId = accountA;
  state.responses = {};
  state.read.mockImplementation(async ({ data }: Request) => {
    const result = state.responses[responseKey(data.expectedAccountId, data.customerId)];
    if (result instanceof Error) throw result;
    return result ?? snapshot("unused", { count: 0, customer: data.customerId });
  });
});
afterEach(() => {
  cleanup();
  for (const client of clients) client.clear();
  clients.clear();
  vi.unstubAllEnvs();
  expect(state.legacyFrom).not.toHaveBeenCalled();
  expect(state.toast).not.toHaveBeenCalled();
});

describe("Customer communications private read snapshots", () => {
  it("creates no private UI, source observer or request while signed out even with a seeded account cache", () => {
    state.userId = null;
    const shown = show({
      cached: [
        {
          account: accountA,
          customer: customerA,
          result: snapshot("signedout-cached", { count: 200, hasMore: true }),
        },
      ],
    });
    expect(shown.container).toBeEmptyDOMElement();
    expect(state.read).not.toHaveBeenCalled();
    expect(shown.client.getQueryCache().getAll()).toHaveLength(1);
    expect(shown.client.getQueryCache().getAll()[0].getObserversCount()).toBe(0);
  });

  it("uses the fixed account/customer request and cache key with consumed signal and local fresh-query options", async () => {
    const shown = show();
    await screen.findByText(emptyCopy);
    expect(state.read).toHaveBeenCalledTimes(1);
    expect(requests()[0].data).toEqual({ expectedAccountId: accountA, customerId: customerA });
    expect(requests()[0].signal).toBeInstanceOf(AbortSignal);
    expect(requests()[0].signal.aborted).toBe(false);
    const queries = shown.client.getQueryCache().getAll();
    expect(queries).toHaveLength(1);
    expect(queries[0].queryKey).toEqual(queryKey());
    expect(queries[0].options).toMatchObject({
      staleTime: 0,
      gcTime: 0,
      refetchOnMount: "always",
      retry: false,
    });
    expect(Reflect.get(queries[0].options, "placeholderData")).toBeUndefined();
    expectCount("0");
  });

  it("renders actual native type/direction/status values, corresponding icons, staff and nullable subjects", async () => {
    vi.stubEnv("TZ", "UTC");
    const types = ["email", "phone", "text", "in-person"] as const;
    const statuses = ["completed", "pending", "failed", "completed"] as const;
    const icons = ["mail", "phone", "message-square", "users"];
    respond({
      available: true,
      hasMore: false,
      rows: types.map((type, index) => ({
        ...communication(type, index),
        type,
        status: statuses[index],
        direction: index % 2 === 0 ? "incoming" : "outgoing",
        subject: index === 3 ? null : `Subject ${type}`,
      })),
    });
    show();
    await screen.findByText("Content email");
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(4);
    for (const [index, item] of items.entries()) {
      const row = within(item);
      expect(row.getByText(types[index])).toBeInTheDocument();
      expect(row.getByText(index % 2 === 0 ? "incoming" : "outgoing")).toBeInTheDocument();
      expect(row.getByText(statuses[index])).toBeInTheDocument();
      expect(item.querySelector(`.lucide-${icons[index]}`)).not.toBeNull();
      expect(item).toHaveTextContent("Recorded staff label: Synthetic staff");
      expect(item.querySelector("time")).toHaveAttribute("datetime", "2026-10-15T08:00:00Z");
      expect(item).toHaveTextContent(new Date("2026-10-15T08:00:00Z").toLocaleString("en-PH"));
    }
    expect(within(items[3]).queryByText(/^Subject /)).not.toBeInTheDocument();
    expect(screen.queryByText(/^(call|sms|note|inbound|outbound|logged)$/)).not.toBeInTheDocument();
    expectCount("4");
  });

  it("preserves literal content without interpreting markup or inventing a verified staff identity", async () => {
    const content = '<img src=x onerror="private()">\nFollow-up recorded';
    respond({
      available: true,
      hasMore: false,
      rows: [
        {
          ...communication("literal"),
          subject: null,
          content,
          staff_member_name: "",
        },
      ],
    });
    show();
    expect(await screen.findByText("Recorded staff label: Not provided")).toBeInTheDocument();
    const item = screen.getByRole("listitem");
    expect(item.textContent).toContain(content);
    expect(item.querySelector("img")).toBeNull();
    expect(within(item).queryByText(/^Subject /)).not.toBeInTheDocument();
    expect(screen.queryByText(/verified staff|by Synthetic staff/i)).not.toBeInTheDocument();
    expectCount("1");
  });

  it("keeps logging unavailable with explicit explanation and no insertion form or mutation controls", async () => {
    show();
    await screen.findByText(emptyCopy);
    const entry = screen.getByRole("button", { name: "Log entry" });
    expect(entry).toBeDisabled();
    expect(screen.getByText(disabledCopy)).toBeInTheDocument();
    fireEvent.click(entry);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Save entry|Cancel|Send|Delete/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("What happened?")).not.toBeInTheDocument();
    expect(state.read).toHaveBeenCalledTimes(1);
  });

  it("shows the 200 returned records with a 200+ count and explicit cap, without inventing a total or rendering a sentinel", async () => {
    respond(snapshot("capped", { count: 200, hasMore: true }));
    show();
    expect(await screen.findByText(capCopy)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(200);
    expect(screen.getByText("Content capped 199")).toBeInTheDocument();
    expect(screen.queryByText("Content capped 200")).not.toBeInTheDocument();
    expectCount("200+");
    expect(screen.queryByText(/lifetime|all-time total/i)).not.toBeInTheDocument();
  });

  it("does not infer an overflow cap from exactly 200 records when hasMore is false", async () => {
    respond(snapshot("exact", { count: 200 }));
    show();
    await screen.findByText("Content exact 199");
    expect(screen.getAllByRole("listitem")).toHaveLength(200);
    expectCount("200");
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
  });

  it("distinguishes unavailable context from a fresh visible empty history and hides defensive unavailable rows/count/cap", async () => {
    // Deliberately defensive display fixture, not a server-validation assertion.
    respond(snapshot("unavailable-private", { available: false, count: 200, hasMore: true }));
    const shown = show();
    expect(await screen.findByText(/Communications unavailable/i)).toBeInTheDocument();
    expectCount("—");
    expect(screen.queryByText("Content unavailable-private")).not.toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
    expect(screen.queryByText(emptyCopy)).not.toBeInTheDocument();
    respond(snapshot("empty", { count: 0 }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh communications" }));
    expect(await screen.findByText(emptyCopy)).toBeInTheDocument();
    expectCount("0");
    expect(shown.client.getQueryCache().getAll()).toHaveLength(1);
  });

  it("sanitizes a failed initial read, never calls it empty and retries only by the same scoped reader", async () => {
    respond(new Error("PRIVATE customer/staff database diagnostic"));
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load communications.");
    expectCount("—");
    expect(screen.queryByText(emptyCopy)).not.toBeInTheDocument();
    expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
    expect(state.read).toHaveBeenCalledTimes(1);
    respond(snapshot("recovered"));
    fireEvent.click(screen.getByRole("button", { name: "Retry communications" }));
    expect(await screen.findByText("Content recovered")).toBeInTheDocument();
    expectCount("1");
    expect(state.read).toHaveBeenCalledTimes(2);
    expect(
      requests().every(
        (request) =>
          request.data.expectedAccountId === accountA && request.data.customerId === customerA,
      ),
    ).toBe(true);
  });

  it("masks matching seeded rows, count and cap until a fresh mount result replaces them", async () => {
    const pending = deferred();
    respond(pending.promise);
    const seeded = snapshot("cached-private", { count: 200, hasMore: true });
    const shown = show({ cached: [{ account: accountA, customer: customerA, result: seeded }] });
    expect(screen.queryByText("Content cached-private")).not.toBeInTheDocument();
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
    expectCount("—");
    expect(screen.getByRole("status")).toBeInTheDocument();
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
    expect(shown.client.getQueryData(queryKey())).toEqual(seeded);
    await act(async () => pending.resolve(snapshot("fresh-current")));
    expect(await screen.findByText("Content fresh-current")).toBeInTheDocument();
    expectCount("1");
    expect(screen.queryByText("Content cached-private")).not.toBeInTheDocument();
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
  });

  it("does not restore seeded private rows or count when the mount revalidation rejects", async () => {
    const pending = deferred();
    respond(pending.promise);
    show({
      cached: [
        {
          account: accountA,
          customer: customerA,
          result: snapshot("cached-error", { count: 200, hasMore: true }),
        },
      ],
    });
    expect(screen.queryByText("Content cached-error")).not.toBeInTheDocument();
    expectCount("—");
    await act(async () => pending.reject(new Error("PRIVATE cache revalidation failure")));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load communications.");
    expectCount("—");
    expect(screen.queryByText("Content cached-error")).not.toBeInTheDocument();
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
    expect(screen.queryByText(emptyCopy)).not.toBeInTheDocument();
    expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
  });

  it("hides rows, count and cap immediately on refresh, then shows unavailable rather than stale or empty content", async () => {
    respond(snapshot("before-refresh", { count: 200, hasMore: true }));
    show();
    await screen.findByText(capCopy);
    const pending = deferred();
    respond(pending.promise);
    fireEvent.click(screen.getByRole("button", { name: "Refresh communications" }));
    expect(screen.queryByText("Content before-refresh")).not.toBeInTheDocument();
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
    expectCount("—");
    expect(screen.getByRole("status")).toBeInTheDocument();
    await act(async () => pending.resolve(snapshot("none", { available: false, count: 0 })));
    expect(await screen.findByText(/Communications unavailable/i)).toBeInTheDocument();
    expectCount("—");
    expect(screen.queryByText(emptyCopy)).not.toBeInTheDocument();
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
    expect(state.read).toHaveBeenCalledTimes(2);
  });

  it("hides refreshed rows/count/cap after failure and restores only the next successful scoped retry", async () => {
    respond(snapshot("before-error", { count: 200, hasMore: true }));
    show();
    await screen.findByText(capCopy);
    const pending = deferred();
    respond(pending.promise);
    fireEvent.click(screen.getByRole("button", { name: "Refresh communications" }));
    expect(screen.queryByText("Content before-error")).not.toBeInTheDocument();
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
    expectCount("—");
    await act(async () => pending.reject(new Error("PRIVATE refresh diagnostic")));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load communications.");
    expectCount("—");
    expect(screen.queryByText("Content before-error")).not.toBeInTheDocument();
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
    expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
    respond(snapshot("after-retry"));
    fireEvent.click(screen.getByRole("button", { name: "Retry communications" }));
    expect(await screen.findByText("Content after-retry")).toBeInTheDocument();
    expectCount("1");
    expect(state.read).toHaveBeenCalledTimes(3);
  });

  it("also masks private rows and count during automatic query invalidation without a refresh-button click", async () => {
    respond(snapshot("before-invalidation"));
    const shown = show();
    await screen.findByText("Content before-invalidation");
    const pending = deferred();
    respond(pending.promise);
    await act(async () => {
      void shown.client.invalidateQueries({ queryKey: queryKey() });
    });
    await waitFor(() =>
      expect(screen.queryByText("Content before-invalidation")).not.toBeInTheDocument(),
    );
    expectCount("—");
    await act(async () => pending.resolve(snapshot("after-invalidation")));
    expect(await screen.findByText("Content after-invalidation")).toBeInTheDocument();
    expectCount("1");
    expect(state.read).toHaveBeenCalledTimes(2);
  });

  it("immediately removes settled private rows and counts on account/customer switches and discards zero-retention old caches", async () => {
    respond(snapshot("old-account"));
    const shown = show();
    await screen.findByText("Content old-account");
    const accountPending = deferred();
    respond(accountPending.promise, accountB);
    state.userId = accountB;
    shown.update();
    expect(screen.queryByText("Content old-account")).not.toBeInTheDocument();
    expectCount("—");
    await waitFor(() =>
      expect(
        shown.client.getQueryCache().find({ queryKey: queryKey(accountA), exact: true }),
      ).toBeUndefined(),
    );
    await act(async () => accountPending.resolve(snapshot("new-account")));
    await screen.findByText("Content new-account");
    const customerPending = deferred();
    respond(customerPending.promise, accountB, customerB);
    shown.update(customerB);
    expect(screen.queryByText("Content new-account")).not.toBeInTheDocument();
    expectCount("—");
    await waitFor(() =>
      expect(
        shown.client.getQueryCache().find({ queryKey: queryKey(accountB), exact: true }),
      ).toBeUndefined(),
    );
    await act(async () =>
      customerPending.resolve(snapshot("new-customer", { customer: customerB })),
    );
    expect(await screen.findByText("Content new-customer")).toBeInTheDocument();
    expectCount("1");
    expect(requests().at(-1)?.data).toEqual({ expectedAccountId: accountB, customerId: customerB });
  });

  it("aborts a pending old-account signal and ignores its late success after the new account is visible", async () => {
    const pending = deferred();
    respond(pending.promise);
    const shown = show();
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
    const oldSignal = requests()[0].signal;
    state.userId = accountB;
    respond(snapshot("current-account"), accountB);
    shown.update();
    expect(oldSignal.aborted).toBe(true);
    await screen.findByText("Content current-account");
    await act(async () =>
      pending.resolve(snapshot("late-old-account", { count: 200, hasMore: true })),
    );
    expect(screen.queryByText("Content late-old-account")).not.toBeInTheDocument();
    expect(screen.getByText("Content current-account")).toBeInTheDocument();
    expectCount("1");
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
  });

  it("aborts a pending old-customer signal and ignores a late rejection without hiding the current customer's result", async () => {
    const pending = deferred();
    respond(pending.promise);
    const shown = show();
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
    const oldSignal = requests()[0].signal;
    respond(snapshot("current-customer", { customer: customerB }), accountA, customerB);
    shown.update(customerB);
    expect(oldSignal.aborted).toBe(true);
    await screen.findByText("Content current-customer");
    await act(async () => pending.reject(new Error("PRIVATE old customer failure")));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
    expect(screen.getByText("Content current-customer")).toBeInTheDocument();
    expectCount("1");
  });

  it("unmounts private content and aborts pending reads on signout without accepting late results", async () => {
    const pending = deferred();
    respond(pending.promise);
    const shown = show();
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
    const oldSignal = requests()[0].signal;
    state.userId = null;
    shown.update();
    expect(shown.container).toBeEmptyDOMElement();
    expect(oldSignal.aborted).toBe(true);
    await act(async () =>
      pending.resolve(snapshot("late-signedout", { count: 200, hasMore: true })),
    );
    expect(shown.container).toBeEmptyDOMElement();
    expect(state.read).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(shown.client.getQueryCache().getAll()).toHaveLength(0));
    respond(snapshot("signed-in-again"), accountB);
    state.userId = accountB;
    shown.update();
    expect(await screen.findByText("Content signed-in-again")).toBeInTheDocument();
    expect(screen.queryByText("Content late-signedout")).not.toBeInTheDocument();
    expectCount("1");
  });

  it("requires a new fetch on an A-to-B-to-A account cycle and rejects the first A response even after returning to A", async () => {
    const firstA = deferred();
    respond(firstA.promise);
    const shown = show();
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
    state.userId = accountB;
    respond(snapshot("account-b"), accountB);
    shown.update();
    await screen.findByText("Content account-b");
    const nextA = deferred();
    respond(nextA.promise);
    state.userId = accountA;
    shown.update();
    expect(screen.queryByText("Content account-b")).not.toBeInTheDocument();
    expectCount("—");
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(3));
    expect(requests()[0].signal.aborted).toBe(true);
    await act(async () =>
      firstA.resolve(snapshot("obsolete-first-a", { count: 200, hasMore: true })),
    );
    expect(screen.queryByText("Content obsolete-first-a")).not.toBeInTheDocument();
    expectCount("—");
    await act(async () => nextA.resolve(snapshot("fresh-second-a")));
    expect(await screen.findByText("Content fresh-second-a")).toBeInTheDocument();
    expectCount("1");
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
  });
});
