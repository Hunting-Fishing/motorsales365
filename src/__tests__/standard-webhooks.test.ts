import { describe, expect, it } from "vitest";
import {
  computeStandardWebhookSignature,
  verifyStandardWebhook,
  WebhookVerificationError,
} from "@/lib/webhooks/standard-webhooks.server";

const SECRET = "v1,whsec_" + btoa("super-secret-test-key-0123456789");

async function signedRequest(body: string, opts: { ts?: number; prefix?: "webhook" | "svix"; sig?: string } = {}) {
  const id = "msg_123";
  const ts = String(opts.ts ?? Math.floor(Date.now() / 1000));
  const sig = opts.sig ?? (await computeStandardWebhookSignature(SECRET, id, ts, body));
  const p = opts.prefix ?? "webhook";
  return new Request("https://example.test/hook", {
    method: "POST",
    body,
    headers: { [`${p}-id`]: id, [`${p}-timestamp`]: ts, [`${p}-signature`]: `v1,${sig}` },
  });
}

describe("verifyStandardWebhook", () => {
  it("accepts a valid Supabase-style signature and returns the body", async () => {
    const req = await signedRequest('{"ok":true}');
    await expect(verifyStandardWebhook(req, SECRET)).resolves.toBe('{"ok":true}');
  });

  it("accepts svix-* headers and a bare whsec_ secret", async () => {
    const req = await signedRequest("{}", { prefix: "svix" });
    await expect(verifyStandardWebhook(req, SECRET.replace(/^v1,/, ""))).resolves.toBe("{}");
  });

  it("rejects a tampered signature", async () => {
    const req = await signedRequest("{}", { sig: btoa("nope") });
    await expect(verifyStandardWebhook(req, SECRET)).rejects.toBeInstanceOf(WebhookVerificationError);
  });

  it("rejects stale timestamps", async () => {
    const req = await signedRequest("{}", { ts: Math.floor(Date.now() / 1000) - 3600 });
    await expect(verifyStandardWebhook(req, SECRET)).rejects.toMatchObject({ code: "stale_timestamp" });
  });

  it("rejects requests without signature headers", async () => {
    const req = new Request("https://example.test/hook", { method: "POST", body: "{}" });
    await expect(verifyStandardWebhook(req, SECRET)).rejects.toMatchObject({ code: "missing_headers" });
  });
});
