import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VehicleReceiptLinesDialog } from "./vehicle-receipt-lines-dialog";
import {
  RECEIPT_LINES_FAILURE,
  type ReceiptLinesPage,
  type ReceiptLinesRequest,
} from "@/lib/vehicle-receipt-lines-contract";

const transport = vi.hoisted(() => ({
  read: vi.fn<(options: { data: unknown; signal?: AbortSignal }) => Promise<unknown>>(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/vehicle-receipts.functions", () => ({ getVehicleReceiptItemPage: transport.read }));
const account = "51000000-0000-4000-8000-000000000001";
const receiptId = "52000000-0000-4000-8000-000000000001";
const vehicleId = "53000000-0000-4000-8000-000000000001";
const shopVehicleId = "54000000-0000-4000-8000-000000000001";
const intent = { expectedAccountId: account, receiptId, vehicleId };
type Line = ReceiptLinesPage["items"][number];
const clients: QueryClient[] = [];
function line(index: number): Line {
  return {
    id: `55000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    receipt_id: receiptId,
    description: `Retained line ${index + 1}`,
    category: "brakes",
    brand: null,
    part_number: null,
    quantity: 1,
    total: null,
    confidence: 1,
    reviewed: true,
    installed_on: null,
    odometer_km: null,
    public_summary_allowed: false,
    sort_order: index,
  };
}
function page(
  index = 0,
  totalCount = 201,
  overrides: Partial<ReceiptLinesPage> = {},
): ReceiptLinesPage {
  const length = Math.min(100, Math.max(0, totalCount - index * 100));
  return {
    receiptId,
    vehicleId,
    shopVehicleId: null,
    page: index,
    totalCount,
    hasNext: (index + 1) * 100 < totalCount,
    items: Array.from({ length }, (_, offset) => line(index * 100 + offset)),
    ...overrides,
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function request(index = 0) {
  const options = transport.read.mock.calls[index][0];
  if (!options || !options.signal) throw new Error("Missing synthetic request.");
  return { data: options.data, signal: options.signal };
}
function rawClick(button: HTMLElement) {
  const key = Object.getOwnPropertyNames(button).find((name) => name.startsWith("__reactProps$"));
  if (!key) throw new Error("Missing React source handler.");
  const props: unknown = Reflect.get(button, key);
  if (
    !props ||
    typeof props !== "object" ||
    !("onClick" in props) ||
    typeof props.onClick !== "function"
  )
    throw new Error("Missing React source handler.");
  const handler = props.onClick;
  return () => handler();
}
function show(
  options: { strict?: boolean; intent?: Omit<ReceiptLinesRequest, "page">; currency?: string } = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  clients.push(client);
  const parentKey = ["synthetic-receipt-parent", account, "open-1"];
  const witness = Object.freeze({ read: "parent" });
  client.setQueryData(parentKey, witness);
  const version = client.getQueryState(parentKey)!.dataUpdateCount;
  let active = true;
  const close = vi.fn(() => {
    active = false;
  });
  const parentCurrent = () => {
    const state = client.getQueryState(parentKey);
    return (
      active &&
      state?.status === "success" &&
      state.fetchStatus === "idle" &&
      !state.isInvalidated &&
      state.data === witness &&
      state.dataUpdateCount === version
    );
  };
  const view = (open = true, epoch = 1) => (
    <QueryClientProvider client={client}>
      {open && (
        <VehicleReceiptLinesDialog
          key={epoch}
          intent={options.intent ?? intent}
          currency={options.currency ?? "PHP"}
          parentQueryKey={parentKey}
          isParentCurrent={parentCurrent}
          onClose={close}
        />
      )}
    </QueryClientProvider>
  );
  const rendered = render(options.strict ? <StrictMode>{view()}</StrictMode> : view());
  return {
    ...rendered,
    client,
    parentKey,
    close,
    view,
    activate: () => {
      active = true;
    },
    deactivate: () => {
      active = false;
    },
  };
}
beforeEach(() => {
  transport.read.mockReset().mockImplementation((options) => {
    const input = options?.data;
    if (!input || typeof input !== "object" || !("page" in input) || typeof input.page !== "number")
      throw new Error("Missing synthetic page.");
    return Promise.resolve(page(input.page));
  });
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  vi.restoreAllMocks();
});

// Real Dialog and QueryClient, synthetic server responses only: no RLS, HTTP,
// original-human authority, database cancellation or atomic multi-page proof.
describe("display-only retained receipt line windows", () => {
  it("reaches every line across three bounded windows without writer controls", async () => {
    show();
    await screen.findByText("Retained line 100");
    expect(screen.getByText(/201 visible lines at read time/)).toBeVisible();
    expect(screen.getByRole("list", { name: "Receipt line window" }).children).toHaveLength(100);
    expect(request().data).toEqual({ ...intent, page: 0 });
    expect(request().signal).toBeInstanceOf(AbortSignal);
    fireEvent.click(screen.getByRole("button", { name: "Next lines" }));
    await screen.findByText("Retained line 200");
    expect(screen.queryByText("Retained line 1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next lines" }));
    await screen.findByText("Retained line 201");
    expect(screen.getByRole("list").children).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Next lines" })).toBeDisabled();
    expect(request(2).data).toEqual({ ...intent, page: 2 });
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Review|Save|installation|sharing/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Each page is a separate read-time window/)).toBeVisible();
  });

  it("preserves received precision, nulls and native date text without conversion", async () => {
    transport.read.mockResolvedValueOnce(
      page(0, 2, {
        items: [
          {
            ...line(0),
            quantity: 1.234567,
            total: 20.12345678,
            installed_on: "infinity",
            odometer_km: 0,
          },
          {
            ...line(1),
            quantity: null,
            total: null,
            installed_on: "0044-03-15 BC",
            brand: "メーカー",
            part_number: "P-🙂",
          },
        ],
      }),
    );
    show({ currency: "JPY" });
    await screen.findByText(/JPY 20\.12345678/);
    expect(screen.getByText(/Quantity: 1\.234567/)).toBeVisible();
    expect(screen.getByText(/Quantity: Not recorded · Amount unavailable/)).toBeVisible();
    expect(screen.getByText("Installed infinity · 0 km")).toBeVisible();
    expect(screen.getByText("Installed 0044-03-15 BC")).toBeVisible();
    expect(screen.getByText("メーカー · P-🙂")).toBeVisible();
  });

  it("captures the selected shop target without adopting a stored dual target", async () => {
    transport.read.mockResolvedValueOnce(page(0, 1, { vehicleId: null, shopVehicleId }));
    show({ intent: { expectedAccountId: account, receiptId, shopVehicleId } });
    await screen.findByText("Retained line 1");
    expect(request().data).toEqual({
      expectedAccountId: account,
      receiptId,
      shopVehicleId,
      page: 0,
    });
  });

  it("shows neither legacy cached lines nor a false empty state while the initial read is pending", async () => {
    const pending = deferred<ReceiptLinesPage>();
    transport.read.mockReturnValueOnce(pending.promise);
    const context = show();
    context.client.setQueryData(
      ["vehicle-receipt-lines", account, vehicleId, undefined, receiptId],
      page(),
    );
    expect(screen.getByText("Loading receipt lines…")).toBeVisible();
    expect(screen.queryByText("Retained line 1")).not.toBeInTheDocument();
    expect(screen.queryByText(/No lines are visible/)).not.toBeInTheDocument();
    await act(async () => pending.resolve(page(0, 0)));
    await screen.findByText("No lines are visible in this read-time window.");
  });

  it.each(["fetching", "invalidated", "paused", "error"] as const)(
    "hides the old window during %s and refuses retained Next handlers",
    async (kind) => {
      const { client } = show();
      await screen.findByText("Retained line 100");
      const next = rawClick(screen.getByRole("button", { name: "Next lines" }));
      const query = client
        .getQueryCache()
        .find({ queryKey: ["vehicle-receipt-lines"], exact: false })!;
      act(() => {
        if (kind === "invalidated")
          void client.invalidateQueries({ queryKey: query.queryKey, refetchType: "none" });
        else
          query.setState(
            kind === "error"
              ? { status: "error", error: new Error("PRIVATE") }
              : { fetchStatus: kind },
          );
        next();
      });
      expect(screen.queryByText("Retained line 1")).not.toBeInTheDocument();
      expect(screen.queryByText(/No lines are visible/)).not.toBeInTheDocument();
      expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
      expect(transport.read).toHaveBeenCalledTimes(1);
    },
  );

  it("uses generic manual retries and joins repeated old retry handlers", async () => {
    transport.read.mockRejectedValueOnce(new Error("PRIVATE provider cause"));
    show();
    await screen.findByText(RECEIPT_LINES_FAILURE);
    expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
    const retry = rawClick(screen.getByRole("button", { name: "Retry receipt lines" }));
    const pending = deferred<ReceiptLinesPage>();
    transport.read.mockReturnValueOnce(pending.promise);
    act(() => {
      retry();
      retry();
    });
    expect(transport.read).toHaveBeenCalledTimes(2);
    expect(request(1).signal.aborted).toBe(false);
    await act(async () => pending.resolve(page()));
    await screen.findByText("Retained line 1");
  });

  it("fences duplicate page intent before commit and never reuses the first page key on return", async () => {
    const { client } = show();
    await screen.findByText("Retained line 100");
    const firstKey = client
      .getQueryCache()
      .find({ queryKey: ["vehicle-receipt-lines"], exact: false })!.queryKey;
    const next = rawClick(screen.getByRole("button", { name: "Next lines" }));
    const pending = deferred<ReceiptLinesPage>();
    transport.read.mockReturnValueOnce(pending.promise);
    act(() => {
      next();
      next();
    });
    await waitFor(() => expect(transport.read).toHaveBeenCalledTimes(2));
    const oldSignal = request(1).signal;
    fireEvent.click(screen.getByRole("button", { name: "Previous lines" }));
    await screen.findByText("Retained line 1");
    expect(oldSignal.aborted).toBe(true);
    const currentKey = client
      .getQueryCache()
      .findAll({ queryKey: ["vehicle-receipt-lines"] })
      .find((query) => query.getObserversCount() > 0)!.queryKey;
    expect(currentKey).not.toEqual(firstKey);
    await act(async () => pending.resolve(page(1)));
    expect(screen.queryByText("Retained line 101")).not.toBeInTheDocument();
  });

  it("keeps Previous available for an empty later window after count drift", async () => {
    transport.read.mockResolvedValueOnce(page()).mockResolvedValueOnce(page(1, 50));
    show();
    await screen.findByText("Retained line 100");
    fireEvent.click(screen.getByRole("button", { name: "Next lines" }));
    await screen.findByText("No lines are visible in this read-time window.");
    expect(screen.getByText(/50 visible lines at read time/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Previous lines" })).toBeEnabled();
  });

  for (const outcome of ["resolve", "reject"] as const) {
    it(`aborts a closed window and ignores late ${outcome} after a fresh reopen`, async () => {
      const old = deferred<ReceiptLinesPage>(),
        current = deferred<ReceiptLinesPage>();
      transport.read.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
      const context = show();
      await waitFor(() => expect(transport.read).toHaveBeenCalledTimes(1));
      const signal = request().signal;
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      context.rerender(context.view(false));
      expect(signal.aborted).toBe(true);
      context.activate();
      context.rerender(context.view(true, 2));
      await waitFor(() => expect(transport.read).toHaveBeenCalledTimes(2));
      await act(async () =>
        outcome === "resolve" ? old.resolve(page()) : old.reject(new Error("PRIVATE old failure")),
      );
      expect(screen.queryByText("Retained line 1")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      await act(async () => current.resolve(page(0, 1)));
      await screen.findByText("Retained line 1");
    });
  }

  it("aborts every pending reader when a StrictMode-mounted dialog unmounts", async () => {
    const pending = deferred<ReceiptLinesPage>();
    transport.read.mockImplementation(() => pending.promise);
    const context = show({ strict: true });
    await waitFor(() => expect(transport.read).toHaveBeenCalled());
    const signals = transport.read.mock.calls.map((_, index) => request(index).signal);
    context.unmount();
    for (const signal of signals) expect(signal.aborted).toBe(true);
    await act(async () => pending.resolve(page()));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each([
    "wrong receipt",
    "wrong target",
    "wrong page",
    "missing count",
    "truncated",
    "extra authority",
  ] as const)("refuses a %s DTO without exposing rows or writer authority", async (kind) => {
    const result: Record<string, unknown> = { ...page(0, 1) };
    if (kind === "wrong receipt") result.receiptId = vehicleId;
    if (kind === "wrong target") result.vehicleId = shopVehicleId;
    if (kind === "wrong page") result.page = 1;
    if (kind === "missing count") delete result.totalCount;
    if (kind === "truncated") result.totalCount = 2;
    if (kind === "extra authority") result.can_write = true;
    transport.read.mockImplementationOnce(async () => result);
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent(RECEIPT_LINES_FAILURE);
    expect(screen.queryByText("Retained line 1")).not.toBeInTheDocument();
  });
});
