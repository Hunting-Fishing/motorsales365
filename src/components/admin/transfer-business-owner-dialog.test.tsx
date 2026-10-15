import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TransferBusinessOwnerDialog } from "./transfer-business-owner-dialog";

// Mocked transport/React lifetime proof, not hosted RLS/JWT authorization,
// database abort/rollback, durable audit, trigger or ownership-migration proof.
type Hit = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  signup_intent: string | null;
  email: string | null;
  email_confirmed_at: string | null;
};
type SearchRequest = { data: { query: string; includeUnverified: boolean }; signal: AbortSignal };
type Write = {
  table: string;
  changes?: unknown;
  filters: ["eq" | "is", string, unknown][];
  projection?: string;
  signal?: AbortSignal;
};
const accountA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const accountB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const businessA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const businessB = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const previousOwner = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const aliceId = "11111111-1111-4111-8111-111111111111";
const bobId = "22222222-2222-4222-8222-222222222222";
const state = vi.hoisted(() => ({
  account: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as string | null,
  loading: false,
  search: vi.fn(),
  transfer: vi.fn(),
  from: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  writes: [] as Write[],
  dismisses: [] as ((open: boolean) => void)[],
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.account ? { id: state.account } : null, loading: state.loading }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/admin-users.functions", () => ({
  searchTransferableUsers: (request: SearchRequest) => state.search(request),
}));
vi.mock("sonner", () => ({ toast: { success: state.success, error: state.error } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      state.from(table);
      const write: Write = { table, filters: [] };
      state.writes.push(write);
      const builder = {
        update: (changes: unknown) => {
          write.changes = changes;
          return builder;
        },
        eq: (column: string, value: unknown) => {
          write.filters.push(["eq", column, value]);
          return builder;
        },
        is: (column: string, value: unknown) => {
          write.filters.push(["is", column, value]);
          return builder;
        },
        select: (projection: string) => {
          write.projection = projection;
          return builder;
        },
        abortSignal: (signal: AbortSignal) => {
          write.signal = signal;
          return state.transfer(write);
        },
      };
      return builder;
    },
  },
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    onOpenChange,
    children,
  }: React.PropsWithChildren<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }>) => {
    state.dismisses.push(onOpenChange);
    return open ? (
      <section role="dialog">
        <button type="button" onClick={() => onOpenChange(false)}>
          Dismiss dialog
        </button>
        {children}
      </section>
    ) : null;
  },
  DialogContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
  DialogFooter: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogDescription: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
}));
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean;
    onCheckedChange: (value: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
    />
  ),
}));

const hit = (id = aliceId, name = "Alice"): Hit => ({
  id,
  full_name: name,
  business_name: null,
  signup_intent: "buyer",
  email: name.toLowerCase() + "@example.test",
  email_confirmed_at: "2026-01-01T00:00:00Z",
});
const failure =
  "Transfer was not confirmed. The outcome may be unknown. Refresh business details before trying again.";
const confirmed = (id = businessA, owner = aliceId) => ({
  data: [{ id, owner_id: owner }],
  error: null,
});
function deferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<unknown>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
async function finish(pending: ReturnType<typeof deferred>, value: unknown, rejected = false) {
  await act(async () => {
    if (rejected) pending.reject(value);
    else pending.resolve(value);
    await pending.promise.catch(() => undefined);
  });
}
function show(initial: { currentOwnerId?: string | null; open?: boolean; strict?: boolean } = {}) {
  let props = {
    open: initial.open ?? true,
    businessId: businessA,
    businessName: "Workshop A",
    currentOwnerId: initial.currentOwnerId === undefined ? previousOwner : initial.currentOwnerId,
  };
  const changed = vi.fn();
  const transferred = vi.fn();
  const view = () => {
    const dialog = (
      <TransferBusinessOwnerDialog {...props} onOpenChange={changed} onTransferred={transferred} />
    );
    return initial.strict ? <React.StrictMode>{dialog}</React.StrictMode> : dialog;
  };
  const shown = render(view());
  return {
    ...shown,
    changed,
    transferred,
    update: (next: Partial<typeof props> = {}) => {
      props = { ...props, ...next };
      shown.rerender(view());
    },
  };
}
function search(text = "Alice") {
  fireEvent.change(screen.getByLabelText("Find a new owner"), { target: { value: text } });
  fireEvent.submit(screen.getByRole("form", { name: "Search transferable users" }));
}
async function choose(name = "Alice") {
  search(name);
  fireEvent.click(await screen.findByRole("button", { name: new RegExp("^" + name) }));
}
const transfer = () => fireEvent.click(screen.getByRole("button", { name: "Transfer" }));
function noConfirmation(shown: ReturnType<typeof show>) {
  expect(state.success).not.toHaveBeenCalled();
  expect(shown.transferred).not.toHaveBeenCalled();
  expect(shown.changed).not.toHaveBeenCalled();
}
beforeEach(() => {
  vi.clearAllMocks();
  state.account = accountA;
  state.loading = false;
  state.writes = [];
  state.dismisses = [];
  state.from.mockImplementation(() => undefined);
  state.search.mockResolvedValue({ rows: [hit(), hit(bobId, "Bob")] });
  state.transfer.mockResolvedValue(confirmed());
});
afterEach(cleanup);

