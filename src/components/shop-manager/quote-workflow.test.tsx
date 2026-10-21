// Actual review/recovery UI with authenticated server doubles, not live HTTP/RLS.
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QuoteWorkflowPanel, QuoteWorkflowControl } from "./quote-workflow";
import {
  makeQuoteRequest,
  saveQuoteRequest,
  quoteStorageKey,
  type QuoteView,
  type QuoteRequest,
} from "@/lib/quote-workflow";
const state = vi.hoisted(() => ({
  account: "10000000-0000-4000-8000-000000000001" as string | null,
  loading: false,
  read: vi.fn(),
  change: vi.fn(),
  inspect: vi.fn(),
  changed: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.account ? { id: state.account } : null, loading: state.loading }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/quote-workflow.functions", () => ({
  readQuoteWorkflow: (...args: unknown[]) => state.read(...args),
  changeQuoteWorkflow: (...args: unknown[]) => state.change(...args),
  inspectQuoteWorkflow: (...args: unknown[]) => state.inspect(...args),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: React.PropsWithChildren<{ to: string; params: { id: string } }>) => (
    <a {...props} href={to.replace("$id", params.id)}>
      {children}
    </a>
  ),
}));
const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const view = (patch: Partial<QuoteView> = {}): QuoteView => ({
  version: 1,
  accountId: id(1),
  shopId: id(2),
  quoteId: id(3),
  profileId: id(1),
  profileUpdatedAt: "2026-01-01 00:00:00.123456+00",
  updatedAt: "2026-01-02 00:00:00.654321+00",
  fingerprint: "a".repeat(64),
  quoteNumber: "Q-1",
  quoteStatus: "approved",
  subtotal: "350.00",
  tax: "42.00",
  total: "392.00",
  expiryDate: null,
  issue: null,
  workOrderId: null,
  items: [
    {
      id: id(9),
      name: "Brake service",
      kind: "labor",
      quantity: "1.50",
      unitPrice: "100.00",
      total: "150.00",
    },
    {
      id: id(10),
      name: "Brake pads",
      kind: "part",
      quantity: "2",
      unitPrice: "100.00",
      total: "200.00",
    },
  ],
  ...patch,
});
const props = { accountId: id(1), quoteId: id(3), onChanged: () => state.changed() };
function completed(r: QuoteRequest, patch: Record<string, unknown> = {}) {
  return {
    version: 1,
    status: "completed",
    operationId: r.operationId,
    accountId: r.expectedAccountId,
    shopId: r.shopId,
    quoteId: r.quoteId,
    action: r.action,
    reason: null,
    workOrderId: r.action === "convert" ? id(5) : null,
    quoteStatus: r.action === "convert" ? "converted" : "approved",
    ...patch,
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
async function ready() {
  await screen.findByText("Brake pads");
}
function note() {
  fireEvent.change(screen.getByRole("textbox", { name: "Approval or conversion note" }), {
    target: { value: "Approved by customer" },
  });
}
function saved() {
  return JSON.parse(sessionStorage.getItem(quoteStorageKey(id(1), id(3)))!) as QuoteRequest;
}
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  state.account = id(1);
  state.loading = false;
  state.read.mockResolvedValue(view());
  state.change.mockResolvedValue({ version: 1, status: "unknown" });
  state.inspect.mockResolvedValue({ version: 1, status: "unknown" });
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
});
it("review is separate from the reader and does not dispatch a financial action when opened", async () => {
  render(<QuoteWorkflowControl {...props} />);
  expect(state.read).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Review quote actions" }));
  await ready();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByText("₱392.00")).toBeInTheDocument();
  expect(screen.getByText("1.50")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Confirm conversion" })).toBeDisabled();
  expect(state.change).not.toHaveBeenCalled();
  expect(state.inspect).not.toHaveBeenCalled();
});
it("saves the full original request before dispatch and blocks double-click duplication", async () => {
  const pending = deferred<ReturnType<typeof completed>>();
  state.change.mockImplementation(({ data }: { data: QuoteRequest }) => {
    expect(saved()).toEqual(data);
    return pending.promise;
  });
  render(<QuoteWorkflowPanel {...props} />);
  await ready();
  note();
  const button = screen.getByRole("button", { name: "Confirm conversion" });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(state.change).toHaveBeenCalledTimes(1));
  const r = saved();
  expect(r.expectedFingerprint).toBe(view().fingerprint);
  expect(r.expectedUpdatedAt).toBe(view().updatedAt);
  await act(async () => pending.resolve(completed(r)));
  await screen.findByRole("link", { name: "Open created work order" });
  expect(state.changed).toHaveBeenCalledTimes(1);
  expect(sessionStorage.getItem(quoteStorageKey(id(1), id(3)))).toBeNull();
});
it("requires explicit confirmation of actual customer approval and fresh review before conversion", async () => {
  state.read.mockResolvedValue(view({ quoteStatus: "draft" }));
  state.change.mockImplementation(async ({ data }: { data: QuoteRequest }) => completed(data));
  render(<QuoteWorkflowPanel {...props} />);
  await ready();
  note();
  const button = screen.getByRole("button", { name: "Record customer approval" });
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(button);
  await screen.findByText("Customer approval recorded. Reload the quote before conversion.");
  expect(state.change.mock.calls[0][0].data.action).toBe("approve");
  expect(screen.queryByRole("button", { name: "Confirm conversion" })).not.toBeInTheDocument();
});
it("uncertain reply, remount, check and retry preserve the same operation ID and intent", async () => {
  const rendered = render(<QuoteWorkflowPanel {...props} />);
  await ready();
  note();
  fireEvent.click(screen.getByRole("button", { name: "Confirm conversion" }));
  await screen.findByText(/result is unconfirmed or this service is unavailable/i);
  const r = saved();
  rendered.unmount();
  render(<QuoteWorkflowPanel {...props} />);
  await screen.findByText("Saved conversion request");
  expect(state.read).toHaveBeenCalledTimes(1);
  state.inspect.mockResolvedValue(completed(r, { status: "not_observed" }));
  fireEvent.click(screen.getByRole("button", { name: "Check result" }));
  await screen.findByText(/not cancellation/);
  expect(saved()).toEqual(r);
  state.change.mockResolvedValue(completed(r));
  fireEvent.click(screen.getByRole("button", { name: "Retry same request" }));
  await screen.findByRole("link", { name: "Open created work order" });
  expect(state.inspect.mock.calls[0][0].data).toEqual(r);
  expect(state.change.mock.calls[1][0].data).toEqual(r);
});
it("deadline is unknown, not cancellation; a late reply does not create a second action", async () => {
  const pending = deferred<ReturnType<typeof completed>>();
  state.change.mockReturnValue(pending.promise);
  render(<QuoteWorkflowPanel {...props} />);
  await ready();
  note();
  vi.useFakeTimers();
  try {
    fireEvent.click(screen.getByRole("button", { name: "Confirm conversion" }));
    const r = saved();
    await act(async () => vi.advanceTimersByTimeAsync(20001));
    expect(
      screen.getByText(/result is unconfirmed or this service is unavailable/i),
    ).toBeInTheDocument();
    await act(async () => pending.resolve(completed(r)));
    expect(saved()).toEqual(r);
    expect(state.changed).not.toHaveBeenCalled();
    expect(state.change).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});
it("changed account hides old data and ignores the old late response", async () => {
  const pending = deferred<ReturnType<typeof completed>>();
  state.change.mockReturnValue(pending.promise);
  const page = render(<QuoteWorkflowPanel {...props} />);
  await ready();
  note();
  fireEvent.click(screen.getByRole("button", { name: "Confirm conversion" }));
  const r = saved();
  state.account = id(8);
  page.rerender(<QuoteWorkflowPanel {...props} />);
  expect(page.container).toBeEmptyDOMElement();
  await act(async () => pending.resolve(completed(r)));
  expect(state.changed).not.toHaveBeenCalled();
  expect(saved()).toEqual(r);
});
it("storage denial prevents any server mutation", async () => {
  render(<QuoteWorkflowPanel {...props} />);
  await ready();
  note();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw Error("Storage denied");
  });
  fireEvent.click(screen.getByRole("button", { name: "Confirm conversion" }));
  await screen.findByText("Storage denied");
  expect(state.change).not.toHaveBeenCalled();
});
it("corrupted stored requests block new actions instead of being silently discarded", async () => {
  sessionStorage.setItem(quoteStorageKey(id(1), id(3)), "{bad");
  render(<QuoteWorkflowPanel {...props} />);
  await screen.findByText(/Could not verify this quote or saved request/);
  expect(state.read).not.toHaveBeenCalled();
  expect(state.change).not.toHaveBeenCalled();
  expect(sessionStorage.getItem(quoteStorageKey(id(1), id(3)))).toBe("{bad");
});
it("malformed success receipt cannot clear recovery or navigate", async () => {
  state.change.mockImplementation(async ({ data }: { data: QuoteRequest }) =>
    completed(data, { shopId: id(8) }),
  );
  render(<QuoteWorkflowPanel {...props} />);
  await ready();
  note();
  fireEvent.click(screen.getByRole("button", { name: "Confirm conversion" }));
  await screen.findByText("Quote outcome unconfirmed.");
  expect(saved().shopId).toBe(id(2));
  expect(state.changed).not.toHaveBeenCalled();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
it("stable rejection clears only that request and requires new review", async () => {
  state.change.mockImplementation(async ({ data }: { data: QuoteRequest }) =>
    completed(data, {
      status: "rejected",
      reason: "stale_quote",
      workOrderId: null,
      quoteStatus: "approved",
    }),
  );
  render(<QuoteWorkflowPanel {...props} />);
  await ready();
  note();
  fireEvent.click(screen.getByRole("button", { name: "Confirm conversion" }));
  await screen.findByText(/quote or selected shop changed/);
  expect(sessionStorage.getItem(quoteStorageKey(id(1), id(3)))).toBeNull();
  expect(screen.queryByRole("button", { name: "Confirm conversion" })).not.toBeInTheDocument();
  expect(state.changed).not.toHaveBeenCalled();
});
it("unsupported quantities are shown as corrections, never rounded or submitted", async () => {
  state.read.mockResolvedValue(view({ issue: "fractional_part_quantity" }));
  render(<QuoteWorkflowPanel {...props} />);
  await ready();
  note();
  expect(screen.getByRole("alert")).toHaveTextContent("nothing was rounded");
  expect(screen.getByRole("button", { name: "Confirm conversion" })).toBeDisabled();
  expect(state.change).not.toHaveBeenCalled();
});
it("saved approval recovery remains separate from conversion", async () => {
  const r = makeQuoteRequest(
    view({ quoteStatus: "draft" }),
    "approve",
    "Customer confirmed",
    id(6),
  );
  saveQuoteRequest(sessionStorage, r);
  state.inspect.mockResolvedValue(completed(r));
  render(<QuoteWorkflowPanel {...props} />);
  await screen.findByText("Saved approval request");
  fireEvent.click(screen.getByRole("button", { name: "Check result" }));
  await screen.findByText(/Customer approval recorded/);
  expect(state.read).not.toHaveBeenCalled();
  expect(state.change).not.toHaveBeenCalled();
});
it("wrong-account or wrong-quote read cannot expose the returned line names", async () => {
  state.read.mockResolvedValue(view({ accountId: id(8) }));
  render(<QuoteWorkflowPanel {...props} />);
  await screen.findByText(/Could not verify this quote/);
  expect(screen.queryByText("Brake pads")).not.toBeInTheDocument();
});
it("already converted quote shows its existing work order without a new mutation", async () => {
  state.read.mockResolvedValue(view({ quoteStatus: "converted", workOrderId: id(5) }));
  render(<QuoteWorkflowPanel {...props} />);
  await ready();
  expect(screen.getByRole("link", { name: "Open Work Order →" })).toHaveAttribute(
    "href",
    `/workspace/work-orders/${id(5)}`,
  );
  expect(screen.queryByRole("button", { name: "Confirm conversion" })).not.toBeInTheDocument();
  expect(state.change).not.toHaveBeenCalled();
});
