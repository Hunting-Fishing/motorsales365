import { beforeAll, describe, expect, it, vi } from "vitest";

// Mock @supabase/supabase-js so the route's createClient() calls return
// controlled stubs. Validation errors return BEFORE any auth.signUp call,
// so the stubs only need to satisfy the "existing user" lookup + insert
// (used for the failure audit log) shapes.
vi.mock("@supabase/supabase-js", () => {
  const usersQuery = {
    select: () => usersQuery,
    eq: () => usersQuery,
    maybeSingle: async () => ({ data: null, error: null }),
  };
  const profileUpdateQuery = {
    eq: () => profileUpdateQuery,
    select: async () => ({ data: [{ id: "test-user" }], error: null }),
  };
  const client = {
    from: () => ({
      insert: async () => ({ error: null }),
      update: () => profileUpdateQuery,
    }),
    schema: () => ({ from: () => usersQuery }),
    auth: {
      signUp: async () => ({
        data: { user: { id: "test-user", identities: [{}] }, session: null },
        error: null,
      }),
    },
  };
  return { createClient: () => client };
});

beforeAll(() => {
  process.env.SUPABASE_URL = "http://localhost";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service";
  process.env.SUPABASE_PUBLISHABLE_KEY = "test-pub";
  process.env.SIGNUP_AUDIT_SALT = "test-salt";
});

// Import after mocks + env are set.
async function getHandler() {
  const mod = await import("@/routes/api/public/auth/signup");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const route = (mod as any).Route;
  return route.options.server.handlers.POST as (a: { request: Request }) => Promise<Response>;
}

function makeBody(overrides: Record<string, unknown> = {}) {
  return {
    intent: "buyer",
    email: "jane.doe@example.com",
    password: "Password123!",
    first_name: "Jane",
    last_name: "Doe",
    phone_iso: "PH",
    phone_national: "9171234567",
    signup_region: "NCR",
    signup_province: "Metro Manila",
    signup_city: "Makati",
    street_address: "123 Ayala Ave",
    postal_code: "1226",
    origin: "https://365motorsales.com",
    agreed: true,
    ...overrides,
  };
}

async function post(body: unknown) {
  const handler = await getHandler();
  const req = new Request("https://365motorsales.com/api/public/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await handler({ request: req });
  const json = (await res.json()) as {
    ok: boolean;
    errors?: { field: string; message: string }[];
  };
  return { status: res.status, json };
}

function fieldsWithError(
  errors: { field: string; message: string }[] | undefined,
): string[] {
  return (errors ?? []).map((e) => e.field);
}

describe("POST /api/public/auth/signup — server-side validation", () => {
  describe("personal (buyer) account", () => {
    it("accepts a fully valid buyer submission", async () => {
      const { status, json } = await post(makeBody());
      expect(status).toBe(200);
      expect(json.ok).toBe(true);
    });

    it("rejects when phone_national is missing", async () => {
      const { status, json } = await post(makeBody({ phone_national: "" }));
      expect(status).toBe(422);
      expect(json.ok).toBe(false);
      expect(fieldsWithError(json.errors)).toContain("phone_national");
    });

    it("rejects a mobile number that fails country-aware validation (PH must be 10 digits, prefix 9)", async () => {
      const { status, json } = await post(
        makeBody({ phone_national: "212345678" }), // wrong PH prefix + length
      );
      expect(status).toBe(422);
      expect(fieldsWithError(json.errors)).toContain("phone");
    });

    it("rejects an invalid personal email address", async () => {
      const { status, json } = await post(makeBody({ email: "not-an-email" }));
      expect(status).toBe(422);
      expect(fieldsWithError(json.errors)).toContain("email");
    });

    it("rejects a missing street_address", async () => {
      const { status, json } = await post(makeBody({ street_address: "" }));
      expect(status).toBe(422);
      expect(fieldsWithError(json.errors)).toContain("street_address");
    });

    it("rejects a street_address without both a number and a street name", async () => {
      const { status, json } = await post(
        makeBody({ street_address: "Ayala Avenue" }), // no digits
      );
      expect(status).toBe(422);
      expect(fieldsWithError(json.errors)).toContain("street_address");
    });

    it("rejects a missing postal code", async () => {
      const { status, json } = await post(makeBody({ postal_code: "" }));
      expect(status).toBe(422);
      expect(fieldsWithError(json.errors)).toContain("postal_code");
    });

    it("rejects a malformed postal code", async () => {
      const { status, json } = await post(makeBody({ postal_code: "!" }));
      expect(status).toBe(422);
      expect(fieldsWithError(json.errors)).toContain("postal_code");
    });
  });

  describe("business account", () => {
    const businessBody = (overrides: Record<string, unknown> = {}) =>
      makeBody({
        intent: "business",
        business_name: "Doe Motors",
        business_kind: "used_dealership",
        business_address: "45 Ortigas Ave",
        business_postal_code: "1600",
        // Personal address is not required for business-like intents.
        street_address: "",
        postal_code: "",
        ...overrides,
      });

    it("accepts a fully valid business submission", async () => {
      const { status, json } = await post(businessBody());
      expect(status).toBe(200);
      expect(json.ok).toBe(true);
    });

    it("rejects when the mobile number is missing", async () => {
      const { status, json } = await post(businessBody({ phone_national: "" }));
      expect(status).toBe(422);
      expect(fieldsWithError(json.errors)).toContain("phone_national");
    });

    it("rejects an invalid business contact email", async () => {
      const { status, json } = await post(businessBody({ email: "bad@" }));
      expect(status).toBe(422);
      expect(fieldsWithError(json.errors)).toContain("email");
    });

    it("rejects when business_address is missing", async () => {
      const { status, json } = await post(businessBody({ business_address: "" }));
      expect(status).toBe(422);
      expect(fieldsWithError(json.errors)).toContain("business_address");
    });

    it("rejects when business_address lacks a building/unit number", async () => {
      const { status, json } = await post(
        businessBody({ business_address: "Ortigas Avenue" }),
      );
      expect(status).toBe(422);
      expect(fieldsWithError(json.errors)).toContain("business_address");
    });

    it("rejects when business_postal_code is missing", async () => {
      const { status, json } = await post(
        businessBody({ business_postal_code: "" }),
      );
      expect(status).toBe(422);
      expect(fieldsWithError(json.errors)).toContain("business_postal_code");
    });

    it("rejects a malformed business_postal_code", async () => {
      const { status, json } = await post(
        businessBody({ business_postal_code: "@@" }),
      );
      expect(status).toBe(422);
      expect(fieldsWithError(json.errors)).toContain("business_postal_code");
    });

    it("rejects when business_name is missing", async () => {
      const { status, json } = await post(businessBody({ business_name: "" }));
      expect(status).toBe(422);
      expect(fieldsWithError(json.errors)).toContain("business_name");
    });
  });
});