describe("Request-bound business owner transfer", () => {
  it.each(["closed", "signed out", "auth loading"])(
    "renders no private controls or dispatch while %s",
    (mode) => {
      if (mode === "signed out") state.account = null;
      if (mode === "auth loading") state.loading = true;
      show({ open: mode !== "closed" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(state.search).not.toHaveBeenCalled();
      expect(state.from).not.toHaveBeenCalled();
    },
  );
  it("compares business AND prior owner and confirms exactly the returned new owner", async () => {
    const shown = show();
    await choose();
    transfer();
    await waitFor(() => expect(shown.transferred).toHaveBeenCalledTimes(1));
    expect(state.writes).toHaveLength(1);
    expect(state.writes[0]).toMatchObject({
      table: "businesses",
      changes: { owner_id: aliceId },
      filters: [
        ["eq", "id", businessA],
        ["eq", "owner_id", previousOwner],
      ],
      projection: "id,owner_id",
    });
    expect(state.writes[0].signal).toBeInstanceOf(AbortSignal);
    expect(state.success).toHaveBeenCalledWith("Business owner row update confirmed.");
    expect(shown.changed).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(state.error).not.toHaveBeenCalled();
  });
  it("uses IS NULL for an unowned business and accepts case-insensitive UUID confirmation", async () => {
    const shown = show({ currentOwnerId: null });
    state.transfer.mockResolvedValue(confirmed(businessA.toUpperCase(), aliceId.toUpperCase()));
    await choose();
    transfer();
    await waitFor(() => expect(shown.transferred).toHaveBeenCalledTimes(1));
    expect(state.writes[0].filters).toEqual([
      ["eq", "id", businessA],
      ["is", "owner_id", null],
    ]);
  });
  it.each([
    ["zero rows", []],
    [
      "multiple rows",
      [
        { id: businessA, owner_id: aliceId },
        { id: businessA, owner_id: aliceId },
      ],
    ],
    ["wrong business", [{ id: businessB, owner_id: aliceId }]],
    ["wrong owner", [{ id: businessA, owner_id: bobId }]],
    ["null owner", [{ id: businessA, owner_id: null }]],
    ["missing field", [{ id: businessA }]],
    ["extra field", [{ id: businessA, owner_id: aliceId, secret: "private" }]],
    ["null rows", null],
    ["non-array", { id: businessA, owner_id: aliceId }],
    ["invalid UUID", [{ id: "invalid", owner_id: aliceId }]],
  ])("refuses %s even without a backend error", async (_label, data) => {
    const shown = show();
    state.transfer.mockResolvedValue({ data, error: null });
    await choose();
    transfer();
    await waitFor(() => expect(state.error).toHaveBeenCalledWith(failure));
    noConfirmation(shown);
    expect(screen.getByRole("alert")).toHaveTextContent(failure);
    expect(screen.getByRole("button", { name: "Transfer" })).toBeDisabled();
    expect(state.transfer).toHaveBeenCalledTimes(1);
  });
  it.each(["backend error", "rejected transport", "synchronous builder throw"])(
    "sanitizes %s and never auto-retries",
    async (mode) => {
      const shown = show();
      if (mode === "backend error")
        state.transfer.mockResolvedValue({ data: null, error: { message: "private SQL/token" } });
      if (mode === "rejected transport")
        state.transfer.mockRejectedValue(new Error("private network/token"));
      if (mode === "synchronous builder throw")
        state.from.mockImplementation(() => {
          throw new Error("private builder/token");
        });
      await choose();
      transfer();
      await waitFor(() => expect(state.error).toHaveBeenCalledWith(failure));
      noConfirmation(shown);
      expect(state.from).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(/private .*token/)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Transfer" })).toBeDisabled();
    },
  );
  it("does not offer transfer to the current owner or dispatch an invalid target", async () => {
    const shown = show({ currentOwnerId: aliceId });
    await choose();
    expect(screen.getByRole("button", { name: "Transfer" })).toBeDisabled();
    transfer();
    expect(state.from).not.toHaveBeenCalled();
    shown.update({ businessId: "invalid" });
    search();
    expect(state.search).toHaveBeenCalledTimes(1); // only the earlier valid search
    expect(state.from).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("unavailable");
  });
  it("captures the selected owner and blocks synchronous double submission and choice changes", async () => {
    const pending = deferred();
    state.transfer.mockReturnValue(pending.promise);
    const shown = show();
    await choose();
    const button = screen.getByRole("button", { name: "Transfer" });
    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });
    fireEvent.click(screen.getByRole("button", { name: /^Bob/ }));
    expect(state.transfer).toHaveBeenCalledTimes(1);
    expect(state.writes[0].changes).toEqual({ owner_id: aliceId });
    expect(screen.getByRole("button", { name: /^Bob/ })).toHaveAttribute("aria-pressed", "false");
    await finish(pending, confirmed());
    expect(shown.transferred).toHaveBeenCalledTimes(1);
  });
  it.each(["account", "business", "prior owner", "close", "unmount", "signed out"])(
    "fences a pending transfer after %s transition",
    async (mode) => {
      const pending = deferred();
      state.transfer.mockReturnValue(pending.promise);
      const shown = show();
      await choose();
      transfer();
      const signal = state.writes[0].signal;
      if (mode === "account") {
        state.account = accountB;
        shown.update();
      }
      if (mode === "business") shown.update({ businessId: businessB, businessName: "Workshop B" });
      if (mode === "prior owner") shown.update({ currentOwnerId: bobId });
      if (mode === "close") shown.update({ open: false });
      if (mode === "unmount") shown.unmount();
      if (mode === "signed out") {
        state.account = null;
        shown.update();
      }
      expect(signal?.aborted).toBe(true);
      await finish(pending, confirmed());
      noConfirmation(shown);
      expect(state.error).not.toHaveBeenCalled();
      expect(screen.queryByRole("button", { name: /^Alice/ })).not.toBeInTheDocument();
    },
  );
  it("synchronously closes/aborts even when the parent ignores the close request", async () => {
    const pending = deferred();
    state.transfer.mockReturnValue(pending.promise);
    const shown = show();
    await choose();
    transfer();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(shown.changed).toHaveBeenCalledTimes(1);
    expect(state.writes[0].signal?.aborted).toBe(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await finish(pending, new Error("private late error"), true);
    expect(state.success).not.toHaveBeenCalled();
    expect(state.error).not.toHaveBeenCalled();
    expect(shown.transferred).not.toHaveBeenCalled();
    expect(shown.changed).toHaveBeenCalledTimes(1);
  });
  it("does not let an account A→B→A old transfer publish or clear a new pending operation", async () => {
    const old = deferred();
    const fresh = deferred();
    state.transfer.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    const shown = show();
    await choose();
    transfer();
    state.account = accountB;
    shown.update();
    state.account = accountA;
    shown.update();
    await choose();
    transfer();
    await finish(old, confirmed());
    noConfirmation(shown);
    expect(screen.getByRole("button", { name: "Transferring…" })).toBeDisabled();
    await finish(fresh, confirmed());
    expect(shown.transferred).toHaveBeenCalledTimes(1);
  });
  it("rechecks liveness after the confirmed callback changes the business scope", async () => {
    const shown = show();
    shown.transferred.mockImplementation(() => shown.update({ businessId: businessB }));
    await choose();
    transfer();
    await waitFor(() => expect(shown.transferred).toHaveBeenCalledTimes(1));
    expect(shown.changed).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Alice/ })).not.toBeInTheDocument();
  });
  it("closes the confirmed session if a consumer callback throws without claiming unknown outcome", async () => {
    const shown = show();
    shown.transferred.mockImplementation(() => {
      throw new Error("private consumer failure");
    });
    await choose();
    transfer();
    await waitFor(() => expect(shown.changed).toHaveBeenCalledWith(false));
    expect(shown.transferred).toHaveBeenCalledTimes(1);
    expect(state.success).toHaveBeenCalledWith("Business owner row update confirmed.");
    expect(state.error).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(state.transfer).toHaveBeenCalledTimes(1);
  });
  it("latest search wins and old finally cannot clear a newer search", async () => {
    const old = deferred();
    const fresh = deferred();
    state.search.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    show();
    search("old query");
    const oldSignal = (state.search.mock.calls[0][0] as SearchRequest).signal;
    search("new query");
    expect(oldSignal.aborted).toBe(true);
    await finish(old, { rows: [hit()] });
    expect(screen.queryByRole("button", { name: /^Alice/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Searching…" })).toBeDisabled();
    await finish(fresh, { rows: [hit(bobId, "Bob")] });
    expect(screen.getByRole("button", { name: /^Bob/ })).toBeInTheDocument();
    expect(state.error).not.toHaveBeenCalled();
  });
  it.each(["account", "business", "prior owner", "close", "unmount", "signed out"])(
    "fences late private search results after %s transition",
    async (mode) => {
      const pending = deferred();
      state.search.mockReturnValue(pending.promise);
      const shown = show();
      search();
      const request = state.search.mock.calls[0][0] as SearchRequest;
      if (mode === "account") {
        state.account = accountB;
        shown.update();
      }
      if (mode === "business") shown.update({ businessId: businessB });
      if (mode === "prior owner") shown.update({ currentOwnerId: bobId });
      if (mode === "close") shown.update({ open: false });
      if (mode === "unmount") shown.unmount();
      if (mode === "signed out") {
        state.account = null;
        shown.update();
      }
      expect(request.signal.aborted).toBe(true);
      await finish(pending, { rows: [hit()] });
      expect(screen.queryByRole("button", { name: /^Alice/ })).not.toBeInTheDocument();
      expect(state.error).not.toHaveBeenCalled();
      noConfirmation(shown);
    },
  );
  it("clears private choices on search-input/filter changes and does not dispatch stale selection", async () => {
    show();
    await choose();
    fireEvent.change(screen.getByLabelText("Find a new owner"), { target: { value: "changed" } });
    expect(screen.queryByRole("button", { name: /^Alice/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Transfer" })).toBeDisabled();
    transfer();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.submit(screen.getByRole("form", { name: "Search transferable users" }));
    await screen.findByRole("button", { name: /^Alice/ });
    expect((state.search.mock.calls[1][0] as SearchRequest).data).toEqual({
      query: "changed",
      includeUnverified: true,
    });
    expect(state.from).not.toHaveBeenCalled();
  });
  it.each(["rejection", "malformed rows", "duplicate users"])(
    "sanitizes current search %s and permits a fresh manual search",
    async (mode) => {
      if (mode === "rejection")
        state.search.mockRejectedValueOnce(new Error("private admin token"));
      if (mode === "malformed rows")
        state.search.mockResolvedValueOnce({ rows: [{ id: aliceId }] });
      if (mode === "duplicate users") state.search.mockResolvedValueOnce({ rows: [hit(), hit()] });
      show();
      search();
      await waitFor(() =>
        expect(state.error).toHaveBeenCalledWith("Could not search users. Try again."),
      );
      expect(screen.getByRole("button", { name: "Search" })).not.toBeDisabled();
      expect(screen.queryByText(/private admin/)).not.toBeInTheDocument();
      search();
      await screen.findByRole("button", { name: /^Alice/ });
      expect(state.search).toHaveBeenCalledTimes(2);
    },
  );
  it("ignores a late rejected search and an old dismiss callback in a new account session", async () => {
    const pending = deferred();
    state.search.mockReturnValueOnce(pending.promise);
    const shown = show();
    search();
    const dismissOld = state.dismisses.at(-1)!;
    state.account = accountB;
    shown.update();
    act(() => dismissOld(false));
    await finish(pending, new Error("private old account"), true);
    expect(state.error).not.toHaveBeenCalled();
    noConfirmation(shown);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
  it("keeps fresh StrictMode requests usable without double transfer", async () => {
    const shown = show({ strict: true });
    await choose();
    transfer();
    await waitFor(() => expect(shown.transferred).toHaveBeenCalledTimes(1));
    expect(state.search).toHaveBeenCalledTimes(1);
    expect(state.transfer).toHaveBeenCalledTimes(1);
  });
});
