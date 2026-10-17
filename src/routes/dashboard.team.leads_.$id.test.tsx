// Actual route + real QueryClient; synthetic server responses only. No native
// org authority, JWT, DB cancellation, atomic membership or live acceptance.
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { Route } from "./dashboard.team.leads_.$id";
const state = vi.hoisted(() => ({
  account: "",
  loading: false,
  id: "",
  org: "",
  lead: vi.fn(),
  members: vi.fn(),
  assign: vi.fn(),
  status: vi.fn(),
  note: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.account ? { id: state.account } : null, loading: state.loading }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/leads.functions", () => ({
  getLead: state.lead,
  listOrgMembers: state.members,
  assignLead: state.assign,
  updateLeadStatus: state.status,
  addLeadNote: state.note,
}));
vi.mock("sonner", () => ({ toast: { success: state.success, error: state.error } }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({
    options,
    useParams: () => ({ id: state.id }),
    useSearch: () => ({ orgId: state.org }),
  }),
  Link: ({
    children,
    to,
    params,
    search: _search,
    ...props
  }: React.PropsWithChildren<{
    to: string;
    params?: { id: string };
    search?: unknown;
    className?: string;
  }>) => (
    <a {...props} href={to.replace("$id", params?.id ?? "")}>
      {children}
    </a>
  ),
}));
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const account = uid(1),
  org = uid(2),
  leadId = uid(3),
  member = uid(4),
  otherMember = uid(5);
const uncertain =
  "Assignment outcome could not be confirmed. Review this lead before assigning again.";
const record = (id = state.id, organization_id = state.org) => ({
  lead: {
    id,
    organization_id,
    assigned_to: null,
    source: "listing_message",
    status: "new",
    subject: "Private retail inquiry",
    preview: "Private preview",
    customer_name: "Private customer",
    customer_email: "private@example.test",
    customer_phone: null,
    created_at: "2026-10-15T10:00:00Z",
    listing_id: null,
  },
  activities: [],
});
const choices = () =>
  [member, otherMember].map((user_id) => ({
    user_id,
    role: "member",
    profiles: { id: user_id, full_name: user_id === member ? "Member one" : "Member two" },
  }));
