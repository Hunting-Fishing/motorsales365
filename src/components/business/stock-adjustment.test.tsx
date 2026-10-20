// Actual dialog with authenticated server doubles. SQL and native concurrency run separately.
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BusinessStockAdjustment } from "./stock-adjustment";
import { stockPendingKey, type StockRequest } from "@/lib/business-stock-operation";
const state = vi.hoisted(() => ({
  account: "10000000-0000-4000-8000-000000000001",
  loading: false,
  submit: vi.fn(),
  inspect: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.account ? { id: state.account } : null, loading: state.loading }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/business-stock-operation.functions", () => ({
  submitBusinessStockAdjustment: state.submit,
  inspectBusinessStockAdjustment: state.inspect,
}));
const a = "10000000-0000-4000-8000-000000000001",
  b = "20000000-0000-4000-8000-000000000001",
  item = "30000000-0000-4000-8000-000000000001";
const selected = {
  id: item,
  business_id: b,
  name: "Brake pads",
  qty_on_hand: 10,
  updated_at: "2026-10-20T10:00:00.123456Z",
};
const receipt = (r: StockRequest) => ({
  version: 1,
  status: "completed",
  request: r,
  movementId: "91000000-0000-4000-8000-000000000001",
  quantityBefore: r.expectedQuantity,
  quantityAfter: "12.00",
});
function show(p: Partial<React.ComponentProps<typeof BusinessStockAdjustment>> = {}) {
  const props = {
    accountId: a,
    businessId: b,
    selected,
    onClose: vi.fn(),
    onChanged: vi.fn(),
    ...p,
  };
  const ui = render(<BusinessStockAdjustment {...props} />);
  return { ...ui, props };
}
async function enter() {
  await screen.findByRole("dialog", { name: "Adjust stock" });
  fireEvent.change(screen.getByLabelText("Quantity change"), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Count correction" } });
}
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  state.account = a;
  state.loading = false;
  state.submit.mockImplementation(async ({ data }: { data: StockRequest }) => receipt(data));
  state.inspect.mockImplementation(async ({ data }: { data: StockRequest }) => receipt(data));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});
