// @vitest-environment node
// Synthetic middleware/HTTP/stream contracts only: fetch is ALWAYS mocked.
// No network, real JWT/session, SQL/RLS, delivery or database rollback proof.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeChatCommand } from "./chat-commands.functions";
import {
  CHAT_COMMAND_FAILURE,
  type ChatCommandInput,
  type ChatCommandResult,
} from "./chat-commands";

const mocks = vi.hoisted(() => ({
  methods: [] as unknown[],
  middlewares: [] as unknown[][],
  middleware: { name: "requireSupabaseAuth" },
  getRequest: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: (options: unknown) => {
    mocks.methods.push(options);
    let validate = (input: unknown): unknown => input;
    const builder = {
      middleware: (value: unknown[]) => {
        mocks.middlewares.push(value);
        return builder;
      },
      inputValidator: (value: (input: unknown) => unknown) => {
        validate = value;
        return builder;
      },
      handler:
        (fn: (args: { data: unknown; context: unknown }) => unknown) =>
        (args: { data: unknown; context: unknown }) =>
          fn({ ...args, data: validate(args.data) }),
    };
    return builder;
  },
}));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: mocks.getRequest }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({
  requireSupabaseAuth: mocks.middleware,
}));

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const accountId = uuid(1);
const threadId = uuid(10);
const createdId = uuid(11);
const authorization = "Bearer synthetic.payload.signature";
const origin = "https://staging-example.supabase.co";
const key = "sb_publishable_synthetic_test_only";
const create: ChatCommandInput = {
  expectedAccountId: accountId,
  kind: "create",
  title: "Group",
  memberIds: [uuid(2), uuid(3)],
};
const invite: ChatCommandInput = {
  expectedAccountId: accountId,
  kind: "invite",
  threadId,
  memberIds: [uuid(2), uuid(3)],
};
const voidKinds = ["respond", "leave", "mark_read", "mark_unread"] as const;
const voidInput = (kind: (typeof voidKinds)[number]): ChatCommandInput =>
  kind === "respond"
    ? { expectedAccountId: accountId, kind, threadId, accept: false }
    : { expectedAccountId: accountId, kind, threadId };
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
type CommandCase = [
  input: ChatCommandInput,
  name: string,
  args: Record<string, unknown>,
  raw: unknown,
  expected: ChatCommandResult,
];
let controller: AbortController;
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
let callerContext: { userId: unknown; readonly supabase: never };
let singleton: ReturnType<typeof vi.fn<() => never>>;
let request: { signal: AbortSignal; headers: Headers };
const originalFetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, "fetch")!;

async function call(input: unknown = create, context: unknown = callerContext) {
  return (
    executeChatCommand as unknown as (args: { data: unknown; context: unknown }) => Promise<unknown>
  )({ data: input, context });
}
async function failure(promise: Promise<unknown>) {
  const error: unknown = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toBe(CHAT_COMMAND_FAILURE);
}
function streamResponse(source: UnderlyingSource<Uint8Array>, status = 200) {
  return new Response(new ReadableStream<Uint8Array>(source), { status });
}

