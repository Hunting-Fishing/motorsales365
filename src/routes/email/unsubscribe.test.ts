// Actual route handlers with a fluent SDK double. No live database, atomic
// unsubscribe/consent transaction, sender or delivery acceptance is exercised.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "./unsubscribe";

type Handler = (args: { request: Request }) => Promise<Response>;
type Result = { data: unknown; error: unknown };
const mocks = vi.hoisted(() => ({
  handlers: {} as Record<"GET" | "POST", Handler>,
  client: vi.fn(),
  lookup: vi.fn<() => Promise<Result>>(),
  update: vi.fn<() => Promise<Result>>(),
  suppression: vi.fn<() => Promise<Result>>(),
  upsert: vi.fn<() => Promise<Result>>(),
  operations: [] as string[],
  writes: [] as [string, unknown][],
  filters: [] as [string, string, unknown][],
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: { server: { handlers: typeof mocks.handlers } }) => {
    mocks.handlers = config.server.handlers;
    return config;
  },
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => {
    mocks.client(...args);
    return {
      from: (table: string) => {
        let operation = table === "email_unsubscribe_tokens" ? "lookup" : "suppression";
        const query = {
          select: () => query,
          eq: (column: string, value: unknown) => {
            mocks.filters.push([operation, column, value]);
            return query;
          },
          is: (column: string, value: unknown) => {
            mocks.filters.push([operation, column, value]);
            return query;
          },
          update: (patch: unknown) => {
            operation = "update";
            mocks.writes.push([operation, patch]);
            return query;
          },
          upsert: (row: unknown) => {
            operation = "upsert";
            mocks.writes.push([operation, row]);
            return query;
          },
          maybeSingle: () => {
            mocks.operations.push(operation);
            if (operation === "lookup") return mocks.lookup();
            if (operation === "update") return mocks.update();
            if (operation === "upsert") return mocks.upsert();
            return mocks.suppression();
          },
        };
        return query;
      },
    };
  },
}));
void Route;

const token = "synthetic-unsubscribe-token-never-log";
const email = "synthetic@example.invalid";
const rawFailure = `private-diagnostic ${token} ${email} synthetic-secret`;
const tokenRecord = (used = true) => ({
  token,
  email: "Synthetic@Example.Invalid",
  used_at: used ? "2026-10-15T12:00:00.000Z" : null,
});
const result = (data: unknown, error: unknown = null): Result => ({ data, error });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.operations.length = 0;
  mocks.writes.length = 0;
  mocks.filters.length = 0;
  mocks.lookup.mockResolvedValue(result(tokenRecord()));
  mocks.update.mockResolvedValue(result(tokenRecord()));
  mocks.suppression.mockResolvedValue(result({ email, reason: "unsubscribe" }));
  mocks.upsert.mockResolvedValue(result({ email, reason: "unsubscribe" }));
  vi.stubEnv("VITE_SUPABASE_URL", "https://wjxaajgvddtrxxtocxen.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-offline-key");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});
afterEach(() => {
  expect(console.error).not.toHaveBeenCalled();
  expect(console.warn).not.toHaveBeenCalled();
  expect(console.log).not.toHaveBeenCalled();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function request(method: "GET" | "POST", init?: RequestInit, queryToken = token) {
  return mocks.handlers[method]({
    request: new Request(
      `https://example.invalid/email/unsubscribe?token=${encodeURIComponent(queryToken)}`,
      { method, ...init },
    ),
  });
}
async function expectGenericFailure(response: Response) {
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "Failed to process unsubscribe" });
}

describe.each(["GET", "POST"] as const)("consumed token %s", (method) => {
  it("acknowledges only confirmed matching unsubscribe suppression, without writes", async () => {
    const response = await request(method);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      method === "GET"
        ? { valid: false, reason: "already_unsubscribed" }
        : { success: false, reason: "already_unsubscribed" },
    );
    expect(mocks.filters).toContainEqual(["suppression", "email", email]);
    expect(mocks.operations).toEqual(["lookup", "suppression"]);
    expect(mocks.writes).toEqual([]);
  });

  it.each([
    ["absent suppression after partial failure or re-consent", null],
    ["different recipient", { email: "other@example.invalid", reason: "unsubscribe" }],
    ["nonexact recipient", { email: "Synthetic@Example.Invalid", reason: "unsubscribe" }],
    ["bounce suppression", { email, reason: "bounce" }],
    ["complaint suppression", { email, reason: "complaint" }],
    ["missing reason", { email }],
  ])("does not replay or claim success for %s", async (_name, data) => {
    mocks.suppression.mockResolvedValue(result(data));
    const response = await request(method);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "This link has already been used",
      reason: "token_consumed",
    });
    expect(mocks.writes).toEqual([]);
  });

  it("fails closed on a suppression lookup error, including accompanying data", async () => {
    mocks.suppression.mockResolvedValue(
      result({ email, reason: "unsubscribe" }, { message: rawFailure }),
    );
    await expectGenericFailure(await request(method));
    expect(mocks.writes).toEqual([]);
  });

  it("does not expose thrown database diagnostics", async () => {
    mocks.suppression.mockRejectedValue(new Error(rawFailure));
    await expectGenericFailure(await request(method));
    expect(mocks.writes).toEqual([]);
  });

  it("distinguishes transient token lookup failure from an invalid token", async () => {
    mocks.lookup.mockResolvedValue(result(null, { message: rawFailure }));
    await expectGenericFailure(await request(method));
    expect(mocks.writes).toEqual([]);
  });

  it("returns invalid only when the token is absent", async () => {
    mocks.lookup.mockResolvedValue(result(null));
    const response = await request(method);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Invalid or expired token" });
    expect(mocks.operations).toEqual(["lookup"]);
  });
});

