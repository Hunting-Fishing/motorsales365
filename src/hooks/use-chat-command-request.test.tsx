import { useEffect } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHAT_COMMAND_FAILURE,
  type ChatCommandInput,
  type ChatCommandResult,
} from "@/lib/chat-commands";
import { useChatCommandRequest } from "./use-chat-command-request";

type Request = { data: ChatCommandInput; signal: AbortSignal };
const state = vi.hoisted(() => ({ command: vi.fn(), toast: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/chat-commands.functions", () => ({
  executeChatCommand: (request: Request) => state.command(request),
}));
vi.mock("sonner", () => ({ toast: { success: state.toast, error: state.toast } }));

const accountA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const accountB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const threadA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const threadB = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const target = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const request = (account = accountA, thread = threadA): ChatCommandInput => ({
  expectedAccountId: account,
  kind: "mark_read",
  threadId: thread,
});
function acknowledgement(input = request()): ChatCommandResult {
  if (input.kind === "create") return { kind: "created", threadId: threadB };
  if (input.kind === "invite")
    return { kind: "invited", threadId: input.threadId, insertedCount: 1 };
  return {
    kind: "acknowledged",
    operation: input.kind,
    threadId: input.threadId,
    effect: "unverified",
  };
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
function show(account = accountA, context: string | null = threadA) {
  return renderHook(
    ({ boundAccount, contextKey }) => useChatCommandRequest(boundAccount, contextKey),
    {
      initialProps: { boundAccount: account, contextKey: context },
    },
  );
}
// Hook/React lifecycle with a mocked server function only. No HTTP/JWT/RLS,
// delivery, database cancellation/rollback, row transition or server retry proof.
beforeEach(() => {
  state.command.mockReset();
  state.toast.mockReset();
});
afterEach(() => {
  cleanup();
  expect(state.toast).not.toHaveBeenCalled();
});

describe("useChatCommandRequest", () => {
  it("strictly validates, forwards one signal and preserves an unverified acknowledgement", async () => {
    const input = request();
    state.command.mockResolvedValue(acknowledgement(input));
    const { result } = show();
    let output: ChatCommandResult | null = null;
    await act(async () => {
      output = await result.current.run(input);
    });
    expect(output).toEqual(acknowledgement(input));
    expect(result.current.pending).toBe(false);
    expect(state.command).toHaveBeenCalledTimes(1);
    const sent = state.command.mock.calls[0][0] as Request;
    expect(sent.data).toEqual(input);
    expect(sent.signal).toBeInstanceOf(AbortSignal);
    expect(sent.signal.aborted).toBe(false);
  });

  it("allows null workspace context and accepts another nonselected thread without equating context to selector", async () => {
    const input = request(accountA, threadB);
    state.command.mockResolvedValue(acknowledgement(input));
    const { result } = show(accountA, null);
    await act(async () => {
      expect(await result.current.run(input)).toEqual(acknowledgement(input));
    });
    expect(state.command).toHaveBeenCalledTimes(1);
    expect(result.current.isCurrent()).toBe(true);
  });

  it("validates and normalizes create input before dispatch", async () => {
    const input: ChatCommandInput = {
      kind: "create",
      expectedAccountId: accountA.toUpperCase(),
      title: "  Group  ",
      memberIds: [target],
    };
    state.command.mockResolvedValue({ kind: "created", threadId: threadB });
    const { result } = show();
    await act(async () => {
      expect(await result.current.run(input)).toEqual({ kind: "created", threadId: threadB });
    });
    expect((state.command.mock.calls[0][0] as Request).data).toEqual({ ...input, title: "Group" });
  });

  it.each([
    { ...request(), threadId: "not-a-uuid" },
    { ...request(), kind: "unsupported" },
    { ...request(), ownerId: target },
    { kind: "respond", expectedAccountId: accountA, threadId: threadA, accept: null },
    {
      kind: "invite",
      expectedAccountId: accountA,
      threadId: threadA,
      memberIds: [target, target.toUpperCase()],
    },
    { kind: "create", expectedAccountId: accountA, title: " ", memberIds: [target] },
  ])("rejects malformed runtime input before dispatch", async (raw) => {
    const { result } = show();
    await act(async () => {
      await expect(result.current.run(raw as unknown as ChatCommandInput)).rejects.toThrow(
        CHAT_COMMAND_FAILURE,
      );
    });
    expect(state.command).not.toHaveBeenCalled();
    expect(result.current.pending).toBe(false);
  });

  it("rejects bound-account mismatch before dispatch without exposing validation details", async () => {
    const { result } = show();
    await act(async () => {
      await expect(result.current.run(request(accountB))).rejects.toThrow(CHAT_COMMAND_FAILURE);
    });
    expect(state.command).not.toHaveBeenCalled();
    expect(result.current.pending).toBe(false);
  });

  it("does not dispatch without a bound account", async () => {
    const { result } = show("");
    await act(async () => {
      expect(await result.current.run(request())).toBeNull();
    });
    expect(result.current.isCurrent()).toBe(false);
    expect(state.command).not.toHaveBeenCalled();
  });

  it.each(["sync", "rejected"])(
    "sanitizes current %s transport errors and never retries",
    async (mode) => {
      if (mode === "sync")
        state.command.mockImplementation(() => {
          throw new Error("private backend secret");
        });
      else state.command.mockRejectedValue(new Error("private backend secret"));
      const { result } = show();
      let caught: unknown;
      await act(async () => {
        try {
          await result.current.run(request());
        } catch (error) {
          caught = error;
        }
      });
      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toBe(CHAT_COMMAND_FAILURE);
      expect(state.command).toHaveBeenCalledTimes(1);
      expect(result.current.pending).toBe(false);
    },
  );

  it.each([
    null,
    { kind: "acknowledged", operation: "mark_read", threadId: threadA, effect: "confirmed" },
    { kind: "acknowledged", operation: "leave", threadId: threadA, effect: "unverified" },
    { kind: "acknowledged", operation: "mark_read", threadId: threadB, effect: "unverified" },
    { ...acknowledgement(), attachments: ["private"] },
  ])("sanitizes malformed current acknowledgements without retry", async (raw) => {
    state.command.mockResolvedValue(raw);
    const { result } = show();
    await act(async () => {
      await expect(result.current.run(request())).rejects.toThrow(CHAT_COMMAND_FAILURE);
    });
    expect(state.command).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBe(false);
  });

  it("blocks synchronous double submission with a ref before pending renders", async () => {
    const pending = deferred();
    state.command.mockReturnValue(pending.promise);
    const { result } = show();
    let first!: Promise<ChatCommandResult | null>;
    let second!: Promise<ChatCommandResult | null>;
    act(() => {
      first = result.current.run(request());
      second = result.current.run(request());
    });
    expect(state.command).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBe(true);
    await expect(second).resolves.toBeNull();
    await act(async () => {
      pending.resolve(acknowledgement());
      expect(await first).toEqual(acknowledgement());
    });
    expect(result.current.pending).toBe(false);
  });

  it.each(["thread", "account"])(
    "fences %s A-B-A late success without clearing the new flight",
    async (dimension) => {
      const old = deferred();
      const fresh = deferred();
      state.command.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
      const { result, rerender } = show();
      const oldRun = result.current.run;
      const oldCurrent = result.current.isCurrent;
      let first!: Promise<ChatCommandResult | null>;
      act(() => {
        first = oldRun(request());
      });
      const oldSignal = (state.command.mock.calls[0][0] as Request).signal;
      rerender({
        boundAccount: dimension === "account" ? accountB : accountA,
        contextKey: dimension === "thread" ? threadB : threadA,
      });
      expect(oldSignal.aborted).toBe(true);
      expect(oldCurrent()).toBe(false);
      expect(result.current.pending).toBe(false);
      rerender({ boundAccount: accountA, contextKey: threadA });
      await expect(oldRun(request())).resolves.toBeNull();
      expect(oldCurrent()).toBe(false);
      let second!: Promise<ChatCommandResult | null>;
      act(() => {
        second = result.current.run(request());
      });
      await act(async () => {
        old.resolve(acknowledgement());
        expect(await first).toBeNull();
      });
      expect(result.current.pending).toBe(true);
      expect(state.command).toHaveBeenCalledTimes(2);
      await act(async () => {
        fresh.resolve(acknowledgement());
        expect(await second).toEqual(acknowledgement());
      });
      expect(result.current.pending).toBe(false);
    },
  );

  it("fences late old rejection and malformed payload after a context switch", async () => {
    for (const reject of [false, true]) {
      const old = deferred();
      state.command.mockReturnValueOnce(old.promise);
      const shown = show();
      let first!: Promise<ChatCommandResult | null>;
      act(() => {
        first = shown.result.current.run(request());
      });
      shown.rerender({ boundAccount: accountA, contextKey: threadB });
      await act(async () => {
        if (reject) old.reject(new Error("private stale error"));
        else old.resolve({ private: "malformed stale payload" });
        expect(await first).toBeNull();
      });
      expect(shown.result.current.pending).toBe(false);
      shown.unmount();
    }
    expect(state.command).toHaveBeenCalledTimes(2);
  });

  it("aborts when null workspace context transitions to a selected thread", async () => {
    const old = deferred();
    state.command.mockReturnValue(old.promise);
    const { result, rerender } = show(accountA, null);
    let first!: Promise<ChatCommandResult | null>;
    act(() => {
      first = result.current.run(request(accountA, threadB));
    });
    rerender({ boundAccount: accountA, contextKey: threadA });
    expect((state.command.mock.calls[0][0] as Request).signal.aborted).toBe(true);
    await act(async () => {
      old.resolve(acknowledgement(request(accountA, threadB)));
      expect(await first).toBeNull();
    });
  });

  it.each(["success", "rejection"])(
    "unmount aborts and fences late %s and retained callbacks",
    async (mode) => {
      const old = deferred();
      state.command.mockReturnValue(old.promise);
      const { result, unmount } = show();
      const retained = result.current;
      let first!: Promise<ChatCommandResult | null>;
      act(() => {
        first = retained.run(request());
      });
      unmount();
      expect((state.command.mock.calls[0][0] as Request).signal.aborted).toBe(true);
      expect(retained.isCurrent()).toBe(false);
      await act(async () => {
        if (mode === "success") old.resolve(acknowledgement());
        else old.reject(new Error("private stale"));
        expect(await first).toBeNull();
      });
      await expect(retained.run(request())).resolves.toBeNull();
      expect(state.command).toHaveBeenCalledTimes(1);
    },
  );

  it("StrictMode cleanup/setup cannot revive the earlier request or clear a new pending one", async () => {
    const old = deferred();
    const fresh = deferred();
    state.command.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    const calls: Promise<ChatCommandResult | null>[] = [];
    const { result } = renderHook(
      () => {
        const value = useChatCommandRequest(accountA, threadA);
        const { run } = value;
        useEffect(() => {
          calls.push(run(request()));
        }, [run]);
        return value;
      },
      { reactStrictMode: true },
    );
    expect(state.command).toHaveBeenCalledTimes(2);
    expect((state.command.mock.calls[0][0] as Request).signal.aborted).toBe(true);
    expect((state.command.mock.calls[1][0] as Request).signal.aborted).toBe(false);
    await act(async () => {
      old.resolve(acknowledgement());
      expect(await calls[0]).toBeNull();
    });
    expect(result.current.pending).toBe(true);
    await act(async () => {
      fresh.resolve(acknowledgement());
      expect(await calls[1]).toEqual(acknowledgement());
    });
    expect(result.current.pending).toBe(false);
    expect(state.command).toHaveBeenCalledTimes(2);
  });
});