const ack = (assigned_to: string | null = member) => ({
  ok: true,
  assignment: { id: state.id, organization_id: state.org, assigned_to },
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const Component = Route.options.component as React.ComponentType;
function show(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  const view = () => (
    <QueryClientProvider client={client}>
      <Component />
    </QueryClientProvider>
  );
  return { ...render(view()), view, client };
}
const picker = () => screen.getByRole("combobox", { name: "Assigned to" });
async function ready() {
  await waitFor(() => expect(picker()).toBeEnabled());
}
async function settle<T>(pending: ReturnType<typeof deferred<T>>, value: T) {
  await act(async () => pending.resolve(value));
}
beforeEach(() => {
  vi.clearAllMocks();
  onlineManager.setOnline(true);
  state.account = account;
  state.loading = false;
  state.id = leadId;
  state.org = org;
  state.lead.mockReset().mockImplementation(() => Promise.resolve(record()));
  state.members.mockReset().mockResolvedValue(choices());
  state.assign
    .mockReset()
    .mockImplementation(({ data }: { data: { userId: string | null } }) =>
      Promise.resolve(ack(data.userId)),
    );
  state.status.mockReset().mockResolvedValue({ ok: true });
  state.note.mockReset().mockResolvedValue({ ok: true });
});
afterEach(() => {
  cleanup();
  onlineManager.setOnline(true);
});
describe("connected lead detail assignment", () => {
  it.each(["signed-out", "loading"])(
    "does not query or display private cached data during %s",
    (kind) => {
      state.account = kind === "signed-out" ? "" : account;
      state.loading = kind === "loading";
      show();
      expect(state.lead).not.toHaveBeenCalled();
      expect(state.members).not.toHaveBeenCalled();
      expect(screen.queryByText("Private retail inquiry")).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(
        kind === "loading" ? "Checking account" : "Sign in",
      );
    },
  );
  it("waits for a fresh matching primary before querying choices and preserves scoped signal keys", async () => {
    const pending = deferred<unknown>();
    state.lead.mockReturnValueOnce(pending.promise);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(["lead", leadId], record());
    client.setQueryData(["lead", account, leadId, org], record());
    show(client);
    expect(screen.queryByText("Private customer")).not.toBeInTheDocument();
    expect(state.members).not.toHaveBeenCalled();
    await settle(pending, record());
    await ready();
    expect(state.lead).toHaveBeenCalledWith({
      data: { id: leadId },
      signal: expect.any(AbortSignal),
    });
    expect(state.members).toHaveBeenCalledExactlyOnceWith({
      data: { orgId: org },
      signal: expect.any(AbortSignal),
    });
    const keys = client
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey);
    expect(keys).toContainEqual(["lead", account, leadId, org, expect.any(String)]);
    expect(keys).toContainEqual(["org-members", account, leadId, org, expect.any(String), 1]);
  });
  it.each(["wrong-org", "wrong-id", "malformed"])(
    "rejects %s primary without member reads or writes",
    async (kind) => {
      state.lead.mockResolvedValueOnce(
        kind === "wrong-org"
          ? record(leadId, uid(9))
          : kind === "wrong-id"
            ? record(uid(8), org)
            : {},
      );
      show();
      await screen.findByText("Could not load this lead. Please try again.");
      expect(state.members).not.toHaveBeenCalled();
      expect(state.assign).not.toHaveBeenCalled();
      expect(screen.queryByText("Private customer")).not.toBeInTheDocument();
    },
  );
  it("redacts primary errors, offers manual retry and never calls a failure an empty pipeline", async () => {
    state.lead.mockRejectedValueOnce(new Error("PRIVATE backend cause"));
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Retry lead" }));
    await ready();
    expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
    expect(state.lead).toHaveBeenCalledTimes(2);
  });
  it("keeps visible lead separate from a failed member lookup and retries only choices", async () => {
    state.members.mockRejectedValueOnce(new Error("PRIVATE member cause"));
    show();
    const retry = await screen.findByRole("button", { name: "Retry team members" });
    expect(picker()).toBeDisabled();
    expect(screen.getByText("Private customer")).toBeVisible();
    fireEvent.click(retry);
    await ready();
    expect(state.lead).toHaveBeenCalledTimes(1);
    expect(state.members).toHaveBeenCalledTimes(2);
  });
  it.each([
    [{ user_id: member, role: "member", profiles: { id: otherMember, full_name: "Wrong" } }],
    [choices()[0], choices()[0]],
    null,
  ])("refuses malformed/misbound/duplicate member choices: %j", async (rows) => {
    state.members.mockResolvedValueOnce(rows);
    show();
    await screen.findByRole("button", { name: "Retry team members" });
    expect(picker()).toBeDisabled();
    expect(state.assign).not.toHaveBeenCalled();
  });
  it("sends prior account/org intent and accepts only a matching assignment receipt", async () => {
    const { client } = show();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await ready();
    fireEvent.change(picker(), { target: { value: member } });
    await waitFor(() =>
      expect(state.success).toHaveBeenCalledExactlyOnceWith("Assignment recorded"),
    );
    expect(state.assign).toHaveBeenCalledExactlyOnceWith({
      data: { id: leadId, userId: member, expectedAccountId: account, expectedOrgId: org },
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["lead", account, leadId, org] });
  });
  it("allows explicit null unassignment", async () => {
    const row = record();
    Object.assign(row.lead, { assigned_to: member });
    state.lead.mockResolvedValue(row);
    show();
    await ready();
    fireEvent.change(picker(), { target: { value: "" } });
    await waitFor(() => expect(state.assign).toHaveBeenCalled());
    expect(state.assign.mock.calls[0][0].data.userId).toBeNull();
  });
  it("refuses a programmatically injected nonmember without dispatching", async () => {
    show();
    await ready();
    const select = picker();
    const option = document.createElement("option");
    option.value = uid(9);
    option.text = "Injected";
    select.append(option);
    fireEvent.change(select, { target: { value: uid(9) } });
    expect(state.assign).not.toHaveBeenCalled();
    expect(state.error).toHaveBeenCalledWith("Choose an available team member.");
  });
  it("locks same-tick duplicate and competing assignment events synchronously", async () => {
    const pending = deferred<unknown>();
    state.assign.mockReturnValueOnce(pending.promise);
    show();
    await ready();
    const select = picker() as HTMLSelectElement;
    act(() => {
      select.value = member;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      select.value = otherMember;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(state.assign).toHaveBeenCalledTimes(1);
    expect(select).toBeDisabled();
    await settle(pending, ack());
    expect(state.success).toHaveBeenCalledTimes(1);
  });
  it.each(["null", "legacy", "id", "org", "assignee"])(
    "holds unconfirmed dispatched receipts, without success or automatic retry: %s",
    async (kind) => {
      const valid = ack();
      expect(valid.assignment).toEqual({ id: leadId, organization_id: org, assigned_to: member });
      const result =
        kind === "null"
          ? null
          : kind === "legacy"
            ? { ok: true }
            : {
                ...valid,
                assignment: {
                  ...valid.assignment,
                  ...(kind === "id"
                    ? { id: uid(9) }
                    : kind === "org"
                      ? { organization_id: uid(9) }
                      : { assigned_to: otherMember }),
                },
              };
      state.assign.mockResolvedValueOnce(result);
      const { rerender, view } = show();
      await ready();
      fireEvent.change(picker(), { target: { value: member } });
      await screen.findByText(uncertain);
      expect(state.success).not.toHaveBeenCalled();
      expect(picker()).toBeDisabled();
      rerender(view());
      expect(picker()).toBeDisabled();
      fireEvent.change(picker(), { target: { value: otherMember } });
      expect(state.assign).toHaveBeenCalledTimes(1);
    },
  );
  it("holds rejected dispatched writes generically and keeps the note draft", async () => {
    state.assign.mockRejectedValueOnce(new Error("PRIVATE write cause"));
    show();
    await ready();
    fireEvent.change(screen.getByRole("textbox", { name: "Internal note" }), {
      target: { value: "Draft note" },
    });
    fireEvent.change(picker(), { target: { value: member } });
    await screen.findByText(uncertain);
    expect(screen.getByRole("textbox", { name: "Internal note" })).toHaveValue("Draft note");
    expect(state.error).toHaveBeenCalledExactlyOnceWith(uncertain);
    expect(state.success).not.toHaveBeenCalled();
  });
  it.each(
    ["account", "lead", "org", "loading", "sign-out", "unmount"].flatMap((change) =>
      ["resolve", "reject"].map((settlement) => ({ change, settlement })),
    ),
  )(
    "ignores late assignment $settlement after $change teardown",
    async ({ change, settlement }) => {
      const pending = deferred<unknown>();
      state.assign.mockReturnValueOnce(pending.promise);
      const { rerender, view, unmount, client } = show();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      await ready();
      fireEvent.change(picker(), { target: { value: member } });
      if (change === "account") state.account = uid(9);
      if (change === "lead") state.id = uid(9);
      if (change === "org") state.org = uid(9);
      if (change === "loading") state.loading = true;
      if (change === "sign-out") state.account = "";
      if (change === "unmount") unmount();
      else rerender(view());
      if (settlement === "resolve")
        await settle(pending, {
          ok: true,
          assignment: { id: leadId, organization_id: org, assigned_to: member },
        });
      else await act(async () => pending.reject(new Error("PRIVATE old assignment cause")));
      expect(state.success).not.toHaveBeenCalled();
      expect(state.error).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
    },
  );
  it.each(["account", "lead", "org"])(
    "never revives an old %s flight after A-B-A or releases the newer assignment",
    async (change) => {
      const old = deferred<unknown>(),
        next = deferred<unknown>();
      state.assign.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
      const { rerender, view } = show();
      await ready();
      fireEvent.change(picker(), { target: { value: member } });
      const before = { account: state.account, id: state.id, org: state.org };
      if (change === "account") state.account = uid(9);
      if (change === "lead") state.id = uid(9);
      if (change === "org") state.org = uid(9);
      rerender(view());
      Object.assign(state, before);
      rerender(view());
      await ready();
      fireEvent.change(picker(), { target: { value: otherMember } });
      await settle(old, ack());
      expect(state.success).not.toHaveBeenCalled();
      expect(picker()).toBeDisabled();
      await settle(next, ack(otherMember));
      expect(state.success).toHaveBeenCalledTimes(1);
    },
  );
  it("preserves a note draft during ordinary primary/member refetch", async () => {
    const { client } = show();
    await ready();
    fireEvent.change(screen.getByRole("textbox", { name: "Internal note" }), {
      target: { value: "Keep draft" },
    });
    await act(async () => {
      await client.invalidateQueries({ queryKey: ["lead", account, leadId, org] });
    });
    await ready();
    expect(screen.getByRole("textbox", { name: "Internal note" })).toHaveValue("Keep draft");
  });
  it.each(["lead", "org-members"])(
    "rejects same-tick assignment from invalidated %s evidence before React commits",
    async (key) => {
      const pending = deferred<unknown>();
      const { client } = show();
      await ready();
      if (key === "lead") state.lead.mockReturnValueOnce(pending.promise);
      else state.members.mockReturnValueOnce(pending.promise);
      act(() => {
        void client.invalidateQueries({ queryKey: [key, account] });
        fireEvent.change(picker(), { target: { value: member } });
      });
      expect(state.assign).not.toHaveBeenCalled();
      await settle(pending, key === "lead" ? record() : choices());
    },
  );
  it("refuses paused stale query evidence and does not show cached private details during a paused primary refresh", async () => {
    const { client } = show();
    await ready();
    onlineManager.setOnline(false);
    act(() => {
      void client.invalidateQueries({ queryKey: ["lead", account] });
    });
    await waitFor(() => expect(screen.queryByText("Private customer")).not.toBeInTheDocument());
    expect(state.assign).not.toHaveBeenCalled();
  });
  it.each(["lead", "org-members"])(
    "observes invalidate-without-refetch for %s and offers an honest explicit refresh",
    async (key) => {
      const { client } = show();
      await ready();
      await act(async () => {
        await client.invalidateQueries({ queryKey: [key, account], refetchType: "none" });
      });
      if (key === "lead") {
        expect(screen.queryByText("Private customer")).not.toBeInTheDocument();
        expect(screen.getByText("Refresh this lead before making changes.")).toBeVisible();
      } else {
        expect(picker()).toBeDisabled();
        expect(screen.queryByRole("option", { name: /Member one/ })).not.toBeInTheDocument();
      }
      fireEvent.click(
        screen.getByRole("button", { name: key === "lead" ? "Retry lead" : "Retry team members" }),
      );
      await ready();
      expect(state.assign).not.toHaveBeenCalled();
    },
  );
  it("holds a pending assignment if source refetch loses its witness, even after cancelled refetch restores old data", async () => {
    const pending = deferred<unknown>(),
      refresh = deferred<unknown>();
    state.assign.mockReturnValueOnce(pending.promise);
    const { client } = show();
    await ready();
    fireEvent.change(picker(), { target: { value: member } });
    state.lead.mockReturnValueOnce(refresh.promise);
    act(() => {
      void client.invalidateQueries({ queryKey: ["lead", account] });
    });
    await screen.findByText(uncertain);
    await act(async () => {
      await client.cancelQueries({ queryKey: ["lead", account] });
    });
    await settle(pending, ack());
    expect(state.success).not.toHaveBeenCalled();
    expect(state.error).not.toHaveBeenCalled();
    expect(screen.getByText(uncertain)).toBeVisible();
  });
  it.each(["status", "note"])(
    "fences late legacy %s callbacks and never clears a new account's draft",
    async (kind) => {
      const pending = deferred<unknown>();
      (kind === "status" ? state.status : state.note).mockReturnValueOnce(pending.promise);
      const { rerender, view, client } = show();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      await ready();
      if (kind === "status") fireEvent.click(screen.getByRole("button", { name: /^won$/ }));
      else {
        fireEvent.change(screen.getByRole("textbox", { name: "Internal note" }), {
          target: { value: "Old note" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Add note" }));
      }
      state.account = uid(9);
      rerender(view());
      await ready();
      fireEvent.change(screen.getByRole("textbox", { name: "Internal note" }), {
        target: { value: "New draft" },
      });
      await settle(pending, { ok: true });
      expect(screen.getByRole("textbox", { name: "Internal note" })).toHaveValue("New draft");
      expect(state.success).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
    },
  );
});