describe("new POST acknowledgment", () => {
  beforeEach(() => mocks.lookup.mockResolvedValue(result(tokenRecord(false))));

  it("keeps conditional token-first ordering and requires returned suppression evidence", async () => {
    const response = await request("POST");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(mocks.operations).toEqual(["lookup", "update", "upsert"]);
    expect(mocks.filters).toContainEqual(["update", "used_at", null]);
    expect(mocks.writes[1]).toEqual(["upsert", { email, reason: "unsubscribe" }]);
  });

  it.each([
    ["null", null],
    ["wrong recipient", { email: "other@example.invalid", reason: "unsubscribe" }],
    ["nonexact recipient", { email: "Synthetic@Example.Invalid", reason: "unsubscribe" }],
    ["wrong reason", { email, reason: "bounce" }],
    ["missing reason", { email }],
  ])("does not acknowledge %s returned upsert data", async (_name, data) => {
    mocks.upsert.mockResolvedValue(result(data));
    await expectGenericFailure(await request("POST"));
    expect(mocks.operations).toEqual(["lookup", "update", "upsert"]);
  });

  it("does not acknowledge an upsert error even with matching returned data", async () => {
    mocks.upsert.mockResolvedValue(
      result({ email, reason: "unsubscribe" }, { message: rawFailure }),
    );
    await expectGenericFailure(await request("POST"));
  });

  it("returns a generic error without logging token or update diagnostics", async () => {
    mocks.update.mockResolvedValue(result(null, { message: rawFailure }));
    await expectGenericFailure(await request("POST"));
    expect(mocks.operations).toEqual(["lookup", "update"]);
  });

  it("confirms suppression when another request consumed the token, without another suppression write", async () => {
    mocks.update.mockResolvedValue(result(null));
    const response = await request("POST");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: false, reason: "already_unsubscribed" });
    expect(mocks.operations).toEqual(["lookup", "update", "suppression"]);
    expect(mocks.writes).toHaveLength(1);
  });

  it("does not infer suppression when token consumption raced with a partial failure", async () => {
    mocks.update.mockResolvedValue(result(null));
    mocks.suppression.mockResolvedValue(result(null));
    expect((await request("POST")).status).toBe(409);
    expect(mocks.operations).toEqual(["lookup", "update", "suppression"]);
    expect(mocks.writes).toHaveLength(1);
  });

  it("blocks mismatched update acknowledgment before suppression", async () => {
    mocks.update.mockResolvedValue(result({ ...tokenRecord(), token: "other-token" }));
    await expectGenericFailure(await request("POST"));
    expect(mocks.operations).toEqual(["lookup", "update"]);
  });

  it("preserves JSON body token selection", async () => {
    const response = await request(
      "POST",
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      },
      "query-token-not-selected",
    );
    expect(response.status).toBe(200);
    expect(mocks.filters[0]).toEqual(["lookup", "token", token]);
  });

  it("preserves form body token selection", async () => {
    const response = await request(
      "POST",
      {
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token }).toString(),
      },
      "query-token-not-selected",
    );
    expect(response.status).toBe(200);
    expect(mocks.filters[0]).toEqual(["lookup", "token", token]);
  });

  it("preserves RFC 8058 query-token authority over form token", async () => {
    const response = await request("POST", {
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ "List-Unsubscribe": "One-Click", token: "ignored" }).toString(),
    });
    expect(response.status).toBe(200);
    expect(mocks.filters[0]).toEqual(["lookup", "token", token]);
  });

  it("rejects object-valued JSON tokens before SDK use", async () => {
    const response = await request("POST", {
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: { unexpected: rawFailure } }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Token must be a string" });
    expect(mocks.client).not.toHaveBeenCalled();
  });
});
