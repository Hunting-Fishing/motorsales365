// Actual route + Zod, mocked SDK/audit only. No signed JWT, real SQL, provisioning,
// affected-row transaction, trigger, role authority, delivery or durable audit proof.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "./create-user";

type Handler = (args: { request: Request }) => Promise<Response>;
const actorId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const newId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const otherId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const email = "synthetic@example.invalid";
const password = "Synthetic-password-42!";
const rawFailure = "Synthetic private diagnostic: token-and-password-must-not-be-returned";
const state = vi.hoisted(() => ({
  handler: null as Handler | null,
  path: "",
  steps: [] as string[],
  filters: [] as [string, string, unknown][],
  inserts: [] as unknown[],
  patches: [] as Record<string, unknown>[],
  projections: [] as [string, string][],
  client: vi.fn(),
  getUser: vi.fn(),
  create: vi.fn(),
  lookup: vi.fn(),
  roles: vi.fn(),
  profile: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (config: { server: { handlers: { POST: Handler } } }) => {
    state.path = path;
    state.handler = config.server.handlers.POST;
    return config;
  },
}));
vi.mock("@/integrations/supabase/route-audit.server", () => ({
  logRouteAccess: (entry: unknown) => state.audit(entry),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => {
    state.client(...args);
    return {
      auth: {
        getUser: (token: string) => {
          state.steps.push("authenticate");
          return state.getUser(token);
        },
        admin: {
          createUser: (payload: unknown) => {
            state.steps.push("create");
            return state.create(payload);
          },
        },
      },
      from: (table: string) => {
        if (table === "user_roles")
          return {
            select: (projection: string) => {
              state.projections.push(["lookup", projection]);
              return {
                eq: (column: string, value: unknown) => {
                  state.filters.push(["lookup", column, value]);
                  state.steps.push("lookup");
                  return state.lookup();
                },
              };
            },
            insert: (rows: unknown) => {
              state.inserts.push(rows);
              return {
                select: (projection: string) => {
                  state.projections.push(["roles", projection]);
                  state.steps.push("roles");
                  return state.roles();
                },
              };
            },
          };
        if (table === "profiles")
          return {
            update: (patch: Record<string, unknown>) => {
              state.patches.push(patch);
              return {
                eq: (column: string, value: unknown) => {
                  state.filters.push(["profile", column, value]);
                  return {
                    select: (projection: string) => {
                      state.projections.push(["profile", projection]);
                      state.steps.push("profile");
                      return state.profile();
                    },
                  };
                },
              };
            },
          };
        throw new Error(`Unexpected synthetic table ${table}`);
      },
    };
  },
}));
void Route; // Ensure the actual module registers the captured route.

