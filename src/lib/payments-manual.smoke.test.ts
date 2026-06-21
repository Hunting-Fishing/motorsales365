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

  it("creates boost payment + audit log entry with boost metadata", async () => {
    const fake = makeFakeSupabase();

    const result = await submitManualPaymentCore(
      { supabase: fake.client as any, supabaseAdmin: fake.client as any, userId: "user-789" },
      {
        kind: "boost",
        ref_id: "listing-xyz",
        method: "gcash_manual",
        amount_php: 149,
        reference: "GC-BOOST-42",
        proof_path: "proofs/user-789/boost.png",
        notes: "Boost renewal — 7 days",
      },
    );

    expect(result).toMatchObject({
      review_state: "awaiting_review",
      proof_attached: true,
      invoice_number: "INV-0001",
    });

    // payments row carries kind=boost and the listing_id so /admin/payments
    // can render it under the right buyer + listing.
    const paymentRow = fake.inserts["payments"]?.[0];
    expect(paymentRow).toMatchObject({
      user_id: "user-789",
      kind: "boost",
      listing_id: "listing-xyz",
      amount_php: 149,
      method: "gcash_manual",
      reference: "GC-BOOST-42",
      status: "pending",
      notes: "Boost renewal — 7 days",
    });

    // Admin timeline entry exists for the boost submission.
    const evt = fake.inserts["payment_review_events"]?.[0];
    expect(evt).toMatchObject({
      actor_id: "user-789",
      to_state: "awaiting_review",
    });
    expect(evt.note).toContain("GC-BOOST-42");

    // Audit log row tags the action as a boost payment so it's filterable in /admin/payments.
    const audit = fake.inserts["admin_audit_log"]?.[0];
    expect(audit).toMatchObject({
      action: "payment_submitted",
      entity_type: "payment",
      new_value: "awaiting_review",
    });
    expect(audit.metadata).toMatchObject({
      kind: "boost",
      method: "gcash_manual",
      amount_php: 149,
      reference: "GC-BOOST-42",
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

  it("produces a boost row + timeline event shaped exactly like /admin/payments reads", async () => {
    // End-to-end-style smoke: drive a boost submission, then synthesize what
    // adminListPayments + adminGetPaymentDetail would return for that payment
    // and assert every field the admin list, drawer, and CSV export read.
    const fake = makeFakeSupabase();
    const userId = "user-boost-1";
    const now = new Date().toISOString();

    await submitManualPaymentCore(
      { supabase: fake.client as any, supabaseAdmin: fake.client as any, userId },
      {
        kind: "boost",
        ref_id: "listing-boost-9",
        method: "gcash_manual",
        amount_php: 199,
        reference: "GC-BOOST-99",
        proof_path: "proofs/boost.png",
      },
    );

    const inserted = fake.inserts["payments"][0];
    const stampPatch = fake.updates["payments"].find((u) => u.patch.review_state)!.patch;
    const profile = { id: userId, full_name: "Test Buyer", business_name: null };

    // Shape returned by adminListPayments for /admin/payments rows.
    const adminRow = {
      id: "pay_1",
      user_id: inserted.user_id,
      kind: inserted.kind,
      listing_id: inserted.listing_id,
      amount_php: inserted.amount_php,
      method: inserted.method,
      reference: inserted.reference,
      notes: inserted.notes,
      proof_url: inserted.proof_url,
      proof_uploaded_at: inserted.proof_uploaded_at,
      invoice_number: "INV-0001",
      created_at: now,
      status: inserted.status,
      review_state: stampPatch.review_state,
      review_started_at: null,
      review_started_by: null,
      approved_at: null,
      rejected_at: null,
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      paid_at: null,
      profile,
      reviewer_profile: null,
      claimer_profile: null,
    };

    // Every field /admin/payments + CSV export reads.
    for (const k of [
      "id",
      "invoice_number",
      "kind",
      "method",
      "amount_php",
      "review_state",
      "status",
      "created_at",
      "reference",
      "profile",
    ] as const) {
      expect(adminRow[k]).toBeDefined();
    }
    expect(adminRow.kind).toBe("boost");
    expect(adminRow.review_state).toBe("awaiting_review");
    expect(adminRow.status).toBe("pending");
    expect(adminRow.listing_id).toBe("listing-boost-9");
    expect(adminRow.amount_php).toBe(199);
    expect(adminRow.method).toBe("gcash_manual");
    expect(adminRow.profile?.full_name).toBe("Test Buyer");
    expect(Number(adminRow.amount_php)).toBeGreaterThan(0); // CSV/payouts sum

    // Shape returned by adminGetPaymentDetail for the timeline in the drawer.
    const insertedEvt = fake.inserts["payment_review_events"][0];
    const timelineEvent = {
      id: "evt_1",
      actor_id: insertedEvt.actor_id,
      from_state: insertedEvt.from_state,
      to_state: insertedEvt.to_state,
      note: insertedEvt.note,
      created_at: now,
      actor: { id: userId, full_name: "Test Buyer", business_name: null },
    };

    expect(timelineEvent.from_state).toBeNull();
    expect(timelineEvent.to_state).toBe("awaiting_review");
    expect(timelineEvent.actor?.full_name).toBe("Test Buyer");
    expect(timelineEvent.note).toContain("gcash_manual");
    expect(typeof timelineEvent.created_at).toBe("string");

    // Audit log entry shape used to render the boost in /admin/payments audit trail.
    const audit = fake.inserts["admin_audit_log"][0];
    expect(audit).toMatchObject({
      action: "payment_submitted",
      entity_type: "payment",
      entity_id: "pay_1",
      new_value: "awaiting_review",
    });
    expect(audit.metadata).toMatchObject({
      kind: "boost",
      method: "gcash_manual",
      amount_php: 199,
      reference: "GC-BOOST-99",
      invoice_number: "INV-0001",
      proof_attached: true,
    });
  });
});

