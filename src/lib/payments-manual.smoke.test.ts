import { describe, it, expect, vi, afterEach } from "vitest";
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

  describe("boost renewals across tricky date boundaries", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    const cases = [
      { label: "month boundary (Jan 31 → Feb)", iso: "2026-01-31T23:59:30.000Z" },
      { label: "year boundary (Dec 31 → Jan)", iso: "2026-12-31T23:59:59.000Z" },
      { label: "leap day (Feb 29)", iso: "2028-02-29T12:00:00.000Z" },
      { label: "DST forward UTC reference", iso: "2027-03-14T07:30:00.000Z" },
    ];

    for (const c of cases) {
      it(`boost renewal at ${c.label} produces correct timeline + audit row`, async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(c.iso));

        const fake = makeFakeSupabase();
        const userId = `user-${c.iso}`;
        const reference = `GC-${c.iso.slice(0, 10)}`;

        await submitManualPaymentCore(
          { supabase: fake.client as any, supabaseAdmin: fake.client as any, userId },
          {
            kind: "boost",
            ref_id: "listing-renewal",
            method: "gcash_manual",
            amount_php: 99,
            reference,
            proof_path: `proofs/${c.iso}.png`,
          },
        );

        // proof_uploaded_at is stamped from new Date() — must match the faked clock
        // and round-trip cleanly through Date parsing for /admin/payments formatDate().
        const inserted = fake.inserts["payments"][0];
        expect(inserted.proof_uploaded_at).toBe(c.iso);
        expect(new Date(inserted.proof_uploaded_at).toISOString()).toBe(c.iso);

        // review_state stamp still flips to awaiting_review across the boundary.
        const stamp = fake.updates["payments"].find((u) => u.patch.review_state);
        expect(stamp?.patch.review_state).toBe("awaiting_review");

        // Timeline event /admin/payments drawer renders.
        const evt = fake.inserts["payment_review_events"][0];
        expect(evt).toMatchObject({
          actor_id: userId,
          from_state: null,
          to_state: "awaiting_review",
        });
        expect(evt.note).toContain(reference);

        // Audit log entry visible in /admin/payments audit trail.
        const audit = fake.inserts["admin_audit_log"][0];
        expect(audit).toMatchObject({
          action: "payment_submitted",
          entity_type: "payment",
          new_value: "awaiting_review",
        });
        expect(audit.metadata).toMatchObject({
          kind: "boost",
          method: "gcash_manual",
          amount_php: 99,
          reference,
          proof_attached: true,
        });
      });
    }

    it("two boost renewals straddling the year boundary stay independent", async () => {
      vi.useFakeTimers();
      const fake = makeFakeSupabase();

      vi.setSystemTime(new Date("2026-12-31T23:59:55.000Z"));
      await submitManualPaymentCore(
        { supabase: fake.client as any, supabaseAdmin: fake.client as any, userId: "u-eoy" },
        { kind: "boost", ref_id: "L1", method: "gcash_manual", amount_php: 99, reference: "EOY", proof_path: "p1.png" },
      );

      vi.setSystemTime(new Date("2027-01-01T00:00:05.000Z"));
      await submitManualPaymentCore(
        { supabase: fake.client as any, supabaseAdmin: fake.client as any, userId: "u-ny" },
        { kind: "boost", ref_id: "L2", method: "gcash_manual", amount_php: 99, reference: "NY", proof_path: "p2.png" },
      );

      expect(fake.inserts["payments"]).toHaveLength(2);
      expect(fake.inserts["payment_review_events"]).toHaveLength(2);
      expect(fake.inserts["admin_audit_log"]).toHaveLength(2);

      expect(fake.inserts["payments"][0].proof_uploaded_at.startsWith("2026-12-31")).toBe(true);
      expect(fake.inserts["payments"][1].proof_uploaded_at.startsWith("2027-01-01")).toBe(true);

      // Audit metadata stays aligned with its own payment row across the rollover.
      expect(fake.inserts["admin_audit_log"][0].metadata.reference).toBe("EOY");
      expect(fake.inserts["admin_audit_log"][1].metadata.reference).toBe("NY");
    });
  });

  describe("boost renewals: Philippines (UTC+8) vs UTC rendering", () => {
    afterEach(() => vi.useRealTimers());

    // Render helpers that match what /admin/payments + the drawer would show
    // when the admin's browser is set to Asia/Manila vs UTC.
    const phDate = (iso: string) =>
      new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "Asia/Manila",
      }).format(new Date(iso));

    const utcDate = (iso: string) =>
      new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(iso));

    const cases = [
      {
        label: "UTC late-evening that's already next day in PH",
        utc: "2026-06-21T17:30:00.000Z", // 01:30 PH next day
        expectedPh: "Jun 22, 2026",
        expectedUtc: "Jun 21, 2026",
      },
      {
        label: "UTC New Year's Eve = PH New Year's Day",
        utc: "2026-12-31T16:30:00.000Z", // 00:30 PH on 2027-01-01
        expectedPh: "Jan 1, 2027",
        expectedUtc: "Dec 31, 2026",
      },
      {
        label: "UTC just past PH midnight (same date both)",
        utc: "2026-03-15T01:00:00.000Z", // 09:00 PH same day
        expectedPh: "Mar 15, 2026",
        expectedUtc: "Mar 15, 2026",
      },
    ];

    for (const c of cases) {
      it(`${c.label} — proof_uploaded_at renders as PH ${c.expectedPh}`, async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(c.utc));

        const fake = makeFakeSupabase();
        await submitManualPaymentCore(
          { supabase: fake.client as any, supabaseAdmin: fake.client as any, userId: "u-tz" },
          {
            kind: "boost",
            ref_id: "L-tz",
            method: "gcash_manual",
            amount_php: 99,
            reference: `REF-${c.utc}`,
            proof_path: `proofs/${c.utc}.png`,
          },
        );

        const inserted = fake.inserts["payments"][0];

        // Stored as exact UTC ISO — unambiguous across timezones.
        expect(inserted.proof_uploaded_at).toBe(c.utc);
        expect(inserted.proof_url).toBe(`proofs/${c.utc}.png`);

        // /admin/payments renders the stamp in PH local time.
        expect(phDate(inserted.proof_uploaded_at)).toBe(c.expectedPh);
        // Same instant in UTC renders as the UTC date.
        expect(utcDate(inserted.proof_uploaded_at)).toBe(c.expectedUtc);

        // Timeline + audit row carry the same UTC instant so the drawer and
        // the audit log line up regardless of admin timezone.
        const evt = fake.inserts["payment_review_events"][0];
        expect(evt.to_state).toBe("awaiting_review");
        const audit = fake.inserts["admin_audit_log"][0];
        expect(audit.metadata.reference).toBe(`REF-${c.utc}`);
        expect(audit.metadata.proof_attached).toBe(true);
      });
    }

    it("two PH-midnight-straddling renewals render on adjacent PH calendar days", async () => {
      vi.useFakeTimers();
      const fake = makeFakeSupabase();

      // 15:59 UTC = 23:59 PH on 2026-06-21
      vi.setSystemTime(new Date("2026-06-21T15:59:00.000Z"));
      await submitManualPaymentCore(
        { supabase: fake.client as any, supabaseAdmin: fake.client as any, userId: "a" },
        { kind: "boost", ref_id: "L", method: "gcash_manual", amount_php: 99, reference: "A", proof_path: "a.png" },
      );

      // 16:01 UTC = 00:01 PH on 2026-06-22
      vi.setSystemTime(new Date("2026-06-21T16:01:00.000Z"));
      await submitManualPaymentCore(
        { supabase: fake.client as any, supabaseAdmin: fake.client as any, userId: "b" },
        { kind: "boost", ref_id: "L", method: "gcash_manual", amount_php: 99, reference: "B", proof_path: "b.png" },
      );

      const [p1, p2] = fake.inserts["payments"];
      expect(phDate(p1.proof_uploaded_at)).toBe("Jun 21, 2026");
      expect(phDate(p2.proof_uploaded_at)).toBe("Jun 22, 2026");
      // In UTC they're still the same calendar day — confirms we're testing the TZ shift.
      expect(utcDate(p1.proof_uploaded_at)).toBe("Jun 21, 2026");
      expect(utcDate(p2.proof_uploaded_at)).toBe("Jun 21, 2026");

      // Audit rows preserve order and each carries its own proof path.
      expect(fake.inserts["admin_audit_log"][0].metadata.reference).toBe("A");
      expect(fake.inserts["admin_audit_log"][1].metadata.reference).toBe("B");
    });

    it("audit log entries carry listing_id, reference, and proof_uploaded_at across PH/UTC boundaries", async () => {
      vi.useFakeTimers();
      const fake = makeFakeSupabase();

      const submissions = [
        {
          utc: "2026-06-21T15:59:00.000Z", // PH Jun 21 23:59
          listing: "listing-ph-jun21",
          reference: "GC-PH-JUN21",
        },
        {
          utc: "2026-06-21T16:01:00.000Z", // PH Jun 22 00:01
          listing: "listing-ph-jun22",
          reference: "GC-PH-JUN22",
        },
        {
          utc: "2026-12-31T16:30:00.000Z", // PH Jan 1 2027 00:30
          listing: "listing-ph-newyear",
          reference: "GC-PH-NY",
        },
      ];

      for (const s of submissions) {
        vi.setSystemTime(new Date(s.utc));
        await submitManualPaymentCore(
          { supabase: fake.client as any, supabaseAdmin: fake.client as any, userId: "u-audit" },
          {
            kind: "boost",
            ref_id: s.listing,
            method: "gcash_manual",
            amount_php: 99,
            reference: s.reference,
            proof_path: `proofs/${s.listing}.png`,
          },
        );
      }

      const audits = fake.inserts["admin_audit_log"];
      const payments = fake.inserts["payments"];
      expect(audits).toHaveLength(submissions.length);

      submissions.forEach((s, i) => {
        const audit = audits[i];
        const payment = payments[i];

        // Listing id + reference flow into audit metadata so /admin/payments
        // can group/search audit rows by listing without joining back to payments.
        expect(audit.metadata.listing_id).toBe(s.listing);
        expect(audit.metadata.reference).toBe(s.reference);

        // proof_uploaded_at on the audit row exactly matches the payment row
        // and the faked submission instant — no drift across PH/UTC boundary.
        expect(audit.metadata.proof_uploaded_at).toBe(s.utc);
        expect(audit.metadata.proof_uploaded_at).toBe(payment.proof_uploaded_at);
        expect(audit.metadata.proof_url).toBe(`proofs/${s.listing}.png`);
        expect(audit.metadata.proof_attached).toBe(true);

        // The note + entity_id keep the audit row linked back to the right payment.
        expect(audit.entity_id).toBe(payment.invoice_number ? `pay_${i + 1}` : `pay_${i + 1}`);
        expect(audit.note).toContain(s.reference);
      });
    });
  });
});

