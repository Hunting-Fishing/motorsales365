import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "./dashboard.messages";
import { CHAT_COMMAND_FAILURE } from "@/lib/chat-commands";
import { MESSAGES_LOAD_FAILURE, type MessagesSnapshot } from "@/lib/messages-snapshot";

const accountA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const accountB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const threadA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const threadB = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const other = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const state = vi.hoisted(() => ({
  account: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as string | null,
  loading: false,
  read: vi.fn(),
  command: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  realtime: [] as (() => void)[],
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.account ? { id: state.account } : null, loading: state.loading }),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/chat-commands.functions", () => ({
  executeChatCommand: (request: unknown) => state.command(request),
}));
vi.mock("@/lib/messages-snapshot", async (original) => ({
  ...(await original<typeof import("@/lib/messages-snapshot")>()),
  readMessagesSnapshot: (...args: unknown[]) => state.read(...args),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: state.from,
    rpc: state.rpc,
    channel: () => {
      const channel = {
        on: (_kind: unknown, _filter: unknown, callback: () => void) => {
          state.realtime.push(callback);
          return channel;
        },
        subscribe: () => channel,
      };
      return channel;
    },
    removeChannel: vi.fn(),
  },
}));
vi.mock("sonner", () => ({
  toast: { success: state.success, error: state.error, info: state.info },
}));
vi.mock("@/hooks/use-thread-states", () => ({
  dmKey: (listing: string, user: string) => `${listing}:${user}`,
  useThreadStates: () => ({
    get: () => ({ starred: false, archived: false, muted: false, spam: false, color_label: null }),
    toggle: vi.fn(),
    patch: vi.fn(),
  }),
}));
vi.mock("@/components/messaging/new-group-chat-dialog", () => ({ NewGroupChatDialog: () => null }));
vi.mock("@/components/messaging/invite-to-thread-dialog", () => ({
  InviteToThreadDialog: () => null,
}));
vi.mock("@/components/messaging/message-composer", () => ({
  MessageComposer: () => <input aria-label="Message draft" />,
}));
vi.mock("@/components/messaging/quick-replies-popover", () => ({ QuickRepliesButton: () => null }));
vi.mock("@/components/messaging/make-offer-button", () => ({ MakeOfferButton: () => null }));

