import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CustomerReminder, CustomerRemindersResult } from "@/lib/customer-reminders";
import { CustomerRemindersCard } from "./customer-reminders-card";

type Request = {
  data: { expectedAccountId: string; customerId: string };
  signal: AbortSignal;
};
const accountA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const accountB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const customerA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const customerB = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const shopA = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const state = vi.hoisted(() => ({
  userId: null as string | null,
  responses: {} as Record<string, unknown>,
  read: vi.fn(),
  legacyFrom: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.userId ? { id: state.userId } : null }),
}));
vi.mock("@/lib/customer-reminders.functions", () => ({
  getCustomerRemindersSnapshot: (request: Request) => state.read(request),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/shop-manager/db", () => ({
  smSupabase: {
    from: (table: string) => {
      state.legacyFrom(table);
      throw new Error("Reminders must not use the global browser reader or writer.");
    },
  },
}));
vi.mock("sonner", () => ({ toast: { success: state.toast, error: state.toast } }));

// Complete transport DTO fixtures; the server function is mocked. These tests
// exercise React Query/UI only, not JWT/middleware/HTTP, SQL sorting, native RLS,
// database cancellation, provenance, target integrity or any reminder mutation.
function reminder(marker = "visible", index = 0, customerId = customerA): CustomerReminder {
  return {
    id: `00000000-0000-4000-8000-${(index + 1).toString(16).padStart(12, "0")}`,
    customer_id: customerId,
    shop_id: shopA,
    reminder_type: "follow_up",
    title: `Reminder ${marker}${index === 0 ? "" : ` ${index}`}`,
    notes: `Notes ${marker}${index === 0 ? "" : ` ${index}`}`,
    due_date: "2026-10-15",
    status: "pending",
    completed_at: null,
  };
}
function snapshot(
  marker = "visible",
  { customer = customerA, count = 1, available = true, hasMore = false } = {},
): CustomerRemindersResult {
  return {
    available,
    hasMore,
    rows: Array.from({ length: count }, (_, index) => reminder(marker, index, customer)),
  };
}
const capCopy = "Showing the 100 earliest-due visible reminders.";
const emptyCopy = "No visible reminders in this snapshot.";
const scopeCopy =
  "Earliest due dates first; includes all stored statuses. This snapshot is not a complete task queue.";
const disabledCopy =
  "Reminder changes are unavailable until shop attribution, target consistency and affected-row confirmation are verified.";
const queryKey = (account = accountA, customer = customerA) =>
  ["shop-manager", account, "customer_reminders", customer] as const;
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
  cached = [] as { account: string; customer: string; result: CustomerRemindersResult }[],
} = {}) {
  let customer = customerId;
  // The component must override cache-friendly host defaults itself.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
  });
  clients.add(client);
  for (const entry of cached)
    client.setQueryData(queryKey(entry.account, entry.customer), entry.result);
  const view = () => (
    <QueryClientProvider client={client}>
      <CustomerRemindersCard customerId={customer} />
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
  expect(screen.getByRole("heading", { name: /Reminders & Follow-ups/ })).toHaveTextContent(
    `Reminders & Follow-ups (${count})`,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  state.userId = accountA;
  state.responses = {};
  vi.stubGlobal("confirm", state.confirm);
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
  vi.unstubAllGlobals();
  expect(state.legacyFrom).not.toHaveBeenCalled();
  expect(state.toast).not.toHaveBeenCalled();
  expect(state.confirm).not.toHaveBeenCalled();
});

