// Pure synthetic request/result contracts, not SQL, JWT or delivery proof.
import { describe, expect, it } from "vitest";
import {
  CHAT_COMMAND_FAILURE,
  MAX_CHAT_MEMBERS,
  MAX_CHAT_TITLE_LENGTH,
  chatCommandInput,
  parseChatCommandResult,
  type ChatCommandInput,
} from "./chat-commands";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const expectedAccountId = uuid(1);
const threadId = "00000000-0000-4000-8000-0000000000ab";
const create: ChatCommandInput = {
  expectedAccountId,
  kind: "create",
  title: "Group",
  memberIds: [uuid(2), uuid(3)],
};
const invite: ChatCommandInput = {
  expectedAccountId,
  kind: "invite",
  threadId,
  memberIds: [uuid(2), uuid(3)],
};
const voidKinds = ["respond", "leave", "mark_read", "mark_unread"] as const;
const voidInput = (kind: (typeof voidKinds)[number]): ChatCommandInput =>
  kind === "respond"
    ? { expectedAccountId, kind, threadId, accept: true }
    : { expectedAccountId, kind, threadId };
const ack = (operation: (typeof voidKinds)[number]) => ({
  kind: "acknowledged",
  operation,
  threadId,
  effect: "unverified",
});

describe("strict bounded chat command requests", () => {
  it("exports the explicit UI request bounds", () => {
    expect(MAX_CHAT_MEMBERS).toBe(100);
    expect(MAX_CHAT_TITLE_LENGTH).toBe(80);
  });
  it("accepts all six fixed operations and trims only the create title", () => {
    expect(chatCommandInput.parse({ ...create, title: "  Group  " })).toEqual(create);
    expect(chatCommandInput.parse(invite)).toEqual(invite);
    for (const kind of voidKinds)
      expect(chatCommandInput.parse(voidInput(kind))).toEqual(voidInput(kind));
  });
  it("accepts exactly80 trimmed title characters and100 distinct other members", () => {
    const input = {
      ...create,
      title: ` ${"x".repeat(80)} `,
      memberIds: Array.from({ length: 100 }, (_, n) => uuid(n + 100)),
    };
    const parsed = chatCommandInput.parse(input);
    if (parsed.kind !== "create") throw new Error("Wrong synthetic request kind");
    expect(parsed.title).toHaveLength(80);
    expect(parsed.memberIds).toHaveLength(100);
  });
  it.each([
    undefined,
    null,
    [],
    {},
    { ...create, expectedAccountId: "actor" },
    { ...invite, threadId: "thread" },
    { ...create, kind: "other_rpc" },
  ])("rejects malformed request %j", (input) => {
    expect(chatCommandInput.safeParse(input).success).toBe(false);
  });
  it.each(["", "  ", "x".repeat(81), null, 1])("rejects invalid title %j", (title) => {
    expect(chatCommandInput.safeParse({ ...create, title }).success).toBe(false);
  });
  it.each([
    [],
    null,
    [null],
    ["legacy-id"],
    Array.from({ length: 101 }, (_, n) => uuid(n + 100)),
    [uuid(2), uuid(2)],
    [threadId, threadId.toUpperCase()],
    [expectedAccountId],
    [expectedAccountId.toUpperCase()],
  ])("rejects invalid/duplicate/self member selection %j", (memberIds) => {
    for (const input of [create, invite])
      expect(chatCommandInput.safeParse({ ...input, memberIds }).success).toBe(false);
  });
  it.each([null, "true", 1, undefined])("does not coerce respond acceptance %j", (accept) => {
    expect(chatCommandInput.safeParse({ ...voidInput("respond"), accept }).success).toBe(false);
  });
  it.each(["rpc", "schema", "actor", "shopId", "Authorization", "retry", "signal", "unexpected"])(
    "rejects extra request field %s",
    (key) => {
      for (const input of [create, invite, ...voidKinds.map(voidInput)])
        expect(chatCommandInput.safeParse({ ...input, [key]: "override" }).success).toBe(false);
    },
  );
  it("rejects another operation's fields instead of ignoring them", () => {
    expect(chatCommandInput.safeParse({ ...voidInput("leave"), accept: false }).success).toBe(
      false,
    );
    expect(chatCommandInput.safeParse({ ...create, threadId }).success).toBe(false);
    expect(chatCommandInput.safeParse({ ...invite, title: "Other" }).success).toBe(false);
  });
});

describe("request-scoped chat acknowledgement parsing", () => {
  it("validates a created UUID and bounded inserted count including zero", () => {
    const result = { kind: "created", threadId };
    expect(parseChatCommandResult(result, create)).toEqual(result);
    for (const insertedCount of [0, 1, 2]) {
      const invited = { kind: "invited", threadId, insertedCount };
      expect(parseChatCommandResult(invited, invite)).toEqual(invited);
    }
  });
  it.each(voidKinds)("acknowledges %s without claiming its row effect", (operation) => {
    expect(parseChatCommandResult(ack(operation), voidInput(operation))).toEqual(ack(operation));
  });
  it("matches UUID scope case-insensitively without changing the supplied result", () => {
    const result = { kind: "invited", threadId: threadId.toUpperCase(), insertedCount: 0 };
    expect(parseChatCommandResult(result, invite)).toEqual(result);
  });
  it.each([
    undefined,
    null,
    [],
    {},
    { kind: "created", threadId: "not-uuid" },
    { kind: "created", threadId, secret: "PRIVATE" },
    { kind: "invited", threadId, insertedCount: 1 },
  ])("rejects malformed/wrong-kind created result %j privately", (raw) => {
    expect(() => parseChatCommandResult(raw, create)).toThrow(CHAT_COMMAND_FAILURE);
  });
  it.each([
    -1,
    0.1,
    3,
    2_147_483_648,
    Number.MAX_SAFE_INTEGER,
    Infinity,
    NaN,
    "1",
    null,
    undefined,
  ])("rejects noninteger/out-of-bound invitation count %j", (insertedCount) => {
    expect(() =>
      parseChatCommandResult({ kind: "invited", threadId, insertedCount }, invite),
    ).toThrow(CHAT_COMMAND_FAILURE);
  });
  it("rejects cross-thread, extra-field and wrong-operation acknowledgements", () => {
    for (const raw of [
      { kind: "invited", threadId: uuid(999), insertedCount: 0 },
      { kind: "invited", threadId, insertedCount: 0, delivered: true },
      { kind: "created", threadId },
    ])
      expect(() => parseChatCommandResult(raw, invite)).toThrow(CHAT_COMMAND_FAILURE);
    for (const raw of [
      { ...ack("leave"), threadId: uuid(999) },
      { ...ack("leave"), effect: "verified" },
      { ...ack("leave"), changedRows: 1 },
      ack("mark_read"),
      { ...ack("leave"), operation: "other_rpc" },
      { kind: "invited", threadId, insertedCount: 0 },
    ])
      expect(() => parseChatCommandResult(raw, voidInput("leave"))).toThrow(CHAT_COMMAND_FAILURE);
  });
  it("revalidates a forged typed request without returning private parser details", () => {
    expect(() =>
      parseChatCommandResult(
        { kind: "created", threadId },
        { ...create, memberIds: [expectedAccountId] },
      ),
    ).toThrow(CHAT_COMMAND_FAILURE);
  });
});