const body = (extra: Record<string, unknown> = {}) => ({
  email,
  full_name: "Synthetic Person",
  first_name: "Synthetic",
  last_name: "Person",
  password,
  account_type: "staff",
  roles: ["support", "sales"],
  ...extra,
});
async function post(
  payload: unknown = body(),
  authorization: string | null = "Bearer synthetic.jwt",
) {
  expect(state.path).toBe("/api/admin/create-user");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authorization !== null) headers.Authorization = authorization;
  return state.handler!({
    request: new Request("https://example.invalid/api/admin/create-user", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    }),
  });
}
async function partial(response: Response, stage: "roles" | "profile" | "audit") {
  expect(response.status).toBe(207);
  const value = await response.json();
  if (stage === "roles") {
    expect(Object.keys(value).sort()).toEqual(["error", "userId"]);
    expect(value.userId).toBe(newId);
    expect(value.error).toMatch(/Role assignment was not confirmed/);
  } else {
    expect(Object.keys(value).sort()).toEqual(["email", "ok", "userId", "warning"]);
    expect(value).toMatchObject({ ok: true, userId: newId, email });
    expect(value.warning).toMatch(stage === "audit" ? /Request completion/ : /Profile update/);
  }
  expect(JSON.stringify(value)).not.toContain(rawFailure);
  expect(JSON.stringify(value)).not.toContain(password);
  expect(state.create).toHaveBeenCalledTimes(1);
  return value;
}
beforeEach(() => {
  vi.clearAllMocks();
  state.steps = [];
  state.filters = [];
  state.inserts = [];
  state.patches = [];
  state.projections = [];
  vi.stubEnv("SUPABASE_URL", "https://synthetic.supabase.invalid");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-not-a-real-key");
  state.getUser.mockResolvedValue({ data: { user: { id: actorId } }, error: null });
  state.lookup.mockResolvedValue({ data: [{ role: "admin" }], error: null });
  state.create.mockResolvedValue({ data: { user: { id: newId } }, error: null });
  state.roles.mockResolvedValue({
    data: [
      { user_id: newId, role: "sales" },
      { user_id: newId, role: "support" },
    ],
    error: null,
  });
  state.profile.mockResolvedValue({ data: [{ id: newId }], error: null });
  state.audit.mockImplementation(async (entry: { outcome: string }) => {
    state.steps.push(`audit:${entry.outcome}`);
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("account creation returned-row evidence, not end-to-end authority", () => {
  it("preserves verified-user/admin lookup ordering and exact requested writes/projections", async () => {
    const response = await post();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, userId: newId, email });
    expect(state.steps).toEqual([
      "authenticate",
      "lookup",
      "create",
      "roles",
      "profile",
      "audit:allowed",
    ]);
    expect(state.getUser).toHaveBeenCalledWith("synthetic.jwt");
    expect(state.filters).toEqual([
      ["lookup", "user_id", actorId],
      ["profile", "id", newId],
    ]);
    expect(state.projections).toEqual([
      ["lookup", "role"],
      ["roles", "user_id,role"],
      ["profile", "id"],
    ]);
    expect(state.inserts).toEqual([
      [
        { user_id: newId, role: "support" },
        { user_id: newId, role: "sales" },
      ],
    ]);
    expect(state.create).toHaveBeenCalledWith({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: "Synthetic Person",
        first_name: "Synthetic",
        last_name: "Person",
      },
    });
    expect(state.patches[0]).toMatchObject({
      full_name: "Synthetic Person",
      is_staff_account: true,
      seller_type: null,
    });
    // Staff NULL is retained source behavior: mock receipt is NOT schema compatibility.
  });

  it.each([null, "", "Basic synthetic.jwt", "bearer synthetic.jwt"])(
    "does not construct privileged client without a bearer token: %s",
    async (header) => {
      const response = await post(body(), header);
      expect(response.status).toBe(401);
      expect(state.client).not.toHaveBeenCalled();
      expect(state.create).not.toHaveBeenCalled();
    },
  );
  it.each([
    { data: { user: null }, error: null },
    { data: { user: { id: actorId } }, error: { message: rawFailure } },
  ])("denies rejected user identity before role lookup", async (result) => {
    state.getUser.mockResolvedValue(result);
    expect((await post()).status).toBe(401);
    expect(state.lookup).not.toHaveBeenCalled();
    expect(state.create).not.toHaveBeenCalled();
  });
  it.each([[], [{ role: "support" }], [{ role: "moderator" }], null].map((data) => [data]))(
    "requires existing admin role without granting new authority: %j",
    async (data) => {
      state.lookup.mockResolvedValue({ data, error: null });
      expect((await post()).status).toBe(403);
      expect(state.create).not.toHaveBeenCalled();
    },
  );
  it("characterizes lookup-error-with-null-data as denied, not verified role provenance", async () => {
    state.lookup.mockResolvedValue({ data: null, error: { message: rawFailure } });
    expect((await post()).status).toBe(403);
    expect(state.create).not.toHaveBeenCalled();
  });
  it.each([
    { password: "short" },
    { roles: ["owner"] },
    { email: "invalid" },
    { seller_type: "business" },
  ])("rejects invalid actual Zod input before Auth creation: %j", async (extra) => {
    expect((await post(body(extra))).status).toBe(400);
    expect(state.create).not.toHaveBeenCalled();
  });
  it("keeps enforced-domain mismatch before Auth creation", async () => {
    expect((await post(body({ enforce_domain: "@365motorsales.com" }))).status).toBe(400);
    expect(state.create).not.toHaveBeenCalled();
  });
  it.each([
    { data: { user: null }, error: { message: rawFailure } },
    { data: { user: null }, error: null },
    { data: { user: { id: "not-a-uuid" } }, error: null },
  ])("does not issue role/profile writes after failed/malformed Auth receipt", async (result) => {
    state.create.mockResolvedValue(result);
    const response = await post();
    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).not.toContain(rawFailure);
    expect(state.inserts).toEqual([]);
    expect(state.patches).toEqual([]);
  });
  it.each(
    [
      null,
      [],
      {},
      "rows",
      [{ user_id: newId, role: "support" }],
      [
        { user_id: newId, role: "support" },
        { user_id: newId, role: "support" },
      ],
      [
        { user_id: otherId, role: "support" },
        { user_id: newId, role: "sales" },
      ],
      [
        { user_id: newId, role: "admin" },
        { user_id: newId, role: "sales" },
      ],
      [
        { user_id: newId, role: "support", extra: true },
        { user_id: newId, role: "sales" },
      ],
      [
        { user_id: newId, role: "support" },
        { user_id: newId, role: "sales" },
        { user_id: newId, role: "admin" },
      ],
    ].map((data) => [data]),
  )("partial role evidence cannot reach profile or normal acknowledgment: %j", async (data) => {
    state.roles.mockResolvedValue({ data, error: null });
    await partial(await post(), "roles");
    expect(state.patches).toEqual([]);
    expect(state.steps).toEqual(["authenticate", "lookup", "create", "roles", "audit:error"]);
  });
  it("returned role error wins even over apparently matching rows", async () => {
    state.roles.mockResolvedValue({
      data: [
        { user_id: newId, role: "support" },
        { user_id: newId, role: "sales" },
      ],
      error: { message: rawFailure },
    });
    await partial(await post(), "roles");
    expect(state.patches).toEqual([]);
  });
  it("preserves duplicate requested writes but never accepts a duplicate role receipt", async () => {
    state.roles.mockResolvedValue({
      data: [
        { user_id: newId, role: "support" },
        { user_id: newId, role: "support" },
      ],
      error: null,
    });
    await partial(await post(body({ roles: ["support", "support"] })), "roles");
    expect(state.inserts).toEqual([
      [
        { user_id: newId, role: "support" },
        { user_id: newId, role: "support" },
      ],
    ]);
    expect(state.patches).toEqual([]);
  });
  it.each(
    [
      null,
      [],
      {},
      "rows",
      [{ id: otherId }],
      [{ id: newId }, { id: newId }],
      [{ id: newId, extra: true }],
      [{ id: "invalid" }],
    ].map((data) => [data]),
  )(
    "zero/malformed/mismatched profile evidence cannot yield normal acknowledgment: %j",
    async (data) => {
      state.profile.mockResolvedValue({ data, error: null });
      await partial(await post(), "profile");
      expect(state.steps.at(-1)).toBe("audit:error");
    },
  );
  it("returned profile error wins over a matching id receipt", async () => {
    state.profile.mockResolvedValue({ data: [{ id: newId }], error: { message: rawFailure } });
    await partial(await post(), "profile");
  });
  it.each(["roles", "profile"] as const)(
    "rejected %s promise after known Auth creation stays partial, with no retry/delete",
    async (stage) => {
      state[stage].mockRejectedValue(new Error(rawFailure));
      await partial(await post(), stage);
      expect(state[stage]).toHaveBeenCalledTimes(1);
      if (stage === "roles") expect(state.patches).toEqual([]);
    },
  );
  it("rejected completion audit stays partial without blaming already returned profile evidence", async () => {
    state.audit.mockRejectedValue(new Error(rawFailure));
    await partial(await post(), "audit");
    expect(state.profile).toHaveBeenCalledTimes(1);
    expect(state.audit).toHaveBeenCalledTimes(2);
  });
  it("a throwing partial-outcome audit cannot prevent a safe partial response", async () => {
    state.roles.mockResolvedValue({ data: [], error: null });
    state.audit.mockRejectedValue(new Error(rawFailure));
    await partial(await post(), "roles");
    expect(state.audit).toHaveBeenCalledTimes(2);
    expect(state.patches).toEqual([]);
  });
  it.each(["getUser", "lookup", "create"] as const)(
    "pre-create rejected %s yields generic unknown error without later writes",
    async (stage) => {
      state[stage].mockRejectedValue(new Error(rawFailure));
      const response = await post();
      expect(response.status).toBe(500);
      expect(JSON.stringify(await response.json())).not.toContain(rawFailure);
      expect(state.inserts).toEqual([]);
      expect(state.patches).toEqual([]);
    },
  );
  it("skips role insert for empty staff roles but still requires profile receipt", async () => {
    expect((await post(body({ roles: [] }))).status).toBe(200);
    expect(state.inserts).toEqual([]);
    expect(state.patches[0]).toMatchObject({ is_staff_account: true, seller_type: null });
  });
  it("business flow does not assign submitted staff roles or invent a seller model mapping", async () => {
    expect(
      (await post(body({ account_type: "business", seller_type: "dealer", mark_verified: true })))
        .status,
    ).toBe(200);
    expect(state.inserts).toEqual([]);
    expect(state.patches[0]).toMatchObject({
      seller_type: "dealer",
      is_staff_account: false,
      verification_status: "verified",
    });
    // This legacy enum value is not current profile-enum compatibility proof.
  });
  it("retains reserved-domain staff coercion and strips business-only profile fields", async () => {
    const response = await post(
      body({
        email: "synthetic@365motorsales.com",
        account_type: "business",
        seller_type: "dealer",
        business_name: "Must be ignored",
      }),
    );
    expect(response.status).toBe(200);
    expect(state.inserts).toHaveLength(1);
    expect(state.patches[0]).toMatchObject({ is_staff_account: true, seller_type: null });
    expect(state.patches[0]).not.toHaveProperty("business_name");
  });
  it("compares UUID identities canonically without relying on row order", async () => {
    state.roles.mockResolvedValue({
      data: [
        { user_id: newId.toUpperCase(), role: "sales" },
        { user_id: newId, role: "support" },
      ],
      error: null,
    });
    state.profile.mockResolvedValue({ data: [{ id: newId.toUpperCase() }], error: null });
    expect((await post()).status).toBe(200);
  });
  it("does not treat best-effort audit resolution as a durable receipt or log private input values", async () => {
    state.audit.mockResolvedValue(undefined);
    expect(
      (
        await post(
          body({
            phone: "09123456789",
            personal_email: "private@example.invalid",
            street_address: "Synthetic address",
          }),
        )
      ).status,
    ).toBe(200);
    const entry = state.audit.mock.calls.at(-1)![0];
    expect(entry.actorId).toBe(actorId);
    expect(entry.targetSummary).toMatchObject({
      had_phone: true,
      had_personal_email: true,
      had_street_address: true,
    });
    expect(entry.targetSummary).not.toHaveProperty("password");
    expect(entry.targetSummary).not.toHaveProperty("phone");
    expect(entry.targetSummary).not.toHaveProperty("personal_email");
    expect(entry.targetSummary).not.toHaveProperty("street_address");
  });
});
