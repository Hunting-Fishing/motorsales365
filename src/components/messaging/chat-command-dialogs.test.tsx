import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CHAT_COMMAND_FAILURE, MAX_CHAT_MEMBERS, type ChatCommandInput } from "@/lib/chat-commands";
import type { UserPick } from "./user-search";
import { NewGroupChatDialog } from "./new-group-chat-dialog";
import { InviteToThreadDialog } from "./invite-to-thread-dialog";

// Real input/result parsers and React lifetimes; only the server adapter,
// Dialog and people search are mocked. No HTTP/JWT/RLS, database cancellation,
// changed-row confirmation, notification delivery or browser acceptance claim.
type Request = { data: ChatCommandInput; signal: AbortSignal };
type Mode = "create" | "invite";
const accountA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const accountB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const threadA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const threadB = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const createdThread = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const state = vi.hoisted(() => ({
  execute: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  browser: vi.fn(),
  picks: [] as UserPick[],
  dismisses: [] as ((open: boolean) => void)[],
  exclusions: [] as string[][],
}));
vi.mock("@/lib/chat-commands.functions", () => ({
  executeChatCommand: (request: Request) => state.execute(request),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("sonner", () => ({ toast: { success: state.success, error: state.error } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => state.browser(...args),
    from: (...args: unknown[]) => state.browser(...args),
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
}));
vi.mock("./user-search", () => ({
  UserSearch: ({
    selected,
    onChange,
    excludeIds,
  }: {
    selected: UserPick[];
    onChange: (members: UserPick[]) => void;
    excludeIds: string[];
  }) => {
    state.exclusions.push(excludeIds);
    return (
      <div>
        <button type="button" onClick={() => onChange(state.picks)}>
          Choose people
        </button>
        <output data-testid="selected-members">
          {selected.map((member) => member.name).join(",")}
        </output>
      </div>
    );
  },
}));

const pick = (index = 1): UserPick => ({
  id: "00000000-0000-4000-8000-" + index.toString(16).padStart(12, "0"),
  name: "Person " + index,
  avatar_url: null,
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
function response(mode: Mode, threadId = threadA) {
  return mode === "create"
    ? { kind: "created", threadId: createdThread }
    : { kind: "invited", threadId, insertedCount: 1 };
}
function show(mode: Mode) {
  let props = { open: true, currentUserId: accountA, threadId: threadA };
  const changed = vi.fn();
  const created = vi.fn();
  const invited = vi.fn();
  const view = () =>
    mode === "create" ? (
      <NewGroupChatDialog
        open={props.open}
        currentUserId={props.currentUserId}
        onOpenChange={changed}
        onCreated={created}
      />
    ) : (
      <InviteToThreadDialog
        {...props}
        threadTitle="Workshop group"
        excludeIds={[pick(9).id]}
        onOpenChange={changed}
        onInvited={invited}
      />
    );
  const shown = render(view());
  return {
    ...shown,
    changed,
    created,
    invited,
    update: (next: Partial<typeof props>) => {
      props = { ...props, ...next };
      shown.rerender(view());
    },
  };
}
function prepare(mode: Mode, members = [pick()], title = "  Workshop team  ") {
  if (mode === "create")
    fireEvent.change(screen.getByLabelText("Group name"), { target: { value: title } });
  state.picks = members;
  fireEvent.click(screen.getByRole("button", { name: "Choose people" }));
}
function submit(mode: Mode) {
  fireEvent.submit(
    screen.getByRole("form", {
      name: mode === "create" ? "Create group chat" : "Invite group members",
    }),
  );
}
function requests() {
  return state.execute.mock.calls.map(([request]) => request as Request);
}
async function finish(pending: ReturnType<typeof deferred>, value: unknown, reject = false) {
  await act(async () => {
    if (reject) pending.reject(value);
    else pending.resolve(value);
    await pending.promise.catch(() => undefined);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.picks = [];
  state.dismisses = [];
  state.exclusions = [];
  state.execute.mockImplementation(async ({ data }: Request) =>
    data.kind === "create"
      ? response("create")
      : response("invite", "threadId" in data ? data.threadId : threadA),
  );
});
afterEach(() => {
  cleanup();
  expect(state.browser).not.toHaveBeenCalled();
});

describe("Request-bound chat command dialogs", () => {
  it.each<Mode>(["create", "invite"])("mounts no form or command while %s is closed", (mode) => {
    const shown = show(mode);
    shown.update({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(state.execute).not.toHaveBeenCalled();
  });

  it("submits a trimmed strict create input with a live AbortSignal and confirms only a parsed UUID", async () => {
    const shown = show("create");
    prepare("create");
    submit("create");
    await waitFor(() => expect(shown.created).toHaveBeenCalledWith(createdThread));
    expect(requests()[0].data).toEqual({
      expectedAccountId: accountA,
      kind: "create",
      title: "Workshop team",
      memberIds: [pick().id],
    });
    expect(requests()[0].signal).toBeInstanceOf(AbortSignal);
    expect(state.success).toHaveBeenCalledWith("Group created; invitations recorded.");
    expect(shown.changed).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(state.error).not.toHaveBeenCalled();
  });

  it("uses the exact invite actor/thread input and excludes the actor from search choices", async () => {
    const shown = show("invite");
    prepare("invite");
    submit("invite");
    await waitFor(() => expect(shown.invited).toHaveBeenCalledTimes(1));
    expect(requests()[0].data).toEqual({
      expectedAccountId: accountA,
      kind: "invite",
      threadId: threadA,
      memberIds: [pick().id],
    });
    expect(state.exclusions.at(-1)).toEqual([pick(9).id, accountA]);
    expect(state.success).toHaveBeenCalledWith("1 invitation recorded.");
  });

  it("accepts a valid zero count without claiming new memberships or delivery", async () => {
    state.execute.mockResolvedValue({
      kind: "invited",
      threadId: threadA.toUpperCase(),
      insertedCount: 0,
    });
    const shown = show("invite");
    prepare("invite");
    submit("invite");
    await waitFor(() => expect(shown.invited).toHaveBeenCalledTimes(1));
    expect(state.success).toHaveBeenCalledWith("No new memberships added.");
  });

  const malformed: { mode: Mode; label: string; value: unknown }[] = [
    { mode: "create", label: "missing UUID", value: { kind: "created", threadId: null } },
    { mode: "create", label: "malformed UUID", value: { kind: "created", threadId: "PRIVATE" } },
    {
      mode: "create",
      label: "extra fields",
      value: { kind: "created", threadId: createdThread, secret: "PRIVATE" },
    },
    {
      mode: "create",
      label: "resolved raw RPC error",
      value: { data: null, error: { message: "PRIVATE" } },
    },
    { mode: "create", label: "null result", value: null },
    {
      mode: "create",
      label: "wrong kind",
      value: { kind: "invited", threadId: threadA, insertedCount: 1 },
    },
    {
      mode: "invite",
      label: "wrong thread",
      value: { kind: "invited", threadId: threadB, insertedCount: 1 },
    },
    {
      mode: "invite",
      label: "null count",
      value: { kind: "invited", threadId: threadA, insertedCount: null },
    },
    {
      mode: "invite",
      label: "string count",
      value: { kind: "invited", threadId: threadA, insertedCount: "1" },
    },
    {
      mode: "invite",
      label: "fraction",
      value: { kind: "invited", threadId: threadA, insertedCount: 0.5 },
    },
    {
      mode: "invite",
      label: "negative count",
      value: { kind: "invited", threadId: threadA, insertedCount: -1 },
    },
    {
      mode: "invite",
      label: "excess count",
      value: { kind: "invited", threadId: threadA, insertedCount: 2 },
    },
    { mode: "invite", label: "wrong kind", value: { kind: "created", threadId: createdThread } },
    {
      mode: "invite",
      label: "resolved raw RPC error",
      value: { data: null, error: { message: "PRIVATE" } },
    },
  ];
  it.each(malformed)(
    "preserves the $mode draft for $label and reports only unknown outcome guidance",
    async ({ mode, value }) => {
      state.execute.mockResolvedValue(value);
      const shown = show(mode);
      prepare(mode);
      submit(mode);
      await waitFor(() => expect(state.error).toHaveBeenCalledWith(CHAT_COMMAND_FAILURE));
      expect(state.success).not.toHaveBeenCalled();
      expect(shown.created).not.toHaveBeenCalled();
      expect(shown.invited).not.toHaveBeenCalled();
      expect(shown.changed).not.toHaveBeenCalled();
      expect(screen.getByTestId("selected-members")).toHaveTextContent("Person 1");
      if (mode === "create")
        expect(screen.getByLabelText("Group name")).toHaveValue("  Workshop team  ");
      expect(JSON.stringify(state.error.mock.calls)).not.toContain("PRIVATE");
    },
  );

  it.each<Mode>(["create", "invite"])(
    "clears a current %s rejected request for explicit retry without losing the draft",
    async (mode) => {
      state.execute.mockRejectedValueOnce(new Error("PRIVATE rejection"));
      const shown = show(mode);
      prepare(mode);
      submit(mode);
      await waitFor(() => expect(state.error).toHaveBeenCalledWith(CHAT_COMMAND_FAILURE));
      expect(
        screen.getByRole("button", { name: mode === "create" ? "Create group" : "Send invites" }),
      ).toBeEnabled();
      expect(screen.getByTestId("selected-members")).toHaveTextContent("Person 1");
      submit(mode);
      await waitFor(() => expect(state.success).toHaveBeenCalledTimes(1));
      expect(state.execute).toHaveBeenCalledTimes(2);
      expect(mode === "create" ? shown.created : shown.invited).toHaveBeenCalledTimes(1);
    },
  );

  it.each<Mode>(["create", "invite"])(
    "allows only one in-flight %s submission even through direct form events",
    async (mode) => {
      const pending = deferred();
      state.execute.mockReturnValue(pending.promise);
      show(mode);
      prepare(mode);
      submit(mode);
      submit(mode);
      expect(state.execute).toHaveBeenCalledTimes(1);
      expect(requests()[0].signal.aborted).toBe(false);
      await finish(pending, response(mode));
    },
  );

  it.each(["create", "invite"] as const)(
    "rejects malformed/self/duplicate member inputs in %s without dispatch",
    (mode) => {
      show(mode);
      for (const members of [
        [{ ...pick(), id: "not-a-uuid" }],
        [{ ...pick(), id: accountA.toUpperCase() }],
        [pick(), { ...pick(), id: pick().id.toUpperCase() }],
        [],
      ]) {
        prepare(mode, members);
        submit(mode);
      }
      expect(state.execute).not.toHaveBeenCalled();
      expect(state.success).not.toHaveBeenCalled();
      expect(state.error).toHaveBeenCalledTimes(4);
    },
  );

  it("rejects empty/oversize titles and malformed actor IDs before create dispatch", () => {
    const shown = show("create");
    for (const title of ["  ", "x".repeat(81)]) {
      prepare("create", [pick()], title);
      submit("create");
    }
    shown.update({ currentUserId: "invalid" });
    prepare("create");
    submit("create");
    expect(state.execute).not.toHaveBeenCalled();
    expect(state.error).toHaveBeenCalledTimes(3);
  });

  it("rejects malformed invite actor/thread IDs before dispatch", () => {
    const shown = show("invite");
    shown.update({ currentUserId: "invalid" });
    prepare("invite");
    submit("invite");
    shown.update({ currentUserId: accountA, threadId: "invalid" });
    prepare("invite");
    submit("invite");
    expect(state.execute).not.toHaveBeenCalled();
    expect(state.error).toHaveBeenCalledTimes(2);
  });

  it.each<Mode>(["create", "invite"])(
    "caps %s selection at100 without silently truncating and accepts100 valid picks",
    async (mode) => {
      state.execute.mockImplementation(async ({ data }: Request) =>
        data.kind === "create"
          ? response("create")
          : { kind: "invited", threadId: threadA, insertedCount: MAX_CHAT_MEMBERS },
      );
      show(mode);
      prepare(mode);
      state.picks = Array.from({ length: MAX_CHAT_MEMBERS + 1 }, (_, index) => pick(index + 1));
      fireEvent.click(screen.getByRole("button", { name: "Choose people" }));
      expect(state.error).toHaveBeenCalledWith("Select at most 100 people.");
      expect(screen.getByTestId("selected-members")).toHaveTextContent(/^Person 1$/);
      expect(state.execute).not.toHaveBeenCalled();
      prepare(mode, state.picks.slice(0, MAX_CHAT_MEMBERS));
      submit(mode);
      await waitFor(() => expect(state.success).toHaveBeenCalledTimes(1));
      const input = requests()[0].data;
      expect("memberIds" in input && input.memberIds).toHaveLength(MAX_CHAT_MEMBERS);
    },
  );

  it.each([
    { mode: "create" as Mode, reject: false },
    { mode: "create" as Mode, reject: true },
    { mode: "invite" as Mode, reject: false },
    { mode: "invite" as Mode, reject: true },
  ])(
    "suppresses a $mode late completion after close/reopen (reject=$reject), including old dismiss handlers",
    async ({ mode, reject }) => {
      const old = deferred();
      const fresh = deferred();
      state.execute.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
      const shown = show(mode);
      prepare(mode);
      submit(mode);
      const oldDismiss = state.dismisses.at(-1)!;
      fireEvent.click(screen.getByRole("button", { name: "Dismiss dialog" }));
      expect(requests()[0].signal.aborted).toBe(true);
      shown.update({ open: false });
      shown.update({ open: true });
      prepare(mode, [pick(2)], "Fresh draft");
      submit(mode);
      shown.changed.mockClear();
      act(() => oldDismiss(false));
      await finish(old, reject ? new Error("PRIVATE old failure") : response(mode), reject);
      expect(state.error).not.toHaveBeenCalled();
      expect(state.success).not.toHaveBeenCalled();
      expect(shown.changed).not.toHaveBeenCalled();
      expect(shown.created).not.toHaveBeenCalled();
      expect(shown.invited).not.toHaveBeenCalled();
      expect(screen.getByTestId("selected-members")).toHaveTextContent("Person 2");
      expect(
        screen.getByRole("button", { name: mode === "create" ? "Creating…" : "Recording…" }),
      ).toBeDisabled();
      expect(requests()[1].signal.aborted).toBe(false);
      await finish(fresh, response(mode));
      expect(state.success).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    { mode: "create" as Mode, reject: false },
    { mode: "create" as Mode, reject: true },
    { mode: "invite" as Mode, reject: false },
    { mode: "invite" as Mode, reject: true },
  ])(
    "suppresses old $mode account A→B→A completion without clearing the replacement request (reject=$reject)",
    async ({ mode, reject }) => {
      const old = deferred();
      const fresh = deferred();
      state.execute.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
      const shown = show(mode);
      prepare(mode);
      submit(mode);
      shown.update({ currentUserId: accountB });
      shown.update({ currentUserId: accountA });
      expect(requests()[0].signal.aborted).toBe(true);
      expect(screen.getByTestId("selected-members")).toBeEmptyDOMElement();
      prepare(mode, [pick(2)]);
      submit(mode);
      await finish(old, reject ? new Error("PRIVATE old account failure") : response(mode), reject);
      expect(state.error).not.toHaveBeenCalled();
      expect(state.success).not.toHaveBeenCalled();
      expect(shown.changed).not.toHaveBeenCalled();
      expect(screen.getByTestId("selected-members")).toHaveTextContent("Person 2");
      expect(requests()[1].signal.aborted).toBe(false);
      await finish(fresh, response(mode));
      expect(state.success).toHaveBeenCalledTimes(1);
    },
  );

  it.each([false, true])(
    "suppresses old invite thread A→B→A completion and never resets the new draft (reject=%s)",
    async (reject) => {
      const old = deferred();
      state.execute.mockReturnValueOnce(old.promise);
      const shown = show("invite");
      prepare("invite");
      submit("invite");
      shown.update({ threadId: threadB });
      shown.update({ threadId: threadA });
      prepare("invite", [pick(2)]);
      await finish(
        old,
        reject ? new Error("PRIVATE old thread failure") : response("invite"),
        reject,
      );
      expect(requests()[0].signal.aborted).toBe(true);
      expect(state.error).not.toHaveBeenCalled();
      expect(state.success).not.toHaveBeenCalled();
      expect(shown.changed).not.toHaveBeenCalled();
      expect(shown.invited).not.toHaveBeenCalled();
      expect(screen.getByTestId("selected-members")).toHaveTextContent("Person 2");
    },
  );

  it.each([
    { mode: "create" as Mode, reject: false },
    { mode: "create" as Mode, reject: true },
    { mode: "invite" as Mode, reject: false },
    { mode: "invite" as Mode, reject: true },
  ])("suppresses $mode unmount completions (reject=$reject)", async ({ mode, reject }) => {
    const pending = deferred();
    state.execute.mockReturnValue(pending.promise);
    const shown = show(mode);
    prepare(mode);
    submit(mode);
    shown.unmount();
    expect(requests()[0].signal.aborted).toBe(true);
    await finish(pending, reject ? new Error("PRIVATE unmount failure") : response(mode), reject);
    expect(state.error).not.toHaveBeenCalled();
    expect(state.success).not.toHaveBeenCalled();
    expect(shown.changed).not.toHaveBeenCalled();
    expect(shown.created).not.toHaveBeenCalled();
    expect(shown.invited).not.toHaveBeenCalled();
  });
});
