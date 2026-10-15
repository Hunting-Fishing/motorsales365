import { beforeEach, describe, expect, it, vi } from "vitest";
import { readMessagesSnapshot, MESSAGES_LOAD_FAILURE } from "./messages-snapshot";

const state = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: state.from } }));
const account = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const thread = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const other = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
function deferred() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
function fixture(responses: Record<string, unknown[]>) {
  const reads: { table: string; operations: [string, ...unknown[]][] }[] = [];
  state.from.mockImplementation((table: string) => {
    const operations: [string, ...unknown[]][] = [];
    reads.push({ table, operations });
    const value = responses[table]?.shift() ?? { data: [], error: null };
    const query: Record<string, unknown> = {
      then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve(value).then(resolve, reject),
    };
    for (const method of ["select", "or", "order", "limit", "eq", "in", "abortSignal", "retry"]) {
      query[method] = (...args: unknown[]) => {
        operations.push([method, ...args]);
        return query;
      };
    }
    return query;
  });
  return reads;
}
beforeEach(() => vi.clearAllMocks());

describe("bounded browser message snapshot (mock readers only)", () => {
  it("returns empty maps rather than retaining previous metadata and binds the first reads", async () => {
    const reads = fixture({});
    const signal = new AbortController().signal;
    expect(await readMessagesSnapshot(account, signal, () => true)).toEqual({
      dms: [],
      groupMsgs: [],
      groupMembers: [],
      groupThreads: {},
      myMemberships: {},
      listingsById: {},
      profilesById: {},
    });
    expect(reads.map((r) => r.table)).toEqual(["messages", "chat_thread_members"]);
    expect(reads[0].operations).toContainEqual([
      "or",
      `sender_id.eq.${account},recipient_id.eq.${account}`,
    ]);
    expect(reads[0].operations).toContainEqual(["limit", 500]);
    expect(reads[1].operations).toContainEqual(["eq", "user_id", account]);
    for (const read of reads) {
      expect(read.operations).toContainEqual(["abortSignal", signal]);
      expect(read.operations).toContainEqual(["retry", false]);
    }
  });

  it("collects a complete visible snapshot without manufacturing membership timestamps", async () => {
    const membership = { thread_id: thread, status: "active", last_read_at: null };
    const reads = fixture({
      messages: [{ data: [], error: null }],
      chat_thread_members: [
        { data: [membership], error: null },
        { data: [{ thread_id: thread, user_id: other, status: "active" }], error: null },
      ],
      chat_threads: [
        {
          data: [
            { id: thread, title: "Team", created_by: account, updated_at: "2026-10-15T00:00:00Z" },
          ],
          error: null,
        },
      ],
      chat_thread_messages: [
        {
          data: [
            { id: "m", thread_id: thread, sender_id: other, created_at: "2026-10-15T00:00:00Z" },
          ],
          error: null,
        },
      ],
      public_profiles: [
        {
          data: [{ id: other, full_name: "Member", business_name: null, avatar_url: null }],
          error: null,
        },
      ],
    });
    const result = await readMessagesSnapshot(account, new AbortController().signal, () => true);
    expect(result.myMemberships[thread]).toEqual(membership);
    expect(result.groupThreads[thread].title).toBe("Team");
    expect(result.profilesById[other].full_name).toBe("Member");
    expect(reads.find((r) => r.table === "chat_thread_messages")?.operations).toContainEqual([
      "limit",
      1000,
    ]);
  });

  it.each([
    { error: { message: "PRIVATE database error" }, data: [] },
    { error: null, data: null },
    { error: null, data: {} },
  ])("rejects resolved failures/malformed lists with generic copy", async (response) => {
    fixture({ messages: [response] });
    await expect(
      readMessagesSnapshot(account, new AbortController().signal, () => true),
    ).rejects.toThrow(MESSAGES_LOAD_FAILURE);
    expect(state.from).toHaveBeenCalledTimes(2);
  });

  it("does not dispatch subsequent stages after an account/lifetime change even if abort is ignored", async () => {
    const old = deferred();
    fixture({
      messages: [old.promise],
      chat_thread_members: [{ data: [{ thread_id: thread }], error: null }],
    });
    let current = true;
    const pending = readMessagesSnapshot(account, new AbortController().signal, () => current);
    const rejected = expect(pending).rejects.toThrow(MESSAGES_LOAD_FAILURE);
    current = false;
    old.resolve({ data: [], error: null });
    await rejected;
    expect(state.from).toHaveBeenCalledTimes(2);
  });

  it("checks cancellation before first dispatch and between stages", async () => {
    fixture({});
    const controller = new AbortController();
    controller.abort();
    await expect(readMessagesSnapshot(account, controller.signal, () => true)).rejects.toThrow(
      MESSAGES_LOAD_FAILURE,
    );
    expect(state.from).not.toHaveBeenCalled();
    const old = deferred();
    fixture({
      messages: [old.promise],
      chat_thread_members: [{ data: [{ thread_id: thread }], error: null }],
    });
    const next = new AbortController();
    const pending = readMessagesSnapshot(account, next.signal, () => true);
    const rejected = expect(pending).rejects.toThrow(MESSAGES_LOAD_FAILURE);
    next.abort();
    old.resolve({ data: [], error: null });
    await rejected;
    expect(state.from).toHaveBeenCalledTimes(2);
  });

  it("rejects a later metadata error instead of publishing a partial snapshot", async () => {
    fixture({
      messages: [
        {
          data: [
            {
              listing_id: "listing",
              sender_id: account,
              recipient_id: other,
              created_at: "2026-10-15",
            },
          ],
          error: null,
        },
      ],
      listings: [{ data: [], error: { message: "PRIVATE metadata" } }],
    });
    await expect(
      readMessagesSnapshot(account, new AbortController().signal, () => true),
    ).rejects.toThrow(MESSAGES_LOAD_FAILURE);
    expect(state.from.mock.calls.some(([table]) => table === "public_profiles")).toBe(false);
  });
});
