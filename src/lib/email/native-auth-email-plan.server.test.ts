// @vitest-environment node
// Real verifier + planner; independent Node HMAC/hash fixtures. Synthetic data
// only. No routes, queues, providers, persistence or production Auth settings.
import { createHash, createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isVerifiedStandardWebhook,
  verifyStandardWebhook,
} from "@/lib/webhooks/standard-webhooks.server";
import {
  NATIVE_AUTH_EMAIL_PLAN_VERSION,
  NATIVE_AUTH_EMAIL_PROJECT_REF,
  NATIVE_AUTH_EMAIL_SITE_ORIGIN,
  NATIVE_AUTH_EMAIL_SUPABASE_ORIGIN,
  NativeAuthEmailPlanError,
  assertNativeAuthEmailEventCompatible,
  planNativeAuthEmail,
} from "./native-auth-email-plan.server";

const version = "365-auth-email-plan/v1";
const projectRef = "wjxaajgvddtrxxtocxen";
const siteOrigin = "https://www.365motorsales.com";
const supabaseOrigin = "https://wjxaajgvddtrxxtocxen.supabase.co";
const eventId = "synthetic_auth_event-123";
const subjectId = "12345678-1234-4234-8234-123456789abc";
const currentEmail = "current@example.invalid";
const newEmail = "new@example.invalid";
const primaryToken = "SyntheticCurrent_otp-42";
const nextToken = "SyntheticNew_otp-84";
const primaryHash = "synthetic-primary-hash-0123456789abcdef";
const nextHash = "synthetic-current-hash-abcdef0123456789";
const key = Buffer.alloc(32, 0x73);
const secret = `v1,whsec_${key.toString("base64")}`;
const nowSeconds = 1_800_000_000;
const policy = { projectRef, siteOrigin, secureEmailChange: true } as const;
let clockMs = nowSeconds * 1000;

type Plan = Awaited<ReturnType<typeof planNativeAuthEmail>>;
type Overrides = { user?: Record<string, unknown>; email_data?: Record<string, unknown> };
function payload(action = "signup", overrides: Overrides = {}) {
  return {
    user: {
      id: subjectId,
      email: currentEmail,
      ...(action === "email_change" ? { new_email: newEmail } : {}),
      ...overrides.user,
    },
    email_data: {
      site_url: supabaseOrigin,
      redirect_to: "",
      email_action_type: action,
      token: primaryToken,
      token_hash: primaryHash,
      token_new: action === "email_change" ? nextToken : "",
      token_hash_new: action === "email_change" ? nextHash : "",
      ...overrides.email_data,
    },
  };
}
function sha(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
async function verified(value: unknown = payload(), id = eventId) {
  const body = typeof value === "string" ? value : JSON.stringify(value);
  const timestamp = String(Math.floor(clockMs / 1000));
  const signature = createHmac("sha256", key)
    .update(`${id}.${timestamp}.`, "utf8")
    .update(body, "utf8")
    .digest("base64");
  return verifyStandardWebhook(
    new Request("https://example.invalid/synthetic-auth-hook", {
      method: "POST",
      headers: {
        "webhook-id": id,
        "webhook-timestamp": timestamp,
        "webhook-signature": `v1,${signature}`,
      },
      body,
    }),
    secret,
  );
}
async function plan(
  value: unknown = payload(),
  policyOverrides: Record<string, unknown> = {},
  id = eventId,
) {
  return planNativeAuthEmail({
    verifiedWebhook: await verified(value, id),
    policy: { ...policy, ...policyOverrides } as Parameters<
      typeof planNativeAuthEmail
    >[0]["policy"],
  });
}
function recorded(value: Plan): Record<string, unknown> {
  return {
    version: value.version,
    projectRef: value.projectRef,
    eventId: value.eventId,
    eventKey: value.eventKey,
    bodyFingerprint: value.bodyFingerprint,
    planFingerprint: value.planFingerprint,
  };
}
function assertGenericError(error: unknown) {
  expect(error).toBeInstanceOf(NativeAuthEmailPlanError);
  expect(error).toHaveProperty("message", "Auth email planning failed.");
  expect(error).toHaveProperty("code", expect.any(String));
  expect(error).not.toHaveProperty("cause");
  const printable = String(error);
  for (const sensitive of [secret, eventId, currentEmail, primaryToken, primaryHash]) {
    expect(printable).not.toContain(sensitive);
  }
}
async function rejects(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    assertGenericError(error);
    return;
  }
  throw new Error("Expected synthetic planner input to reject");
}
function rejectsCompatibility(value: Plan, previous: unknown) {
  try {
    assertNativeAuthEmailEventCompatible(value, previous);
  } catch (error) {
    assertGenericError(error);
    return;
  }
  throw new Error("Expected synthetic compatibility input to reject");
}

