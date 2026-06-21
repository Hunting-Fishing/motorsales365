import { describe, it, expect } from "vitest";
import { submitManualPaymentCore } from "./payments-manual.functions";

/**
 * Smoke test: drive submitManualPaymentCore with an in-memory fake of the
 * two Supabase clients it uses, then assert that:
 *   1. a row was inserted into `payments` (what /admin/payments lists)
 *   2. a `payment_review_events` row was inserted (admin timeline)
 *   3. an `admin_audit_log` row was inserted (audit trail visible in /admin/payments)
 *   4. the payment's review_state was stamped `awaiting_review`
 *
 * We don't hit the real DB; instead the fake captures every insert/update
 * keyed by table so we can verify the rows /admin/payments reads from would
 * be produced.
 */
function makeFakeSupabase() {
  const inserts: Record<string, any[]> = {};
  const updates: Record<string, Array<{ patch: any; match: any }>> = {};

  const fromHandler = (table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => {
          if (table === "payment_method_config") {
            return { data: { method: "gcash_manual", enabled: true, is_manual: true }, error: null };
          }
          return { data: null, error: null };
        },
      }),
    }),
    insert: (row: any) => {
      (inserts[table] ||= []).push(row);
      return {
        select: () => ({
          single: async () => ({
            data: { id: "pay_" + (inserts[table].length), invoice_number: "INV-0001" },
            error: null,
          }),
        }),
      };
    },
    update: (patch: any) => ({
      eq: (col: string, val: any) => {
        (updates[table] ||= []).push({ patch, match: { [col]: val } });
        return Promise.resolve({ data: null, error: null });
      },
    }),
  });

  return {
    client: {
      from: fromHandler,
      rpc: async (name: string) => {
        if (name === "generate_invoice_number") return { data: "INV-0001", error: null };
        return { data: null, error: null };
      },
    },
    inserts,
    updates,
  };
}

describe("manual payment submission smoke test", () => {
  it("creates payment + review event + audit log entry visible to /admin/payments", async () => {
    const fake = makeFakeSupabase();

    const result = await submitManualPaymentCore(
      { supabase: fake.client as any, supabaseAdmin: fake.client as any, userId: "user-123" },
      {
        kind: "listing",
        ref_id: "listing-abc",
        method: "gcash_manual",
        amount_php: 500,
        reference: "GC-987654",
        proof_path: "proofs/user-123/abc.png",
      },
    );

    // 1. Result shape matches what the buyer UI expects.
    expect(result).toMatchObject({
      review_state: "awaiting_review",
      proof_attached: true,
      invoice_number: "INV-0001",
    });

    // 2. A payments row was inserted with the right fields.
    const paymentRow = fake.inserts["payments"]?.[0];
    expect(paymentRow).toBeDefined();
    expect(paymentRow).toMatchObject({
      user_id: "user-123",
      kind: "listing",
      listing_id: "listing-abc",
      amount_php: 500,
      status: "pending",
      method: "gcash_manual",
      reference: "GC-987654",
      proof_url: "proofs/user-123/abc.png",
      invoice_number: "INV-0001",
    });

    // 3. review_state was stamped to awaiting_review (what the admin list filters on).
    const stamp = fake.updates["payments"]?.find((u) => u.patch.review_state === "awaiting_review");
    expect(stamp).toBeDefined();

    // 4. Admin timeline entry was created.
    const evt = fake.inserts["payment_review_events"]?.[0];
    expect(evt).toMatchObject({
      actor_id: "user-123",
      from_state: null,
      to_state: "awaiting_review",
    });
    expect(evt.note).toContain("gcash_manual");

    // 5. Admin audit log entry was created — this is what surfaces in /admin/payments.
    const audit = fake.inserts["admin_audit_log"]?.[0];
    expect(audit).toMatchObject({
      actor_id: "user-123",
      target_user_id: "user-123",
      action: "payment_submitted",
      entity_type: "payment",
      new_value: "awaiting_review",
    });
    expect(audit.metadata).toMatchObject({
      invoice_number: "INV-0001",
      method: "gcash_manual",
      kind: "listing",
      amount_php: 500,
      reference: "GC-987654",
      proof_attached: true,
    });
  });

  it("rejects submission when payment method is disabled", async () => {
    const fake = makeFakeSupabase();
    // Override config to disabled.
    fake.client.from = ((table: string) => {
      if (table === "payment_method_config") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { method: "gcash_manual", enabled: false, is_manual: true },
                error: null,
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    }) as any;

    await expect(
      submitManualPaymentCore(
        { supabase: fake.client as any, supabaseAdmin: fake.client as any, userId: "u" },
        { kind: "listing", method: "gcash_manual", amount_php: 100 },
      ),
    ).rejects.toThrow("Payment method not available");
  });
});