beforeEach(() => {
  vi.clearAllMocks();
  controller = new AbortController();
  request = { signal: controller.signal, headers: new Headers({ authorization }) };
  mocks.getRequest.mockReturnValue(request);
  singleton = vi.fn(() => {
    throw new Error("Unexpected SDK/fallback access");
  });
  callerContext = {
    userId: accountId,
    get supabase(): never {
      return singleton() as never;
    },
  };
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("SUPABASE_URL", origin);
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", key);
});
afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(globalThis, "fetch", originalFetchDescriptor);
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fixed-bearer request-scoped chat transport", () => {
  it("registers POST and the unchanged auth middleware", () => {
    expect(mocks.methods).toEqual([{ method: "POST" }]);
    expect(mocks.middlewares).toEqual([[mocks.middleware]]);
  });
  const commandCases: CommandCase[] = [
    [
      create,
      "create_group_chat",
      { p_title: "Group", p_member_ids: create.memberIds },
      createdId,
      { kind: "created", threadId: createdId },
    ],
    [
      invite,
      "invite_to_thread",
      { p_thread_id: threadId, p_user_ids: invite.memberIds },
      0,
      { kind: "invited", threadId, insertedCount: 0 },
    ],
    ...voidKinds.map(
      (kind): CommandCase => [
        voidInput(kind),
        kind === "respond"
          ? "respond_to_thread_invite"
          : kind === "leave"
            ? "leave_thread"
            : kind === "mark_read"
              ? "mark_thread_read"
              : "mark_thread_unread",
        kind === "respond" ? { p_thread_id: threadId, p_accept: false } : { p_thread_id: threadId },
        undefined,
        { kind: "acknowledged", operation: kind, threadId, effect: "unverified" },
      ],
    ),
  ];
  it.each(commandCases)("maps one fixed POST for %j", async (input, name, args, raw, expected) => {
    fetchMock.mockResolvedValueOnce(
      raw === undefined ? new Response(null, { status: 204 }) : json(raw),
    );
    await expect(call(input)).resolves.toEqual(expected);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`${origin}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        apikey: key,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(args),
      signal: controller.signal,
      redirect: "error",
    });
    expect(singleton).not.toHaveBeenCalled();
  });
  it("trims input title but does not change configured staging origin or bearer", async () => {
    fetchMock.mockResolvedValueOnce(json(createdId));
    await call({ ...create, title: "  Group  " });
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string).p_title).toBe("Group");
    expect(fetchMock.mock.calls[0][0]).toBe(`${origin}/rest/v1/rpc/create_group_chat`);
  });
  it.each([
    undefined,
    null,
    {},
    { ...create, rpc: "other" },
    { ...invite, threadId: "wrong" },
    { ...create, memberIds: [accountId] },
    { ...create, memberIds: [uuid(2), uuid(2)] },
  ])("rejects invalid input before request/fetch binding %j", async (input) => {
    // Explicit undefined bypasses call's convenience default.
    await failure(
      Promise.resolve().then(() =>
        (
          executeChatCommand as unknown as (a: {
            data: unknown;
            context: unknown;
          }) => Promise<unknown>
        )({ data: input, context: callerContext }),
      ),
    );
    expect(mocks.getRequest).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([undefined, null, {}, { userId: uuid(999) }, { userId: 1 }])(
    "rejects missing/mismatched actor before request/environment/fetch access %j",
    async (context) => {
      let bound = 0;
      Object.defineProperty(globalThis, "fetch", {
        configurable: true,
        get: () => {
          bound++;
          return fetchMock;
        },
      });
      const inputContext = context === undefined ? { userId: undefined } : context;
      await failure(call(create, inputContext));
      expect(mocks.getRequest).not.toHaveBeenCalled();
      expect(bound).toBe(0);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it("rejects a pre-aborted request without headers/environment/fetch access", async () => {
    controller.abort(new Error("PRIVATE abort reason"));
    const headers = vi.fn(() => {
      throw new Error("Unexpected header binding");
    });
    mocks.getRequest.mockReturnValue({
      signal: controller.signal,
      get headers() {
        return headers();
      },
    });
    await failure(call());
    expect(headers).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    "",
    "http://staging-example.supabase.co",
    "https://evil.example",
    "https://supabase.co",
    "https://project.supabase.co.evil.example",
    "https://user:pass@project.supabase.co",
    "https://project.supabase.co/path",
    "https://project.supabase.co/a/..",
    "https://project.supabase.co?secret=1",
    "https://project.supabase.co?",
    "https://project.supabase.co#fragment",
    "https://project.supabase.co#",
    "https://project.supabase.co:8443",
    " https://project.supabase.co ",
    "https://pro\nject.supabase.co",
    "https://project-.supabase.co",
  ])("rejects untrusted/nonorigin configured URL %s", async (value) => {
    vi.stubEnv("SUPABASE_URL", value);
    await failure(call());
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    "",
    "sb_secret_PRIVATE",
    "header.payload.signature",
    "sb_publishable_",
    "sb_publishable_key\nPRIVATE",
    "sb_publishable_key\n",
  ])("rejects unsupported/nonpublishable configured key %s", async (value) => {
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", value);
    await failure(call());
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    null,
    "",
    "Basic PRIVATE",
    "Bearer ",
    "Bearer token",
    "Bearer a.b.c extra",
    "Bearer a.b.c,other",
  ])("rejects malformed original Authorization %j", async (value) => {
    request.headers = new Headers();
    if (value !== null) request.headers.set("authorization", value);
    await failure(call());
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([202, 201, 302, 400, 401, 403, 404, 409, 500, 503, 520])(
    "rejects actual HTTP%s without reading the private backend body or retrying",
    async (status) => {
      const cancel = vi.fn(async () => undefined);
      const read = vi.fn(() => {
        throw new Error("PRIVATE backend content");
      });
      fetchMock.mockResolvedValueOnce({
        status,
        ok: status < 300,
        redirected: false,
        body: { cancel, getReader: read },
      } as unknown as Response);
      await failure(call(voidInput("leave")));
      expect(read).not.toHaveBeenCalled();
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(singleton).not.toHaveBeenCalled();
    },
  );
  it("raw empty404 cannot be normalized into a successful void acknowledgement", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    await failure(call(voidInput("mark_read")));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each(["", "null", " \nnull\t"])(
    "accepts actual200 void compatibility body %j without a mutation-count claim",
    async (body) => {
      fetchMock.mockResolvedValueOnce(new Response(body, { status: 200 }));
      await expect(call(voidInput("leave"))).resolves.toEqual({
        kind: "acknowledged",
        operation: "leave",
        threadId,
        effect: "unverified",
      });
    },
  );
  it.each(["{}", "[]", "true", "0", '""', "undefined", " ", "PRIVATE malformed JSON"])(
    "rejects unexpected200 void body %j",
    async (body) => {
      fetchMock.mockResolvedValueOnce(new Response(body));
      await failure(call(voidInput("leave")));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
  it("rejects unexpected204 body content rather than treating status alone as an acknowledgement", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode("null"));
        c.close();
      },
    });
    fetchMock.mockResolvedValueOnce({ status: 204, ok: true, redirected: false, body } as Response);
    await failure(call(voidInput("leave")));
  });
  it.each([null, "bad-uuid", {}, [], 0, true])(
    "rejects invalid created scalar %j after one possibly committed dispatch",
    async (value) => {
      fetchMock.mockResolvedValueOnce(json(value));
      await failure(call());
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
  it.each([-1, 0.5, 3, 2_147_483_648, "1", null, {}, []])(
    "rejects invalid invitation scalar %j without retry",
    async (value) => {
      fetchMock.mockResolvedValueOnce(json(value));
      await failure(call(invite));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
  it("requires actual200 for scalar commands, not204", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await failure(call(create));
  });
  it("rejects a redirected response even when mock status is200", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      ok: true,
      redirected: true,
      body: null,
    } as Response);
    await failure(call());
  });
  it("bounds bytes rather than characters and cancels an oversized open stream", async () => {
    const cancel = vi.fn();
    fetchMock.mockResolvedValueOnce(
      streamResponse({
        start(c) {
          c.enqueue(new TextEncoder().encode("😀".repeat(1100)));
        },
        cancel,
      }),
    );
    await failure(call(voidInput("leave")));
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("accepts4096 bytes but rejects4097 including across multiple chunks", async () => {
    fetchMock.mockResolvedValueOnce(new Response(`0${" ".repeat(4095)}`));
    await expect(call(invite)).resolves.toEqual({ kind: "invited", threadId, insertedCount: 0 });
    const cancel = vi.fn();
    let chunk = 0;
    fetchMock.mockResolvedValueOnce(
      streamResponse({
        pull(c) {
          c.enqueue(
            new TextEncoder().encode(chunk++ === 0 ? `0${" ".repeat(2047)}` : " ".repeat(2049)),
          );
        },
        cancel,
      }),
    );
    await failure(call(invite));
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("rejects malformed UTF8 and cancels the stream without leaking bytes", async () => {
    const cancel = vi.fn();
    fetchMock.mockResolvedValueOnce(
      streamResponse({
        start(c) {
          c.enqueue(new Uint8Array([0xff]));
        },
        cancel,
      }),
    );
    await failure(call());
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it("hides fetch/stream construction/read failures and never retries or changes transport", async () => {
    fetchMock.mockRejectedValueOnce(new Error("PRIVATE fetch credential diagnostic"));
    await failure(call());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockResolvedValueOnce(
      streamResponse({
        pull(c) {
          c.error(new Error("PRIVATE stream content"));
        },
      }),
    );
    await failure(call());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(singleton).not.toHaveBeenCalled();
  });

  const stages = [
    "request",
    "headers",
    "origin",
    "fetch_binding",
    "fetch_result",
    "status",
    "body",
    "reader",
    "chunk",
  ] as const;
  for (const boundary of ["actor", "cancellation"] as const)
    it.each(stages)(
      `rejects ${boundary} change at %s without a late acknowledgement`,
      async (stage) => {
        const change = () => {
          if (boundary === "actor") callerContext.userId = uuid(999);
          else controller.abort(new Error("PRIVATE reason"));
        };
        const response = json(createdId);
        fetchMock.mockImplementationOnce(async () => {
          if (stage === "fetch_result") change();
          return response;
        });
        if (stage === "request")
          mocks.getRequest.mockImplementationOnce(() => {
            change();
            return request;
          });
        if (stage === "headers")
          vi.spyOn(request.headers, "get").mockImplementationOnce(() => {
            change();
            return authorization;
          });
        if (stage === "origin") {
          const NativeURL = URL;
          vi.stubGlobal(
            "URL",
            class extends NativeURL {
              constructor(value: string | URL, base?: string | URL) {
                super(value, base);
                change();
              }
            },
          );
        }
        if (stage === "fetch_binding")
          Object.defineProperty(globalThis, "fetch", {
            configurable: true,
            get: () => {
              change();
              return fetchMock;
            },
          });
        if (stage === "status")
          Object.defineProperty(response, "status", {
            get: () => {
              change();
              return 200;
            },
          });
        if (stage === "body") {
          const body = response.body;
          Object.defineProperty(response, "body", {
            get: () => {
              change();
              return body;
            },
          });
        }
        if (stage === "reader") {
          const body = response.body!;
          const getReader = body.getReader.bind(body);
          Object.defineProperty(body, "getReader", {
            configurable: true,
            value: () => {
              change();
              return getReader();
            },
          });
        }
        if (stage === "chunk")
          fetchMock.mockReset().mockResolvedValueOnce(
            streamResponse({
              pull(c) {
                change();
                c.enqueue(new TextEncoder().encode(JSON.stringify(createdId)));
                c.close();
              },
            }),
          );
        await failure(call());
        expect(fetchMock).toHaveBeenCalledTimes(
          ["request", "headers", "origin", "fetch_binding"].includes(stage) ? 0 : 1,
        );
        expect(singleton).not.toHaveBeenCalled();
      },
    );
  it("cancels an outstanding body read when the request aborts", async () => {
    const cancel = vi.fn();
    let started!: () => void;
    const reading = new Promise<void>((resolve) => {
      started = resolve;
    });
    fetchMock.mockResolvedValueOnce(
      streamResponse({
        pull() {
          started();
        },
        cancel,
      }),
    );
    const pending = call();
    await reading;
    controller.abort(new Error("PRIVATE late cancellation"));
    await failure(pending);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it("suppresses a deferred result after account/cancellation change without redispatch", async () => {
    let resolve!: (value: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((done) => {
        resolve = done;
      }),
    );
    const pending = call();
    callerContext.userId = uuid(999);
    controller.abort();
    resolve(json(createdId));
    await failure(pending);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