beforeEach(() => {
  clockMs = nowSeconds * 1000;
  vi.spyOn(Date, "now").mockImplementation(() => clockMs);
  vi.spyOn(globalThis, "fetch").mockRejectedValue(
    new Error("Unexpected synthetic network request"),
  );
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});
afterEach(() => {
  expect(globalThis.fetch).not.toHaveBeenCalled();
  expect(console.error).not.toHaveBeenCalled();
  expect(console.warn).not.toHaveBeenCalled();
  expect(console.log).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

describe("native Auth plan identity and capabilities", () => {
  it("pins the native version and sole canonical 365 backend/site", () => {
    expect(NATIVE_AUTH_EMAIL_PLAN_VERSION).toBe(version);
    expect(NATIVE_AUTH_EMAIL_PROJECT_REF).toBe(projectRef);
    expect(NATIVE_AUTH_EMAIL_SITE_ORIGIN).toBe(siteOrigin);
    expect(NATIVE_AUTH_EMAIL_SUPABASE_ORIGIN).toBe(supabaseOrigin);
  });

  it("uses the actual verifier's private provenance rather than structural lookalikes", async () => {
    const event = await verified();
    expect(isVerifiedStandardWebhook(event)).toBe(true);
    expect(Object.isFrozen(event)).toBe(true);
    for (const impostor of [
      undefined,
      null,
      "verified",
      { ...event },
      Object.freeze({ ...event }),
      JSON.parse(JSON.stringify(event)),
      structuredClone(event),
    ]) {
      expect(isVerifiedStandardWebhook(impostor)).toBe(false);
      await rejects(planNativeAuthEmail({ verifiedWebhook: impostor, policy }));
    }
    expect((await planNativeAuthEmail({ verifiedWebhook: event, policy })).eventId).toBe(eventId);
  });

  it("independently derives every identity/fingerprint and deep freezes commands/props", async () => {
    const body = JSON.stringify(payload());
    const value = await plan(body);
    expect(value).toMatchObject({ version, projectRef, eventId, subjectId });
    expect(value.bodyFingerprint).toBe(sha(body));
    expect(value.eventKey).toBe(sha(JSON.stringify([version, projectRef, eventId])));
    expect(value.planFingerprint).toBe(
      sha(JSON.stringify([version, projectRef, siteOrigin, true, sha(body)])),
    );
    expect(value.commands).toHaveLength(1);
    expect(value.commands[0].deliveryId).toBe(
      sha(JSON.stringify([version, projectRef, eventId, "primary"])),
    );
    for (const frozen of [value, value.commands, value.commands[0], value.commands[0].props]) {
      expect(Object.isFrozen(frozen)).toBe(true);
    }
    expect(Reflect.set(value.commands[0], "recipient", "changed@example.invalid")).toBe(false);
    expect(value.commands[0].recipient).toBe(currentEmail);
  });

  it("keeps retry identity stable while preserving exact raw-body fingerprints", async () => {
    const compact = JSON.stringify(payload());
    const pretty = JSON.stringify(payload(), null, 2);
    const original = await plan(compact);
    clockMs += 1000;
    const retry = await plan(compact);
    const changedFormatting = await plan(pretty);
    expect(retry).toEqual(original);
    expect(changedFormatting.eventKey).toBe(original.eventKey);
    expect(changedFormatting.commands[0].deliveryId).toBe(original.commands[0].deliveryId);
    expect(changedFormatting.bodyFingerprint).not.toBe(original.bodyFingerprint);
    expect(changedFormatting.planFingerprint).not.toBe(original.planFingerprint);
  });

  it("separates different event IDs without exposing recipients in delivery IDs", async () => {
    const first = await plan();
    const second = await plan(payload(), {}, "synthetic_other_event");
    expect(second.eventKey).not.toBe(first.eventKey);
    expect(second.commands[0].deliveryId).not.toBe(first.commands[0].deliveryId);
    expect(first.commands[0].deliveryId).toMatch(/^[a-f0-9]{64}$/);
  });

  it.each([
    { projectRef: "ujkizgblscqcejghxemb" },
    { projectRef: "another-project" },
    { siteOrigin: "https://365motorsales.com" },
    { siteOrigin: "https://www.365motorsales.com/" },
    { secureEmailChange: "true" },
    { secureEmailChange: null },
    { secureEmailChange: undefined },
  ])("rejects invalid trusted policy %j", async (invalidPolicy) => {
    await rejects(plan(payload(), invalidPolicy));
  });

  it("rechecks fixed freshness when an authentic event is held before planning", async () => {
    const event = await verified();
    clockMs += 301_000;
    await rejects(planNativeAuthEmail({ verifiedWebhook: event, policy }));
  });

  it("rechecks fixed freshness after hashing without replacing native crypto", async () => {
    const event = await verified();
    let checks = 0;
    vi.mocked(Date.now).mockImplementation(() =>
      ++checks === 1 ? nowSeconds * 1000 : (nowSeconds + 301) * 1000,
    );
    await rejects(planNativeAuthEmail({ verifiedWebhook: event, policy }));
    expect(checks).toBeGreaterThanOrEqual(2);
  });

  it("accepts frozen trusted policy without mutation and snapshots it before asynchronous hashing", async () => {
    const fixedPolicy = Object.freeze({ ...policy });
    const event = await verified();
    const value = await planNativeAuthEmail({ verifiedWebhook: event, policy: fixedPolicy });
    expect(fixedPolicy).toEqual(policy);
    expect(value.planFingerprint).toBe(
      sha(JSON.stringify([version, projectRef, siteOrigin, true, value.bodyFingerprint])),
    );
    const mutablePolicy = { ...policy, secureEmailChange: true };
    const pending = planNativeAuthEmail({ verifiedWebhook: event, policy: mutablePolicy });
    mutablePolicy.secureEmailChange = false;
    const snapshot = await pending;
    expect(snapshot.planFingerprint).toBe(value.planFingerprint);
  });

  it("accepts the fixed freshness boundary without weakening it with caller options", async () => {
    const event = await verified();
    clockMs += 300_000;
    expect((await planNativeAuthEmail({ verifiedWebhook: event, policy })).eventId).toBe(eventId);
  });
});

describe("native Auth actions and template contracts", () => {
  it.each(["signup", "invite", "magiclink", "recovery"])(
    "plans %s as one critical primary command",
    async (action) => {
      const value = await plan(payload(action));
      expect(value.commands).toHaveLength(1);
      expect(value.commands[0]).toMatchObject({
        slot: "primary",
        action,
        template: action,
        recipient: currentEmail,
        purpose: "critical_auth",
      });
      const props = value.commands[0].props;
      expect(props).toMatchObject({ siteName: "365 MotorSales", token: primaryToken });
      if (action === "signup")
        expect(props).toMatchObject({ siteUrl: siteOrigin, recipient: currentEmail });
      if (action === "invite") expect(props).toHaveProperty("siteUrl", siteOrigin);
      const url = new URL(String(props.confirmationUrl));
      if (action === "recovery") {
        expect(url.origin).toBe(siteOrigin);
        expect(url.pathname).toBe("/reset-password");
        expect([...url.searchParams.entries()]).toEqual([
          ["token_hash", primaryHash],
          ["type", "recovery"],
        ]);
      } else {
        expect(url.origin).toBe(supabaseOrigin);
        expect(url.pathname).toBe("/auth/v1/verify");
        expect([...url.searchParams.entries()]).toEqual([
          ["token", primaryHash],
          ["type", action],
          ["redirect_to", `${siteOrigin}/`],
        ]);
      }
    },
  );

  it("plans reauthentication as OTP-only without an unnecessary confirmation URL", async () => {
    const value = await plan(
      payload("reauthentication", { email_data: { token_hash: undefined } }),
    );
    expect(value.commands[0]).toMatchObject({
      slot: "primary",
      action: "reauthentication",
      template: "reauthentication",
      recipient: currentEmail,
      purpose: "critical_auth",
      props: { token: primaryToken },
    });
    expect(value.commands[0].props).toEqual({ token: primaryToken });
  });

  it.each([
    "email",
    "password_changed_notification",
    "email_changed_notification",
    "phone_changed_notification",
    "identity_linked_notification",
    "identity_unlinked_notification",
    "mfa_factor_enrolled_notification",
    "mfa_factor_unenrolled_notification",
    "SIGNUP",
    "unknown-action",
  ])(
    "explicitly rejects unsupported action %s rather than silently dropping it",
    async (action) => {
      await rejects(plan(payload(action)));
    },
  );

  it("ignores user-editable metadata without granting authority or using arbitrary URLs/recipients", async () => {
    const value = await plan(
      payload("signup", {
        user: {
          user_metadata: {
            role: "admin",
            email: "attacker@example.invalid",
            url: "https://attacker.invalid/",
            privateNote: "synthetic-private-metadata",
          },
          app_metadata: { role: "owner", shop_id: "synthetic-shop" },
        },
      }),
    );
    expect(value.commands[0].recipient).toBe(currentEmail);
    expect(JSON.stringify(value)).not.toContain("attacker");
    expect(JSON.stringify(value)).not.toContain("synthetic-private-metadata");
    expect(JSON.stringify(value)).not.toContain("synthetic-shop");
  });

  it("URL-encodes opaque hashes without interpreting their punctuation as link parameters", async () => {
    const hash = 'synthetic&opaque?hash=#percent%plus+quote"';
    const value = await plan(payload("signup", { email_data: { token_hash: hash } }));
    const url = new URL(String(value.commands[0].props.confirmationUrl));
    expect(url.searchParams.get("token")).toBe(hash);
    expect([...url.searchParams.keys()]).toEqual(["token", "type", "redirect_to"]);
  });
});

describe("secure email-change recipient and token mapping", () => {
  it.each([true, false])(
    "supports the explicit empty-current first-email case with secure mode %s",
    async (secureEmailChange) => {
      const value = await plan(
        payload("email_change", {
          user: { email: "", new_email: newEmail },
          email_data: { token_new: "", token_hash_new: "", old_email: "" },
        }),
        { secureEmailChange },
      );
      expect(value.commands).toHaveLength(1);
      const command = value.commands[0];
      expect(command).toMatchObject({
        slot: "new",
        recipient: newEmail,
        action: "email_change",
        template: "email_change",
        purpose: "critical_auth",
        props: { token: primaryToken, oldEmail: "", newEmail, email: newEmail },
      });
      expect(command.deliveryId).toBe(sha(JSON.stringify([version, projectRef, eventId, "new"])));
      expect(new URL(String(command.props.confirmationUrl)).searchParams.get("token")).toBe(
        primaryHash,
      );
    },
  );

  it.each([undefined, null])(
    "does not infer first-email mode from missing/null current address %j",
    async (email) => {
      await rejects(
        plan(
          payload("email_change", {
            user: { email, new_email: newEmail },
            email_data: { token_new: "", token_hash_new: "" },
          }),
        ),
      );
    },
  );

  it.each([
    { token: "", token_new: "", token_hash_new: "" },
    { token_hash: "", token_new: "", token_hash_new: "" },
    { token_new: nextToken, token_hash_new: "" },
    { token_new: "", token_hash_new: nextHash },
    { token: "", token_new: nextToken, token_hash_new: "" },
  ])("rejects partial or unexpected first-email token pairs %j", async (email_data) => {
    for (const secureEmailChange of [true, false]) {
      await rejects(
        plan(payload("email_change", { user: { email: "", new_email: newEmail }, email_data }), {
          secureEmailChange,
        }),
      );
    }
  });

  it("rejects a complete secure-change pair rather than inferring a nonexistent current address", async () => {
    await rejects(plan(payload("email_change", { user: { email: "", new_email: newEmail } })));
  });

  it("pairs counterintuitive hashes with the correct fixed recipient slots", async () => {
    const value = await plan(payload("email_change", { email_data: { old_email: currentEmail } }));
    expect(value.commands).toHaveLength(2);
    const current = value.commands.find((command) => command.slot === "current")!;
    const next = value.commands.find((command) => command.slot === "new")!;
    for (const [command, recipient, token, hash, slot] of [
      [current, currentEmail, primaryToken, nextHash, "current"],
      [next, newEmail, nextToken, primaryHash, "new"],
    ] as const) {
      expect(command).toMatchObject({
        action: "email_change",
        template: "email_change",
        recipient,
        purpose: "critical_auth",
      });
      expect(command.deliveryId).toBe(sha(JSON.stringify([version, projectRef, eventId, slot])));
      expect(command.props).toMatchObject({
        token,
        oldEmail: currentEmail,
        newEmail,
        email: recipient,
      });
      expect(new URL(String(command.props.confirmationUrl)).searchParams.get("token")).toBe(hash);
    }
    expect(current.deliveryId).not.toBe(next.deliveryId);
  });

  it.each(["token", "token_new"])(
    "accepts documented new-address-only variant using %s",
    async (tokenField) => {
      const value = await plan(
        payload("email_change", {
          email_data: {
            token: tokenField === "token" ? primaryToken : "",
            token_new: tokenField === "token_new" ? nextToken : "",
            token_hash_new: "",
          },
        }),
        { secureEmailChange: false },
      );
      expect(value.commands).toHaveLength(1);
      const command = value.commands[0];
      expect(command).toMatchObject({ slot: "new", recipient: newEmail, action: "email_change" });
      expect(command.props).toMatchObject({
        oldEmail: currentEmail,
        newEmail,
        email: newEmail,
        token: tokenField === "token" ? primaryToken : nextToken,
      });
      expect(new URL(String(command.props.confirmationUrl)).searchParams.get("token")).toBe(
        primaryHash,
      );
      expect(command.deliveryId).toBe(sha(JSON.stringify([version, projectRef, eventId, "new"])));
    },
  );

  it.each([undefined, null, "", currentEmail, "invalid-address"])(
    "never falls back from invalid new_email %j to the current recipient",
    async (new_email) => {
      await rejects(plan(payload("email_change", { user: { new_email } })));
    },
  );

  it.each(["token", "token_new", "token_hash", "token_hash_new"])(
    "rejects missing secure-change field %s instead of downgrading",
    async (field) => {
      await rejects(plan(payload("email_change", { email_data: { [field]: "" } })));
    },
  );

  it("does not use body field presence to override trusted Secure Email Change policy", async () => {
    await rejects(plan(payload("email_change"), { secureEmailChange: false }));
    await rejects(
      plan(payload("email_change", { email_data: { token_new: "", token_hash_new: "" } })),
    );
  });

  it("rejects ambiguous or missing single-recipient OTPs", async () => {
    await rejects(
      plan(payload("email_change", { email_data: { token_hash_new: "" } }), {
        secureEmailChange: false,
      }),
    );
    await rejects(
      plan(
        payload("email_change", { email_data: { token: "", token_new: "", token_hash_new: "" } }),
        { secureEmailChange: false },
      ),
    );
  });

  it.each(["other@example.invalid", "Current@example.invalid"])(
    "rejects inconsistent supplied old_email %s",
    async (old_email) => {
      await rejects(plan(payload("email_change", { email_data: { old_email } })));
    },
  );
});

describe("native Auth payload shape and bounded fields", () => {
  it("allows ordinary nested metadata with repeated keys in distinct object scopes", async () => {
    const value = await plan(
      payload("signup", {
        user: {
          user_metadata: {
            nested: [{ name: "first" }, { name: "second" }],
            details: { name: "third" },
          },
        },
      }),
    );
    expect(value.commands[0].recipient).toBe(currentEmail);
  });

  it("does not confuse braces, colons, escaped quotes or backslashes inside string values with JSON structure", async () => {
    const value = await plan(
      payload("signup", {
        user: {
          user_metadata: {
            description:
              'synthetic {"user": "quoted"} [brackets] colon: backslash\\ escaped quote"',
          },
        },
      }),
    );
    expect(value.commands[0].recipient).toBe(currentEmail);
  });

  it.each([
    [
      "duplicate action",
      (raw: string) =>
        raw.replace(
          '"email_action_type":"signup"',
          '"email_action_type":"invite","email_action_type":"signup"',
        ),
    ],
    [
      "escaped duplicate action",
      (raw: string) =>
        raw.replace(
          '"email_action_type":"signup"',
          '"email\\u005faction_type":"invite","email_action_type":"signup"',
        ),
    ],
    [
      "duplicate recipient",
      (raw: string) =>
        raw.replace(
          `"email":"${currentEmail}"`,
          `"email":"other@example.invalid","email":"${currentEmail}"`,
        ),
    ],
    [
      "escaped duplicate recipient",
      (raw: string) =>
        raw.replace(
          `"email":"${currentEmail}"`,
          `"\\u0065mail":"other@example.invalid","email":"${currentEmail}"`,
        ),
    ],
    [
      "duplicate token hash",
      (raw: string) =>
        raw.replace(
          `"token_hash":"${primaryHash}"`,
          `"token_hash":"another","token_hash":"${primaryHash}"`,
        ),
    ],
  ])("rejects signed ambiguous JSON with %s", async (_name, transform) => {
    const raw = JSON.stringify(payload());
    const modified = transform(raw);
    expect(modified).not.toBe(raw);
    await rejects(plan(modified));
  });

  it("rejects escaped duplicate top-level objects and duplicate ignored metadata keys", async () => {
    const value = payload();
    await rejects(
      plan(
        `{"\\u0075ser":{},"user":${JSON.stringify(value.user)},"email_data":${JSON.stringify(value.email_data)}}`,
      ),
    );
    const raw = JSON.stringify(
      payload("signup", { user: { user_metadata: { duplicate: "second" } } }),
    );
    await rejects(
      plan(raw.replace('"duplicate":"second"', '"duplicate":"first","duplicate":"second"')),
    );
  });

  it("accepts 32-container metadata depth but rejects more deeply nested authenticated payloads", async () => {
    const nested = (depth: number) => {
      let value: unknown = "synthetic leaf";
      for (let index = 0; index < depth; index++) value = { next: value };
      return value;
    };
    expect(
      (await plan(payload("signup", { user: { user_metadata: nested(30) } }))).commands,
    ).toHaveLength(1);
    await rejects(plan(payload("signup", { user: { user_metadata: nested(31) } })));
    await rejects(plan(payload("signup", { user: { user_metadata: nested(40) } })));
  });
  it.each([
    "{broken-json",
    "null",
    "[]",
    "42",
    '"string"',
    "{}",
    '{"user":[],"email_data":{}}',
    '{"user":{},"email_data":[]}',
  ])("rejects malformed or non-object payload %s", async (body) => {
    await rejects(plan(body));
  });

  it.each([
    undefined,
    null,
    "",
    "not-a-uuid",
    "12345678-1234-0234-8234-123456789abc",
    "12345678-1234-9234-8234-123456789abc",
    "12345678-1234-4234-7234-123456789abc",
  ])("rejects invalid subject ID %j", async (id) => {
    await rejects(plan(payload("signup", { user: { id } })));
  });

  it.each([
    undefined,
    null,
    "",
    "nodomain",
    "local@example",
    "Name <local@example.invalid>",
    "a@example.invalid,b@example.invalid",
    "a\r\n@example.invalid",
    "é@example.invalid",
    `${"a".repeat(65)}@example.invalid`,
  ])("rejects invalid plain recipient %j", async (email) => {
    await rejects(plan(payload("signup", { user: { email } })));
  });

  it("accepts the 254-byte plain-address bound and rejects 255 bytes", async () => {
    const address = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`;
    expect(address.length).toBe(254);
    expect(
      (await plan(payload("signup", { user: { email: address } }))).commands[0].recipient,
    ).toBe(address);
    await rejects(plan(payload("signup", { user: { email: `${address}d` } })));
  });

  it.each([
    undefined,
    null,
    "",
    " ",
    "otp/unsafe",
    "otp\\unsafe",
    "otp\nunsafe",
    "é",
    "x".repeat(129),
  ])("rejects absent/invalid required OTP %j", async (token) => {
    await rejects(plan(payload("signup", { email_data: { token } })));
  });

  it("accepts bounded opaque OTPs rather than imposing the docs' illustrative six-digit shape", async () => {
    for (const token of ["1", "Aa_9-", "x".repeat(128)]) {
      expect(
        (await plan(payload("signup", { email_data: { token } }))).commands[0].props.token,
      ).toBe(token);
    }
  });

  it.each([
    undefined,
    null,
    "",
    "has whitespace",
    "has\\backslash",
    "has\tcontrol",
    "é",
    "x".repeat(257),
  ])("rejects absent/invalid required token hash %j", async (token_hash) => {
    await rejects(plan(payload("signup", { email_data: { token_hash } })));
  });

  it("accepts bounded opaque hashes without a guessed digest-length requirement", async () => {
    for (const token_hash of ["x", "x".repeat(256)]) {
      expect(
        new URL(
          String(
            (await plan(payload("signup", { email_data: { token_hash } }))).commands[0].props
              .confirmationUrl,
          ),
        ).searchParams.get("token"),
      ).toBe(token_hash);
    }
  });

  it.each(["token_new", "token_hash_new"])(
    "rejects unexpected nonempty %s for a nonchange action",
    async (field) => {
      await rejects(plan(payload("signup", { email_data: { [field]: "unexpected" } })));
      await rejects(plan(payload("reauthentication", { email_data: { [field]: "unexpected" } })));
    },
  );

  it("validates a supplied reauthentication hash even though its template is OTP-only", async () => {
    await rejects(plan(payload("reauthentication", { email_data: { token_hash: "unsafe hash" } })));
  });
});

describe("native Auth URL and callback allowlists", () => {
  it.each([
    supabaseOrigin,
    `${supabaseOrigin}/`,
    `${supabaseOrigin}/auth/v1`,
    `${supabaseOrigin}/auth/v1/`,
  ])("accepts canonical Auth API base site_url %s", async (site_url) => {
    expect((await plan(payload("signup", { email_data: { site_url } }))).commands).toHaveLength(1);
  });

  it.each([
    undefined,
    null,
    "",
    "https://365motorsales.com",
    "http://www.365motorsales.com",
    "https://www.365motorsales.com:443",
    `${siteOrigin}/login`,
    `${siteOrigin}/?x=1`,
    `${siteOrigin}/#fragment`,
    "https://user@www.365motorsales.com",
    "https://www.365motorsales.com.attacker.invalid",
    "https://ujkizgblscqcejghxemb.supabase.co",
    siteOrigin,
    `${siteOrigin}/`,
    `${supabaseOrigin}/auth/v1/verify`,
    `${supabaseOrigin}/?query=1`,
    `${supabaseOrigin}/auth/v1#fragment`,
    "http://localhost:3000",
  ])("rejects unapproved site_url %j", async (site_url) => {
    await rejects(plan(payload("signup", { email_data: { site_url } })));
  });

  it.each(["signup", "invite", "magiclink"])(
    "permits the explicit verify-email callback for %s",
    async (action) => {
      const redirect_to = `${siteOrigin}/verify-email?intent=business&redirect=%2Fbusinesses%2Fsubmit`;
      const value = await plan(payload(action, { email_data: { redirect_to } }));
      expect(
        new URL(String(value.commands[0].props.confirmationUrl)).searchParams.get("redirect_to"),
      ).toBe(redirect_to);
    },
  );

  it.each(["buyer", "business", "service_provider"])(
    "allows explicit supported signup intent %s",
    async (intent) => {
      const redirect_to = `${siteOrigin}/verify-email?intent=${intent}&redirect=%2Fdashboard`;
      expect(
        (await plan(payload("signup", { email_data: { redirect_to } }))).commands,
      ).toHaveLength(1);
    },
  );

  it.each(["/dashboard", "/businesses/submit", "/dashboard/profile"])(
    "permits the bounded internal post-signup target %s",
    async (redirect) => {
      const redirect_to = `${siteOrigin}/verify-email?redirect=${encodeURIComponent(redirect)}`;
      expect(
        (await plan(payload("signup", { email_data: { redirect_to } }))).commands,
      ).toHaveLength(1);
    },
  );

  it.each(["email_change", "reauthentication"])(
    "permits the profile callback only for the appropriate %s action",
    async (action) => {
      expect(
        (
          await plan(
            payload(action, { email_data: { redirect_to: `${siteOrigin}/dashboard/profile` } }),
          )
        ).commands.length,
      ).toBeGreaterThan(0);
    },
  );

  it("permits the explicit recovery callback while retaining the fixed token-hash reset link", async () => {
    const value = await plan(
      payload("recovery", { email_data: { redirect_to: `${siteOrigin}/reset-password` } }),
    );
    expect(new URL(String(value.commands[0].props.confirmationUrl)).pathname).toBe(
      "/reset-password",
    );
  });

  it.each([
    undefined,
    null,
    "https://365motorsales.com/",
    "http://www.365motorsales.com/",
    "https://www.365motorsales.com:443/",
    "/verify-email",
    "//attacker.invalid/",
    "https://attacker.invalid/",
    "https://user:pass@www.365motorsales.com/",
    `${siteOrigin}/#fragment`,
    `${siteOrigin}/?unknown=1`,
    `${siteOrigin}/admin`,
    `${siteOrigin}/reset-password`,
    `${siteOrigin}/dashboard/profile`,
    `${siteOrigin}/verify-email/`,
    `${siteOrigin}/x/../verify-email`,
    `${siteOrigin}/%76erify-email`,
    `${siteOrigin}/verify-email?intent=admin`,
    `${siteOrigin}/verify-email?unknown=x`,
    `${siteOrigin}/verify-email?intent=buyer&intent=business`,
    `${siteOrigin}/verify-email?redirect=%2Fdashboard&redirect=%2Fbusinesses%2Fsubmit`,
    `${siteOrigin}/verify-email?redirect=%2F%2Fattacker.invalid`,
    `${siteOrigin}/verify-email?redirect=%2Fadmin`,
    `${siteOrigin}/verify-email?redirect=%252Fdashboard`,
    `${siteOrigin}/verify-email?redirect=%2Fdashboard%3Fx%3D1`,
    `${siteOrigin}/verify-email?redirect=%2F%5Cattacker.invalid`,
    `${siteOrigin}/verify-email?redirect=%2Fdashboard%0A`,
    `${siteOrigin}/verify-email?redirect=%2Fdashboard%250A`,
    `${siteOrigin}/verify-email\n`,
  ])("rejects unapproved signup callback %j", async (redirect_to) => {
    await rejects(plan(payload("signup", { email_data: { redirect_to } })));
  });

  it.each([
    ["email_change", "/verify-email"],
    ["reauthentication", "/verify-email"],
    ["recovery", "/verify-email"],
    ["recovery", "/dashboard/profile"],
    ["email_change", "/reset-password"],
    ["reauthentication", "/reset-password"],
    ["email_change", "/dashboard/profile?x=1"],
    ["recovery", "/reset-password?x=1"],
  ])("rejects action/path mismatch %s -> %s", async (action, path) => {
    await rejects(plan(payload(action, { email_data: { redirect_to: `${siteOrigin}${path}` } })));
  });
});

describe("native Auth event compatibility is a comparison, not persistence", () => {
  it("accepts only an exact matching six-field recorded identity", async () => {
    const value = await plan();
    expect(() => assertNativeAuthEmailEventCompatible(value, recorded(value))).not.toThrow();
  });

  it.each(["version", "projectRef", "eventId", "eventKey", "bodyFingerprint", "planFingerprint"])(
    "rejects changed recorded %s",
    async (field) => {
      const value = await plan();
      rejectsCompatibility(value, { ...recorded(value), [field]: "changed" });
    },
  );

  it.each(["version", "projectRef", "eventId", "eventKey", "bodyFingerprint", "planFingerprint"])(
    "rejects missing recorded %s",
    async (field) => {
      const value = await plan();
      const previous = recorded(value);
      delete previous[field];
      rejectsCompatibility(value, previous);
    },
  );

  it("rejects unknown keys, structural lookalikes and malformed recorded state", async () => {
    const value = await plan();
    for (const previous of [null, [], "recorded", { ...recorded(value), extra: true }]) {
      rejectsCompatibility(value, previous);
    }
    for (const impostor of [
      { ...value },
      Object.freeze({ ...value }),
      JSON.parse(JSON.stringify(value)),
      structuredClone(value),
    ]) {
      rejectsCompatibility(impostor as Plan, recorded(value));
    }
  });

  it.each(["matching", "throwing"])(
    "rejects a recorded %s getter without invoking it",
    async (kind) => {
      const value = await plan();
      const previous = recorded(value);
      const getter = vi.fn(() => {
        if (kind === "throwing")
          throw new Error(`Synthetic private getter ${primaryToken} ${secret}`);
        return value.eventId;
      });
      Object.defineProperty(previous, "eventId", { enumerable: true, get: getter });
      rejectsCompatibility(value, previous);
      expect(getter).not.toHaveBeenCalled();
    },
  );

  it("rejects setter-only recorded fields without invoking accessors", async () => {
    const value = await plan();
    const previous = recorded(value);
    const setter = vi.fn();
    Object.defineProperty(previous, "eventKey", { enumerable: true, set: setter });
    rejectsCompatibility(value, previous);
    expect(setter).not.toHaveBeenCalled();
  });

  it.each(["ownKeys", "getOwnPropertyDescriptor"] as const)(
    "wraps a throwing recorded Proxy %s trap in the generic error",
    async (trap) => {
      const value = await plan();
      const handler: ProxyHandler<Record<string, unknown>> = {
        [trap]: () => {
          throw new Error(`Synthetic private Proxy ${primaryHash} ${secret}`);
        },
      };
      rejectsCompatibility(value, new Proxy(recorded(value), handler));
    },
  );

  it("compares matching own data descriptors without invoking a recorded Proxy get trap", async () => {
    const value = await plan();
    const get = vi.fn(() => {
      throw new Error("Synthetic get trap must not run");
    });
    const previous = new Proxy(recorded(value), { get });
    expect(() => assertNativeAuthEmailEventCompatible(value, previous)).not.toThrow();
    expect(get).not.toHaveBeenCalled();
  });

  it("rejects extra nonenumerable or symbol keys rather than overlooking hidden record fields", async () => {
    const value = await plan();
    const nonenumerable = recorded(value);
    Object.defineProperty(nonenumerable, "hidden", {
      value: "synthetic-private-record",
      enumerable: false,
    });
    rejectsCompatibility(value, nonenumerable);
    const symbolic = recorded(value);
    Object.defineProperty(symbolic, Symbol("synthetic-hidden"), {
      value: "synthetic-private-record",
    });
    rejectsCompatibility(value, symbolic);
  });

  it("accepts exactly six matching own data fields even if nonenumerable", async () => {
    const value = await plan();
    const previous = Object.create(null) as Record<string, unknown>;
    for (const [field, fieldValue] of Object.entries(recorded(value))) {
      Object.defineProperty(previous, field, { value: fieldValue, enumerable: false });
    }
    expect(Object.keys(previous)).toEqual([]);
    expect(() => assertNativeAuthEmailEventCompatible(value, previous)).not.toThrow();
  });

  it("rejects inherited matching fields without treating them as recorded own values", async () => {
    const value = await plan();
    const previous = recorded(value);
    delete previous.eventId;
    Object.setPrototypeOf(previous, { eventId: value.eventId });
    rejectsCompatibility(value, previous);
  });

  it("rejects same event identity with changed raw body instead of creating another delivery slot", async () => {
    const original = await plan();
    const changed = await plan(payload("signup", { user: { email: newEmail } }));
    expect(changed.eventKey).toBe(original.eventKey);
    expect(changed.commands[0].deliveryId).toBe(original.commands[0].deliveryId);
    rejectsCompatibility(changed, recorded(original));
  });

  it("detects changed trusted policy even when raw body and stable event identity match", async () => {
    const original = await plan();
    const changed = await plan(payload(), { secureEmailChange: false });
    expect(changed.bodyFingerprint).toBe(original.bodyFingerprint);
    expect(changed.eventKey).toBe(original.eventKey);
    expect(changed.planFingerprint).not.toBe(original.planFingerprint);
    rejectsCompatibility(changed, recorded(original));
  });
});