// Mock snapshots and server dispatch only: no real JWT/HTTP/RLS/realtime,
// storage, delivery, DM writes, profile provenance or production acceptance.
const MessagesPage = Route.options.component as React.ComponentType;
function deferred<T = unknown>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function snapshot({
  invited = false,
  unread = false,
  title = "Team A",
  thread = threadA,
} = {}): MessagesSnapshot {
  return {
    dms: [],
    groupMsgs: unread
      ? [
          {
            id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
            thread_id: thread,
            sender_id: other,
            body: "Inbound message",
            created_at: "2026-10-15T00:00:00Z",
            attachment_url: null,
            attachment_type: null,
            attachment_thumb_url: null,
            attachment_path: null,
            attachment_meta: null,
          },
        ]
      : [],
    groupThreads: {
      [thread]: { id: thread, title, created_by: other, updated_at: "2026-10-15T00:00:00Z" },
    },
    groupMembers: [{ thread_id: thread, user_id: other, status: "active" }],
    myMemberships: {
      [thread]: { thread_id: thread, status: invited ? "invited" : "active", last_read_at: null },
    },
    listingsById: {},
    profilesById: {},
  };
}
function ack(kind = "respond", thread = threadA) {
  return { kind: "acknowledged", operation: kind, threadId: thread, effect: "unverified" };
}
beforeEach(() => {
  vi.clearAllMocks();
  state.account = accountA;
  state.loading = false;
  state.realtime = [];
  state.read.mockReset().mockResolvedValue(snapshot());
  state.command.mockReset().mockResolvedValue(ack());
  state.from.mockImplementation(() => {
    throw new Error("Unexpected direct table access");
  });
  state.rpc.mockImplementation(() => {
    throw new Error("Scoped commands must not use browser RPC");
  });
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { value: vi.fn(), configurable: true });
  window.history.replaceState(null, "", "/dashboard/messages");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("message command route integration", () => {
  it("does not read or display private workspace state when signed out or auth is loading", async () => {
    state.account = null;
    const view = render(<MessagesPage />);
    expect(screen.getByText("Sign in to view messages.")).toBeInTheDocument();
    expect(state.read).not.toHaveBeenCalled();
    state.account = accountA;
    state.loading = true;
    view.rerender(<MessagesPage />);
    expect(screen.getByText("Loading account…")).toBeInTheDocument();
    expect(state.read).not.toHaveBeenCalled();
  });

  it("does not fabricate a read timestamp or retry after a resolved malformed/error response", async () => {
    state.read.mockResolvedValue(snapshot({ unread: true }));
    state.command.mockResolvedValue({ error: { message: "PRIVATE backend" }, data: null });
    render(<MessagesPage />);
    await waitFor(() => expect(state.command).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(state.error).toHaveBeenCalledWith(CHAT_COMMAND_FAILURE));
    expect(screen.getByRole("button", { name: "Mark as read" })).toBeEnabled();
    expect(state.read).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Refresh messages" }));
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(2));
    expect(state.command).toHaveBeenCalledTimes(1);
    expect(state.success).not.toHaveBeenCalled();
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("reads membership back after automatic acknowledgement without looping on a no-op", async () => {
    state.read.mockResolvedValue(snapshot({ unread: true }));
    state.command.mockResolvedValue(ack("mark_read"));
    render(<MessagesPage />);
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(2));
    expect(state.command).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Mark as read" })).toBeEnabled();
    expect(state.info).not.toHaveBeenCalled();
    expect(state.success).not.toHaveBeenCalled();
  });

  it("acknowledges join/decline without claiming success or hiding an unchanged invitation", async () => {
    state.read.mockResolvedValue(snapshot({ invited: true }));
    const pending = deferred();
    state.command.mockReturnValueOnce(pending.promise).mockResolvedValue(ack());
    render(<MessagesPage />);
    const join = await screen.findByRole("button", { name: "Join group" });
    fireEvent.click(join);
    fireEvent.click(join);
    expect(state.command).toHaveBeenCalledTimes(1);
    expect(state.command.mock.calls[0][0].data).toEqual({
      expectedAccountId: accountA,
      kind: "respond",
      threadId: threadA,
      accept: true,
    });
    await act(async () => pending.resolve(ack()));
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(2));
    expect(state.info).toHaveBeenCalledWith(expect.stringContaining("not yet verified"));
    expect(screen.getByRole("button", { name: "Join group" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(3));
    expect(state.command.mock.calls[1][0].data.accept).toBe(false);
    expect(screen.getByRole("button", { name: "Join group" })).toBeInTheDocument();
    expect(state.success).not.toHaveBeenCalled();
  });

  it("does not automatically undo explicit unread for an initially read inbound watermark", async () => {
    const read = snapshot({ unread: true });
    read.myMemberships[threadA].last_read_at = "2026-10-15T00:01:00Z";
    state.read.mockResolvedValueOnce(read).mockResolvedValue(snapshot({ unread: true }));
    state.command.mockResolvedValue(ack("mark_unread"));
    render(<MessagesPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Mark as unread" }));
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Mark as read" })).toBeEnabled();
    expect(state.command).toHaveBeenCalledTimes(1);
    expect(state.command.mock.calls[0][0].data.kind).toBe("mark_unread");
  });

  it("suppresses an old account command result after A-B-A and aborts its signal", async () => {
    state.read.mockResolvedValue(snapshot({ invited: true }));
    const pending = deferred();
    state.command.mockReturnValue(pending.promise);
    const view = render(<MessagesPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Join group" }));
    const request = state.command.mock.calls[0][0];
    state.account = accountB;
    view.rerender(<MessagesPage />);
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(2));
    state.account = accountA;
    view.rerender(<MessagesPage />);
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(3));
    expect(request.signal.aborted).toBe(true);
    await act(async () => pending.resolve(ack()));
    expect(state.read).toHaveBeenCalledTimes(3);
    expect(state.info).not.toHaveBeenCalled();
    expect(state.error).not.toHaveBeenCalled();
  });

  it("does not publish an older overlapping read and aborts it", async () => {
    const old = deferred<MessagesSnapshot>();
    state.read
      .mockReturnValueOnce(old.promise)
      .mockResolvedValue(snapshot({ title: "Current Team" }));
    render(<MessagesPage />);
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
    await act(async () => {
      state.realtime[0]();
    });
    await waitFor(() => expect(screen.getAllByText("Current Team").length).toBeGreaterThan(0));
    expect(state.read.mock.calls[0][1].aborted).toBe(true);
    expect(state.read.mock.calls[0][2]()).toBe(false);
    await act(async () => old.resolve(snapshot({ title: "Old private team" })));
    expect(screen.queryByText("Old private team")).not.toBeInTheDocument();
  });

  it("holds route group actions while a same-account refresh is pending", async () => {
    const pending = deferred<MessagesSnapshot>();
    state.read.mockResolvedValueOnce(snapshot()).mockReturnValue(pending.promise);
    render(<MessagesPage />);
    await screen.findByRole("button", { name: "Mark as unread" });
    await act(async () => {
      state.realtime[0]();
    });
    const unread = screen.getByRole("button", { name: "Mark as unread" });
    expect(unread).toBeDisabled();
    fireEvent.click(unread);
    expect(state.command).not.toHaveBeenCalled();
    await act(async () => pending.resolve(snapshot()));
    expect(unread).toBeEnabled();
  });

  it("clears old account rows immediately and ignores its late load after A-B-A", async () => {
    const old = deferred<MessagesSnapshot>();
    state.read
      .mockReturnValueOnce(old.promise)
      .mockResolvedValue(snapshot({ title: "New context" }));
    const view = render(<MessagesPage />);
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
    state.account = accountB;
    view.rerender(<MessagesPage />);
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(2));
    state.account = accountA;
    view.rerender(<MessagesPage />);
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(3));
    await act(async () => old.resolve(snapshot({ title: "Old secret" })));
    expect(screen.queryByText("Old secret")).not.toBeInTheDocument();
    expect(state.read.mock.calls[0][1].aborted).toBe(true);
  });

  it("masks previous rows on a failed refresh, shows generic retry, then recovers", async () => {
    state.read
      .mockResolvedValueOnce(snapshot())
      .mockRejectedValueOnce(new Error("PRIVATE"))
      .mockResolvedValue(snapshot({ title: "Recovered Team", thread: threadB }));
    render(<MessagesPage />);
    await screen.findAllByText("Team A");
    fireEvent.click(screen.getByRole("button", { name: "Refresh messages" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(MESSAGES_LOAD_FAILURE);
    expect(screen.queryByText("Team A")).not.toBeInTheDocument();
    expect(screen.queryByText("PRIVATE")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh messages" }));
    await screen.findAllByText("Recovered Team");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