describe("Customer reminders private read snapshots", () => {
  it("creates no private UI, observer or request while signed out even when scoped reminders are cached", () => {
    state.userId = null;
    const shown = show({
      cached: [
        {
          account: accountA,
          customer: customerA,
          result: snapshot("signedout-cache", { count: 100, hasMore: true }),
        },
      ],
    });
    expect(shown.container).toBeEmptyDOMElement();
    expect(state.read).not.toHaveBeenCalled();
    expect(shown.client.getQueryCache().getAll()).toHaveLength(1);
    expect(shown.client.getQueryCache().getAll()[0].getObserversCount()).toBe(0);
  });

  it("uses only the exact account/customer request, scoped key, consumed signal and explicit local freshness options", async () => {
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

  it("preserves all stored statuses and received order instead of treating the snapshot as a complete active task queue", async () => {
    const rows = [
      {
        ...reminder("old-completed"),
        due_date: "2000-01-02",
        status: "completed",
        reminder_type: "legacy_review",
        completed_at: "2026-10-15T08:00:00Z",
      },
      {
        ...reminder("pending", 1),
        due_date: "2026-10-15",
        status: "pending",
        reminder_type: "follow_up",
      },
      {
        ...reminder("custom", 2),
        due_date: "2026-12-15",
        status: "paused_for_owner",
        reminder_type: "unlisted_native_type",
      },
    ];
    respond({ available: true, hasMore: false, rows });
    show();
    await screen.findByText("Reminder old-completed");
    expect(screen.getByText(scopeCopy)).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Customer reminder records" });
    const items = within(list).getAllByRole("listitem");
    expect(items.map((item) => within(item).getByText(/^Reminder /).textContent)).toEqual(
      rows.map((row) => row.title),
    );
    expect(within(items[0]).getByText("completed")).toBeInTheDocument();
    expect(within(items[1]).getByText("pending")).toBeInTheDocument();
    expect(within(items[2]).getByText("paused_for_owner")).toBeInTheDocument();
    expect(within(items[2]).getByText("unlisted native type")).toBeInTheDocument();
    expect(screen.queryByText(/^(Overdue|Today|Done)$/i)).not.toBeInTheDocument();
    expectCount("3");
  });

  it("renders empty native title/type/status fallbacks and nullable notes without inventing statuses or completion", async () => {
    respond({
      available: true,
      hasMore: false,
      rows: [{ ...reminder("empty"), title: "", reminder_type: "", status: "", notes: null }],
    });
    show();
    await screen.findByRole("listitem");
    expect(screen.getByText("Untitled reminder")).toBeInTheDocument();
    expect(screen.getByText("Type not set")).toBeInTheDocument();
    expect(screen.getByText("Status not set")).toBeInTheDocument();
    expect(screen.queryByText("Notes empty")).not.toBeInTheDocument();
    expect(screen.queryByText(/Recorded completion time/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^(pending|completed|Done)$/)).not.toBeInTheDocument();
    expectCount("1");
  });

  it("preserves literal notes and titles as text rather than interpreting markup", async () => {
    const notes = '<img src=x onerror="private()">\nRecorded note';
    const title = "<script>not-an-entry-action()</script>";
    respond({ available: true, hasMore: false, rows: [{ ...reminder("literal"), title, notes }] });
    show();
    expect(await screen.findByText(title)).toBeInTheDocument();
    const item = screen.getByRole("listitem");
    expect(item.textContent).toContain(notes);
    expect(item.querySelector("img,script")).toBeNull();
  });

  it("displays calendar due dates in UTC without timezone day shifts or a year0-99 remapping", async () => {
    vi.stubEnv("TZ", "America/Los_Angeles");
    respond({
      available: true,
      hasMore: false,
      rows: [
        { ...reminder("calendar"), due_date: "2026-10-15" },
        { ...reminder("early-year", 1), due_date: "0099-01-02" },
      ],
    });
    show();
    await screen.findByText("Reminder calendar");
    const calendar = screen.getByText("Reminder calendar").closest("li")!;
    expect(calendar).toHaveTextContent("Due Oct 15, 2026");
    expect(calendar.querySelector("time")).toHaveAttribute("datetime", "2026-10-15");
    expect(calendar).not.toHaveTextContent("Oct 14, 2026");
    const early = screen.getByText("Reminder early-year 1").closest("li")!;
    expect(early).toHaveTextContent("Due Jan 2, 99");
    expect(early).not.toHaveTextContent("1999");
    expect(screen.queryByText(/Overdue|due today/i)).not.toBeInTheDocument();
  });

  it("shows nullable completion as a recorded timestamp independently of status without claiming a verified human action", async () => {
    const completedAt = "2026-10-15T21:14:13-05:00";
    respond({
      available: true,
      hasMore: false,
      rows: [
        { ...reminder("recorded-time"), status: "pending", completed_at: completedAt },
        { ...reminder("no-time", 1), status: "completed", completed_at: null },
      ],
    });
    show();
    await screen.findByText("Reminder recorded-time");
    const recorded = screen.getByText("Reminder recorded-time").closest("li")!;
    expect(recorded).toHaveTextContent("pending");
    expect(recorded).toHaveTextContent("Recorded completion time");
    expect(recorded).toHaveTextContent(new Date(completedAt).toLocaleString("en-PH"));
    expect(recorded.querySelector("time[datetime='2026-10-15T21:14:13-05:00']")).not.toBeNull();
    const noTime = screen.getByText("Reminder no-time 1").closest("li")!;
    expect(noTime).toHaveTextContent("completed");
    expect(noTime).not.toHaveTextContent("Recorded completion time");
    expect(
      screen.queryByText(/verified completion|completed by|notification sent/i),
    ).not.toBeInTheDocument();
  });

  it("keeps all reminder changes disabled with an explicit explanation and no forms/complete/delete/confirm paths", async () => {
    respond(snapshot("read-only"));
    show();
    await screen.findByText("Reminder read-only");
    const create = screen.getByRole("button", { name: "New reminder" });
    expect(create).toBeDisabled();
    expect(screen.getByText(disabledCopy)).toBeInTheDocument();
    fireEvent.click(create);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /^(Add|Create|Save|Delete|Complete|Mark done|Cancel)\b/i,
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTitle("Mark done")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Refresh reminders",
      "New reminder",
    ]);
    expect(state.read).toHaveBeenCalledTimes(1);
  });

  it("labels a100-row earliest-due subset with100+ and the server cap flag, without rendering an overflow sentinel", async () => {
    respond(snapshot("capped", { count: 100, hasMore: true }));
    show();
    expect(await screen.findByText(capCopy)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(100);
    expect(screen.getByText("Reminder capped 99")).toBeInTheDocument();
    expect(screen.queryByText("Reminder capped 100")).not.toBeInTheDocument();
    expectCount("100+");
    expect(screen.getByText(scopeCopy)).toBeInTheDocument();
  });

  it("does not infer a cap from exactly100 returned rows when hasMore is false", async () => {
    respond(snapshot("exact", { count: 100 }));
    show();
    await screen.findByText("Reminder exact 99");
    expect(screen.getAllByRole("listitem")).toHaveLength(100);
    expectCount("100");
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
  });

  it("distinguishes unavailable from a fresh visible empty result, masking any defensive unavailable rows/count/cap", async () => {
    // Deliberately defensive UI envelope; real server validation is not tested.
    respond(snapshot("unavailable-private", { available: false, count: 100, hasMore: true }));
    show();
    expect(
      await screen.findByText("Reminders unavailable for this customer in the current session."),
    ).toBeInTheDocument();
    expectCount("—");
    expect(screen.queryByText("Reminder unavailable-private")).not.toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
    expect(screen.queryByText(emptyCopy)).not.toBeInTheDocument();
    respond(snapshot("empty", { count: 0 }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh reminders" }));
    expect(await screen.findByText(emptyCopy)).toBeInTheDocument();
    expectCount("0");
  });

  it("sanitizes initial errors without claiming zero reminders and retries only the scoped reader", async () => {
    respond(new Error("PRIVATE reminder/customer diagnostics"));
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load reminders.");
    expectCount("—");
    expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
    expect(screen.queryByText(emptyCopy)).not.toBeInTheDocument();
    expect(state.read).toHaveBeenCalledTimes(1);
    respond(snapshot("recovered"));
    fireEvent.click(screen.getByRole("button", { name: "Retry reminders" }));
    expect(await screen.findByText("Reminder recovered")).toBeInTheDocument();
    expectCount("1");
    expect(state.read).toHaveBeenCalledTimes(2);
    expect(
      requests().every(
        (request) =>
          request.data.expectedAccountId === accountA && request.data.customerId === customerA,
      ),
    ).toBe(true);
  });

  it("masks a matching cache's private rows/count/cap through mount revalidation until current data arrives", async () => {
    const pending = deferred();
    respond(pending.promise);
    const seeded = snapshot("cached-private", { count: 100, hasMore: true });
    const shown = show({ cached: [{ account: accountA, customer: customerA, result: seeded }] });
    expect(screen.queryByText("Reminder cached-private")).not.toBeInTheDocument();
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
    expectCount("—");
    expect(screen.getByRole("status")).toHaveTextContent("Loading reminders…");
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
    expect(shown.client.getQueryData(queryKey())).toEqual(seeded);
    await act(async () => pending.resolve(snapshot("fresh-current")));
    expect(await screen.findByText("Reminder fresh-current")).toBeInTheDocument();
    expectCount("1");
    expect(screen.queryByText("Reminder cached-private")).not.toBeInTheDocument();
  });

  it("does not restore matching cached reminders/count/cap when mount revalidation fails", async () => {
    const pending = deferred();
    respond(pending.promise);
    show({
      cached: [
        {
          account: accountA,
          customer: customerA,
          result: snapshot("cached-error", { count: 100, hasMore: true }),
        },
      ],
    });
    expect(screen.queryByText("Reminder cached-error")).not.toBeInTheDocument();
    expectCount("—");
    await act(async () => pending.reject(new Error("PRIVATE stale-cache failure")));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load reminders.");
    expectCount("—");
    expect(screen.queryByText("Reminder cached-error")).not.toBeInTheDocument();
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
    expect(screen.queryByText(emptyCopy)).not.toBeInTheDocument();
    expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
  });

  it("immediately masks old rows/count/cap on refresh and shows renewed unavailability rather than stale or empty data", async () => {
    respond(snapshot("before-refresh", { count: 100, hasMore: true }));
    show();
    await screen.findByText(capCopy);
    const pending = deferred();
    respond(pending.promise);
    fireEvent.click(screen.getByRole("button", { name: "Refresh reminders" }));
    expect(screen.queryByText("Reminder before-refresh")).not.toBeInTheDocument();
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
    expectCount("—");
    await act(async () => pending.resolve(snapshot("none", { available: false, count: 0 })));
    expect(
      await screen.findByText("Reminders unavailable for this customer in the current session."),
    ).toBeInTheDocument();
    expectCount("—");
    expect(screen.queryByText(emptyCopy)).not.toBeInTheDocument();
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
    expect(state.read).toHaveBeenCalledTimes(2);
  });

  it("keeps failed refresh rows/count/cap hidden and recovers only from a successful scoped retry", async () => {
    respond(snapshot("before-error", { count: 100, hasMore: true }));
    show();
    await screen.findByText(capCopy);
    const pending = deferred();
    respond(pending.promise);
    fireEvent.click(screen.getByRole("button", { name: "Refresh reminders" }));
    expectCount("—");
    expect(screen.queryByText("Reminder before-error")).not.toBeInTheDocument();
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
    await act(async () => pending.reject(new Error("PRIVATE refresh failure")));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load reminders.");
    expectCount("—");
    expect(screen.queryByText("Reminder before-error")).not.toBeInTheDocument();
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
    expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
    respond(snapshot("after-retry"));
    fireEvent.click(screen.getByRole("button", { name: "Retry reminders" }));
    expect(await screen.findByText("Reminder after-retry")).toBeInTheDocument();
    expectCount("1");
    expect(state.read).toHaveBeenCalledTimes(3);
  });

  it("also masks private rows/count during automatic invalidation without a refresh-button click", async () => {
    respond(snapshot("before-invalidation"));
    const shown = show();
    await screen.findByText("Reminder before-invalidation");
    const pending = deferred();
    respond(pending.promise);
    await act(async () => {
      void shown.client.invalidateQueries({ queryKey: queryKey() });
    });
    await waitFor(() =>
      expect(screen.queryByText("Reminder before-invalidation")).not.toBeInTheDocument(),
    );
    expectCount("—");
    await act(async () => pending.resolve(snapshot("after-invalidation")));
    expect(await screen.findByText("Reminder after-invalidation")).toBeInTheDocument();
    expectCount("1");
  });

  it("removes settled rows/counts immediately on account/customer switches and discards zero-retention old caches", async () => {
    respond(snapshot("old-account"));
    const shown = show();
    await screen.findByText("Reminder old-account");
    const accountPending = deferred();
    respond(accountPending.promise, accountB);
    state.userId = accountB;
    shown.update();
    expect(screen.queryByText("Reminder old-account")).not.toBeInTheDocument();
    expectCount("—");
    await waitFor(() =>
      expect(
        shown.client.getQueryCache().find({ queryKey: queryKey(accountA), exact: true }),
      ).toBeUndefined(),
    );
    await act(async () => accountPending.resolve(snapshot("new-account")));
    await screen.findByText("Reminder new-account");
    const customerPending = deferred();
    respond(customerPending.promise, accountB, customerB);
    shown.update(customerB);
    expect(screen.queryByText("Reminder new-account")).not.toBeInTheDocument();
    expectCount("—");
    await waitFor(() =>
      expect(
        shown.client.getQueryCache().find({ queryKey: queryKey(accountB), exact: true }),
      ).toBeUndefined(),
    );
    await act(async () =>
      customerPending.resolve(snapshot("new-customer", { customer: customerB })),
    );
    expect(await screen.findByText("Reminder new-customer")).toBeInTheDocument();
    expectCount("1");
    expect(requests().at(-1)?.data).toEqual({ expectedAccountId: accountB, customerId: customerB });
  });

  it("aborts a pending old-account read and ignores its late success after the current account is displayed", async () => {
    const pending = deferred();
    respond(pending.promise);
    const shown = show();
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
    const oldSignal = requests()[0].signal;
    state.userId = accountB;
    respond(snapshot("current-account"), accountB);
    shown.update();
    expect(oldSignal.aborted).toBe(true);
    await screen.findByText("Reminder current-account");
    await act(async () =>
      pending.resolve(snapshot("late-old-account", { count: 100, hasMore: true })),
    );
    expect(screen.queryByText("Reminder late-old-account")).not.toBeInTheDocument();
    expect(screen.getByText("Reminder current-account")).toBeInTheDocument();
    expectCount("1");
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
  });

  it("aborts a previous customer's read and ignores late rejection without hiding current-customer reminders", async () => {
    const pending = deferred();
    respond(pending.promise);
    const shown = show();
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
    const oldSignal = requests()[0].signal;
    respond(snapshot("current-customer", { customer: customerB }), accountA, customerB);
    shown.update(customerB);
    expect(oldSignal.aborted).toBe(true);
    await screen.findByText("Reminder current-customer");
    await act(async () => pending.reject(new Error("PRIVATE old customer failure")));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
    expect(screen.getByText("Reminder current-customer")).toBeInTheDocument();
    expectCount("1");
  });

  it("unmounts private reminders and aborts pending reads on signout without displaying late results", async () => {
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
      pending.resolve(snapshot("late-signedout", { count: 100, hasMore: true })),
    );
    expect(shown.container).toBeEmptyDOMElement();
    expect(state.read).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(shown.client.getQueryCache().getAll()).toHaveLength(0));
    respond(snapshot("signed-in-again"), accountB);
    state.userId = accountB;
    shown.update();
    expect(await screen.findByText("Reminder signed-in-again")).toBeInTheDocument();
    expect(screen.queryByText("Reminder late-signedout")).not.toBeInTheDocument();
    expectCount("1");
  });

  it("requires a new fetch on A-to-B-to-A and never reuses the first A response after returning to that account", async () => {
    const firstA = deferred();
    respond(firstA.promise);
    const shown = show();
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
    state.userId = accountB;
    respond(snapshot("account-b"), accountB);
    shown.update();
    await screen.findByText("Reminder account-b");
    const secondA = deferred();
    respond(secondA.promise);
    state.userId = accountA;
    shown.update();
    expect(screen.queryByText("Reminder account-b")).not.toBeInTheDocument();
    expectCount("—");
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(3));
    expect(requests()[0].signal.aborted).toBe(true);
    await act(async () =>
      firstA.resolve(snapshot("obsolete-first-a", { count: 100, hasMore: true })),
    );
    expect(screen.queryByText("Reminder obsolete-first-a")).not.toBeInTheDocument();
    expectCount("—");
    await act(async () => secondA.resolve(snapshot("fresh-second-a")));
    expect(await screen.findByText("Reminder fresh-second-a")).toBeInTheDocument();
    expectCount("1");
    expect(screen.queryByText(capCopy)).not.toBeInTheDocument();
  });
});
