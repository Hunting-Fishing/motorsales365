import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InternalStaffView } from "./InternalStaffView";
import {
  STAFF_CHANGE_UNCONFIRMED,
  STAFF_CREATION_UNKNOWN,
  STAFF_CREATION_ACKNOWLEDGED,
  STAFF_SIGN_IN_ACKNOWLEDGED,
} from "@/lib/internal-staff-contract";

// Actual React/query lifetimes; mocked auth/server calls and dialog shell. No
// actual HTTP/JWT/role/provider/DB cancellation, rollback or revocation proof.
const actor = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const other = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const target = "11111111-1111-4111-8111-111111111111";
const manager = "22222222-2222-4222-8222-222222222222";
const created = "33333333-3333-4333-8333-333333333333";
const password = "Never-toast-this-test-password-42!";
const state = vi.hoisted(() => ({
  account: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as string | null,
  loading: false,
  list: vi.fn(),
  create: vi.fn(),
  move: vi.fn(),
  restrict: vi.fn(),
  message: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.account ? { id: state.account } : null, loading: state.loading }),
}));
vi.mock("@/lib/internal-staff.functions", () => ({
  listInternalStaff: state.list,
  createInternalStaff: state.create,
  updateStaffManager: state.move,
  deactivateInternalStaff: state.restrict,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("sonner", () => ({
  toast: {
    message: state.message,
    success: state.success,
    error: state.error,
    warning: state.warning,
  },
}));
vi.mock("@/components/internal-staff/StaffChatDialog", () => ({
  StaffChatDialog: () => <div>Private chat dialog</div>,
}));
vi.mock("@/components/admin/staff-365-badge", () => ({
  Staff365Badge: () => <span>Staff badge</span>,
}));
vi.mock("@/components/ui/dialog", () => {
  const Plain = ({ children }: React.PropsWithChildren) => <div>{children}</div>;
  return {
    Dialog: ({
      children,
      onOpenChange,
    }: React.PropsWithChildren<{ onOpenChange: (open: boolean) => void }>) => (
      <div>
        {children}
        <button onClick={() => onOpenChange(false)}>Dismiss dialog</button>
      </div>
    ),
    DialogContent: ({ children }: React.PropsWithChildren) => (
      <section role="dialog">{children}</section>
    ),
    DialogHeader: Plain,
    DialogFooter: Plain,
    DialogTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
    DialogDescription: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
  };
});
const roster = (account = actor) => [
  {
    user_id: account,
    full_name: "Manager Alpha",
    email: "alpha@365motorsales.com",
    avatar_url: null,
    manager_user_id: null,
    is_admin: true,
  },
  {
    user_id: target,
    full_name: "Employee One",
    email: "employee@365motorsales.com",
    avatar_url: null,
    manager_user_id: account,
    is_admin: false,
  },
  {
    user_id: manager,
    full_name: "Manager Beta",
    email: "beta@365motorsales.com",
    avatar_url: null,
    manager_user_id: null,
    is_admin: true,
  },
];
function deferred<T = unknown>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const clients: QueryClient[] = [];
function mount(
  props = { currentUserId: actor, isAdmin: true, variant: "tree" as "tree" | "list" },
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  const wrapper = (p: typeof props) => (
    <QueryClientProvider client={client}>
      <InternalStaffView {...p} />
    </QueryClientProvider>
  );
  const view = render(wrapper(props));
  return { ...view, client, rerenderProps: (p: typeof props) => view.rerender(wrapper(p)) };
}
async function ready() {
  await screen.findByText("Employee One");
}
async function openMove() {
  await ready();
  fireEvent.click(screen.getByTitle("Change manager"));
}
async function createForm() {
  await ready();
  fireEvent.click(screen.getByText("Add staff under me"));
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "New Person" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new" } });
  fireEvent.change(screen.getByLabelText("Temporary password (min 8)"), {
    target: { value: password },
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  state.account = actor;
  state.loading = false;
  state.list.mockResolvedValue(roster());
  state.move.mockResolvedValue({ ok: true, user_id: target, manager_user_id: null });
  state.restrict.mockResolvedValue({
    ok: true,
    user_id: target,
    scope: "sign_in_restriction",
    existingSessions: "unverified",
  });
  state.create.mockResolvedValue({
    user_id: created,
    email: "new@365motorsales.com",
    profileConfirmed: true,
  });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((c) => c.clear());
  vi.restoreAllMocks();
});

describe("account-bound private roster", () => {
  it.each(["signed-out", "loading", "mismatched-prop"])(
    "does not request or show private records when %s",
    async (mode) => {
      if (mode === "signed-out") state.account = null;
      if (mode === "loading") state.loading = true;
      if (mode === "mismatched-prop") state.account = other;
      mount();
      expect(state.list).not.toHaveBeenCalled();
      expect(screen.queryByText("Employee One")).toBeNull();
    },
  );
  it("keys private cache by account and admin context, not the old global key", async () => {
    const { client } = mount();
    await ready();
    expect(client.getQueryData(["internal-staff", actor, true])).toEqual(roster());
    expect(client.getQueryData(["internal-staff"])).toBeUndefined();
  });
  it("hides roster/forms during refresh and after failure; retry restores fresh data", async () => {
    const { client } = mount();
    await openMove();
    const refresh = deferred();
    state.list.mockReturnValueOnce(refresh.promise);
    let refetch!: Promise<unknown>;
    act(() => {
      refetch = client.invalidateQueries({ queryKey: ["internal-staff", actor, true] });
    });
    await waitFor(() => expect(screen.queryByText("Employee One")).toBeNull());
    expect(screen.queryByRole("dialog")).toBeNull();
    await act(async () => {
      refresh.reject(new Error("private-provider-detail"));
      await refetch;
    });
    expect((await screen.findByRole("alert")).textContent).not.toContain("private-provider-detail");
    fireEvent.click(screen.getByText("Retry team"));
    await ready();
  });
  it("removes private UI and forms on sign-out without using stale props", async () => {
    const view = mount();
    await openMove();
    state.account = null;
    view.rerenderProps({ currentUserId: actor, isAdmin: true, variant: "tree" });
    expect(screen.queryByText("Employee One")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("discards a late A request even after switching A-to-B-to-A", async () => {
    const view = mount();
    await openMove();
    const move = deferred();
    state.move.mockReturnValueOnce(move.promise);
    fireEvent.change(screen.getByLabelText("Reports to"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Save"));
    state.account = other;
    state.list.mockResolvedValue(roster(other));
    view.rerenderProps({ currentUserId: other, isAdmin: true, variant: "tree" });
    await ready();
    state.account = actor;
    state.list.mockResolvedValue(roster());
    view.rerenderProps({ currentUserId: actor, isAdmin: true, variant: "tree" });
    await ready();
    await act(async () => move.resolve({ ok: true, user_id: target, manager_user_id: null }));
    expect(state.message).not.toHaveBeenCalled();
    expect(state.error).not.toHaveBeenCalled();
    expect(state.list).toHaveBeenCalledTimes(3);
  });
  it("admin-context loss hides controls and discards an old administrative response", async () => {
    const view = mount();
    await openMove();
    const move = deferred();
    state.move.mockReturnValueOnce(move.promise);
    fireEvent.click(screen.getByText("Save"));
    view.rerenderProps({ currentUserId: actor, isAdmin: false, variant: "tree" });
    await ready();
    await act(async () => move.resolve({ ok: true, user_id: target, manager_user_id: actor }));
    expect(screen.queryByText("Add staff under me")).toBeNull();
    expect(state.message).not.toHaveBeenCalled();
  });
});

describe("manager acknowledgment and dialog lifetime", () => {
  it("supports No manager and only acknowledges a matching returned mutation", async () => {
    mount();
    await openMove();
    fireEvent.change(screen.getByLabelText("Reports to"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(state.message).toHaveBeenCalledTimes(1));
    expect(state.move).toHaveBeenCalledWith({ data: { userId: target, managerUserId: null } });
    expect(state.success).not.toHaveBeenCalled();
  });
  it.each([
    undefined,
    { ok: true },
    { ok: true, user_id: manager, manager_user_id: null },
    { ok: true, user_id: target, manager_user_id: manager },
  ])("unconfirmed response does not close or report success: %j", async (ack) => {
    state.move.mockResolvedValue(ack);
    mount();
    await openMove();
    fireEvent.change(screen.getByLabelText("Reports to"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(state.error).toHaveBeenCalledWith(STAFF_CHANGE_UNCONFIRMED));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(state.message).not.toHaveBeenCalled();
    expect(state.list).toHaveBeenCalledTimes(1);
  });
  it("blocks repeated submit and ignores late success after dismissal", async () => {
    const move = deferred();
    state.move.mockReturnValue(move.promise);
    mount();
    await openMove();
    fireEvent.click(screen.getByText("Save"));
    fireEvent.click(screen.getByText("Saving…"));
    expect(state.move).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("Dismiss dialog"));
    await act(async () => move.resolve({ ok: true, user_id: target, manager_user_id: actor }));
    expect(state.message).not.toHaveBeenCalled();
    expect(state.error).not.toHaveBeenCalled();
    expect(state.list).toHaveBeenCalledTimes(1);
  });
  it("masks transport errors instead of toasting private provider details", async () => {
    state.move.mockRejectedValue(new Error(password));
    mount();
    await openMove();
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(state.error).toHaveBeenCalledWith(STAFF_CHANGE_UNCONFIRMED));
    expect(JSON.stringify(state.error.mock.calls)).not.toContain(password);
  });
});

describe("creation acknowledgment and ambiguous outcomes", () => {
  it("does not clear an unknown-creation lock when admin context changes within the same mounted account", async () => {
    state.create.mockResolvedValue({
      user_id: created,
      email: "new@365motorsales.com",
      profileConfirmed: false,
    });
    const view = mount();
    await createForm();
    fireEvent.click(screen.getByText("Create staff"));
    await waitFor(() => expect(state.warning).toHaveBeenCalledWith(STAFF_CREATION_UNKNOWN));
    view.rerenderProps({ currentUserId: actor, isAdmin: false, variant: "tree" });
    await ready();
    view.rerenderProps({ currentUserId: actor, isAdmin: true, variant: "tree" });
    await ready();
    expect((screen.getByText("Add staff under me") as HTMLButtonElement).disabled).toBe(true);
  });
  it("retains unknown-creation lock across a roster refresh", async () => {
    state.create.mockResolvedValue({
      user_id: created,
      email: "new@365motorsales.com",
      profileConfirmed: false,
    });
    const view = mount();
    await createForm();
    fireEvent.click(screen.getByText("Create staff"));
    await waitFor(() => expect(state.warning).toHaveBeenCalledWith(STAFF_CREATION_UNKNOWN));
    await act(async () => {
      await view.client.invalidateQueries({ queryKey: ["internal-staff", actor, true] });
    });
    await ready();
    expect((screen.getByText("Add staff under me") as HTMLButtonElement).disabled).toBe(true);
  });
  it("acknowledges only confirmed profile response without claiming complete provisioning", async () => {
    mount();
    await createForm();
    fireEvent.click(screen.getByText("Create staff"));
    await waitFor(() => expect(state.message).toHaveBeenCalledWith(STAFF_CREATION_ACKNOWLEDGED));
    expect(state.success).not.toHaveBeenCalled();
    expect(JSON.stringify(state.message.mock.calls)).not.toContain(password);
  });
  it.each([
    { user_id: created, email: "new@365motorsales.com", profileConfirmed: false },
    { user_id: created, email: "wrong@365motorsales.com", profileConfirmed: true },
    { user_id: created, email: "new@365motorsales.com" },
  ])("partial/malformed response keeps the mounted account creation lock: %j", async (ack) => {
    state.create.mockResolvedValue(ack);
    mount();
    await createForm();
    fireEvent.click(screen.getByText("Create staff"));
    await waitFor(() => expect(state.warning).toHaveBeenCalledWith(STAFF_CREATION_UNKNOWN));
    expect((screen.getByText("Create staff") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText("Dismiss dialog"));
    expect((screen.getByText("Add staff under me") as HTMLButtonElement).disabled).toBe(true);
    expect(state.message).not.toHaveBeenCalled();
    expect(state.list).toHaveBeenCalledTimes(1);
  });
  it("double click sends one request; dismissal and late result do not release an unknown-outcome lock", async () => {
    const creation = deferred();
    state.create.mockReturnValue(creation.promise);
    mount();
    await createForm();
    fireEvent.click(screen.getByText("Create staff"));
    fireEvent.click(screen.getByText("Creating…"));
    expect(state.create).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("Dismiss dialog"));
    await act(async () =>
      creation.resolve({
        user_id: created,
        email: "new@365motorsales.com",
        profileConfirmed: true,
      }),
    );
    expect((screen.getByText("Add staff under me") as HTMLButtonElement).disabled).toBe(true);
    expect(state.message).not.toHaveBeenCalled();
  });
  it("transport error keeps password out of feedback and does not auto-retry", async () => {
    state.create.mockRejectedValue(new Error(password));
    mount();
    await createForm();
    fireEvent.click(screen.getByText("Create staff"));
    await waitFor(() => expect(state.warning).toHaveBeenCalledWith(STAFF_CREATION_UNKNOWN));
    expect(state.create).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(state.warning.mock.calls)).not.toContain(password);
  });
  it("account switch unmounts private creation fields and ignores late results", async () => {
    const creation = deferred();
    state.create.mockReturnValue(creation.promise);
    const view = mount();
    await createForm();
    fireEvent.click(screen.getByText("Create staff"));
    state.account = other;
    state.list.mockResolvedValue(roster(other));
    view.rerenderProps({ currentUserId: other, isAdmin: true, variant: "tree" });
    await ready();
    expect(screen.queryByLabelText("Temporary password (min 8)")).toBeNull();
    await act(async () => creation.reject(new Error(password)));
    expect(state.warning).not.toHaveBeenCalled();
    expect(state.message).not.toHaveBeenCalled();
  });
});

describe("sign-in restriction feedback", () => {
  for (const variant of ["tree", "list"] as const)
    it("labels " + variant + " restriction without claiming JWT/roster revocation", async () => {
      mount({ currentUserId: actor, isAdmin: true, variant });
      await ready();
      fireEvent.click(screen.getByTitle("Restrict sign-in"));
      await waitFor(() => expect(state.message).toHaveBeenCalledWith(STAFF_SIGN_IN_ACKNOWLEDGED));
      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Existing sessions"));
      expect(state.success).not.toHaveBeenCalled();
    });
  it("rejects void/legacy generic success and leaves roster unchanged", async () => {
    state.restrict.mockResolvedValue({ ok: true });
    mount();
    await ready();
    fireEvent.click(screen.getByTitle("Restrict sign-in"));
    await waitFor(() => expect(state.error).toHaveBeenCalledWith(STAFF_CHANGE_UNCONFIRMED));
    expect(state.list).toHaveBeenCalledTimes(1);
  });
  it("prevents duplicate restriction requests and suppresses late response after unmount", async () => {
    const restriction = deferred();
    state.restrict.mockReturnValue(restriction.promise);
    const view = mount();
    await ready();
    fireEvent.click(screen.getByTitle("Restrict sign-in"));
    fireEvent.click(screen.getByTitle("Restrict sign-in"));
    expect(state.restrict).toHaveBeenCalledTimes(1);
    view.unmount();
    await act(async () =>
      restriction.resolve({
        ok: true,
        user_id: target,
        scope: "sign_in_restriction",
        existingSessions: "unverified",
      }),
    );
    expect(state.message).not.toHaveBeenCalled();
    expect(state.error).not.toHaveBeenCalled();
  });
});