it("persists intent before dispatch and confirms the matching saved quantities", async () => {
  const ui = show();
  state.submit.mockImplementation(async ({ data }: { data: StockRequest }) => {
    expect(JSON.parse(sessionStorage.getItem(stockPendingKey(a, b))!)).toEqual(data);
    return receipt(data);
  });
  await enter();
  fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
  expect(await screen.findByText(/Stock adjustment recorded: 10.00 → 12.00/)).toBeInTheDocument();
  expect(ui.props.onChanged).toHaveBeenCalledOnce();
  expect(sessionStorage.getItem(stockPendingKey(a, b))).toBeNull();
  expect(screen.queryByRole("button", { name: "Record adjustment" })).not.toBeInTheDocument();
});
it("double clicks send one request while an acknowledgment is pending", async () => {
  let complete!: (value: unknown) => void;
  state.submit.mockImplementation(
    () =>
      new Promise((r) => {
        complete = r;
      }),
  );
  show();
  await enter();
  const save = screen.getByRole("button", { name: "Record adjustment" });
  fireEvent.click(save);
  fireEvent.click(save);
  expect(state.submit).toHaveBeenCalledOnce();
  const req = state.submit.mock.calls[0][0].data;
  await act(async () => complete(receipt(req)));
  expect(await screen.findByText(/Stock adjustment recorded/)).toBeInTheDocument();
});
it("a lost response retries exactly the persisted ID and original intent", async () => {
  state.submit.mockRejectedValueOnce(new Error("private transport diagnostic"));
  show();
  await enter();
  fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
  await screen.findByText(/The result is not confirmed/);
  const original = state.submit.mock.calls[0][0].data;
  expect(screen.queryByText(/private transport diagnostic/)).not.toBeInTheDocument();
  expect(screen.getByLabelText("Quantity change")).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Retry same request" }));
  await screen.findByText(/Stock adjustment recorded/);
  expect(state.submit.mock.calls[1][0].data).toEqual(original);
});
it("reload recovers a pending result without resending the adjustment", async () => {
  state.submit.mockRejectedValueOnce(new Error("offline"));
  const first = show();
  await enter();
  fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
  await screen.findByText(/not confirmed/);
  const request = state.submit.mock.calls[0][0].data;
  first.unmount();
  const second = show({ selected: null });
  await screen.findByRole("dialog", { name: "Adjust stock" });
  fireEvent.click(screen.getByRole("button", { name: "Check result" }));
  await screen.findByText(/Stock adjustment recorded/);
  expect(state.submit).toHaveBeenCalledOnce();
  expect(state.inspect).toHaveBeenCalledWith({ data: request });
  expect(second.props.onChanged).toHaveBeenCalledOnce();
});
it("missing result keeps the same recovery identity and never creates a replacement", async () => {
  state.submit.mockResolvedValueOnce({ version: 1, status: "unknown" });
  state.inspect.mockImplementation(async ({ data }: { data: StockRequest }) => ({
    version: 1,
    status: "not_observed",
    request: data,
  }));
  show();
  await enter();
  fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
  await screen.findByText(/not confirmed/);
  const stored = sessionStorage.getItem(stockPendingKey(a, b));
  fireEvent.click(screen.getByRole("button", { name: "Check result" }));
  await screen.findByText(/No committed result was found/);
  expect(sessionStorage.getItem(stockPendingKey(a, b))).toBe(stored);
  expect(screen.queryByRole("button", { name: "Record adjustment" })).not.toBeInTheDocument();
});
it("confirmed rejection clears recovery but requires closing before another intent", async () => {
  state.submit.mockImplementation(async ({ data }: { data: StockRequest }) => ({
    version: 1,
    status: "rejected",
    request: data,
    code: "conflict",
  }));
  const ui = show();
  await enter();
  fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
  await screen.findByText(/No stock change was made/);
  expect(sessionStorage.getItem(stockPendingKey(a, b))).toBeNull();
  expect(screen.queryByRole("button", { name: "Record adjustment" })).not.toBeInTheDocument();
  expect(ui.props.onChanged).toHaveBeenCalledOnce();
});
it("another business's reply is unconfirmed and retains recovery", async () => {
  state.submit.mockImplementation(async ({ data }: { data: StockRequest }) =>
    receipt({ ...data, businessId: "20000000-0000-4000-8000-000000000002" }),
  );
  const ui = show();
  await enter();
  fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
  await screen.findByText(/not confirmed/);
  expect(ui.props.onChanged).not.toHaveBeenCalled();
  expect(sessionStorage.getItem(stockPendingKey(a, b))).not.toBeNull();
});
it("an account change hides the private draft and suppresses a late acknowledgment", async () => {
  let complete!: (value: unknown) => void;
  state.submit.mockImplementation(
    () =>
      new Promise((r) => {
        complete = r;
      }),
  );
  const ui = show();
  await enter();
  fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
  const req = state.submit.mock.calls[0][0].data;
  state.account = "10000000-0000-4000-8000-000000000002";
  ui.rerender(<BusinessStockAdjustment {...ui.props} />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await act(async () => complete(receipt(req)));
  expect(ui.props.onChanged).not.toHaveBeenCalled();
  expect(sessionStorage.getItem(stockPendingKey(a, b))).not.toBeNull();
});
it("unreadable storage blocks new writes instead of forgetting the prior request", async () => {
  sessionStorage.setItem(stockPendingKey(a, b), "{bad json");
  show();
  await screen.findAllByText(/recovery record could not be read/);
  expect(screen.getByRole("button", { name: "Record adjustment" })).toBeDisabled();
  expect(state.submit).not.toHaveBeenCalled();
});
it("a persistence failure sends nothing", async () => {
  show();
  await enter();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
  await screen.findByText(/Nothing was sent/);
  expect(state.submit).not.toHaveBeenCalled();
});
it("blank reason, sub-cent quantity and wrong selected business send nothing", async () => {
  const ui = show();
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
  expect(state.submit).not.toHaveBeenCalled();
  await enter();
  fireEvent.change(screen.getByLabelText("Quantity change"), { target: { value: "0.001" } });
  fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
  expect(state.submit).not.toHaveBeenCalled();
  ui.rerender(
    <BusinessStockAdjustment
      {...ui.props}
      selected={{ ...selected, business_id: "20000000-0000-4000-8000-000000000002" }}
    />,
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(state.submit).not.toHaveBeenCalled();
});
it("closing the dialog retains an unresolved operation for review", async () => {
  state.submit.mockResolvedValueOnce({ version: 1, status: "unknown" });
  const ui = show();
  await enter();
  fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
  await screen.findByText(/not confirmed/);
  fireEvent.click(screen.getByRole("button", { name: "Close and keep request", exact: true }));
  ui.rerender(<BusinessStockAdjustment {...ui.props} selected={null} />);
  expect(await screen.findByRole("button", { name: "Review stock request" })).toBeInTheDocument();
  expect(sessionStorage.getItem(stockPendingKey(a, b))).not.toBeNull();
});
it("an idle inventory page mounts without a selected item or network request", () => {
  show({ selected: null });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(state.submit).not.toHaveBeenCalled();
  expect(state.inspect).not.toHaveBeenCalled();
});
