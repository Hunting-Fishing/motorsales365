// UNAPPLIED owner-only mechanical candidate in always-closed, sequential memory
// fixtures. Owner + test.user GUC + module/manager support are synthetic, NOT
// JWT/session/original-human/native authority. No client grant makes it work.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { actor, ids, snapshot, withExpensePostingFixture } from "./expense-posting-fixture.mjs";
import {
  bindExpenseOperationRequest,
  parseExpenseOperationAcknowledgment,
} from "./expense-operation-contract.mjs";

const sql = fs
  .readFileSync(new URL("./expense-operation-candidate.sql", import.meta.url), "utf8")
  .replace(/\r\n/g, "\n");
const sqlSha = "ddea3f2c59cc8ec385c6273d700ea4a8ee2a010eeac14c3f6475cd3f7b3c1368";
assert.equal(createHash("sha256").update(sql).digest("hex"), sqlSha, "candidate SQL exact LF pin");
const operationId = "60000000-0000-4000-8000-000000000001";
const otherOperation = "60000000-0000-4000-8000-000000000002";
const otherReceipt = "50000000-0000-4000-8000-000000000002";
const intent = (overrides = {}) => ({
  version: 1,
  kind: "create",
  operationId,
  expectedAccountId: ids.manager,
  expectedShopId: ids.shop,
  expectedShopVehicleId: ids.vehicle,
  receiptId: ids.receipt,
  amount: "250.00",
  taxAmount: "0.00",
  currency: "PHP",
  expenseDate: "2026-10-01",
  vendor: "Synthetic receipt",
  paymentIntent: "cash",
  ...overrides,
});
const one = async (db, query, args = []) => (await db.query(query, args)).rows[0];
const count = (db) =>
  one(
    db,
    `SELECT
  (SELECT count(*)::int FROM shop_manager.expenses) AS expenses,
  (SELECT count(*)::int FROM shop_manager.journal_entries) AS entries,
  (SELECT count(*)::int FROM shop_manager.journal_entry_lines) AS lines,
  (SELECT count(*)::int FROM shop_manager.chart_of_accounts) AS accounts,
  (SELECT count(*)::int FROM receipt_expense_candidate.outcomes) AS outcomes`,
  );
const state = async (db) => ({
  base: await snapshot(db),
  outcomes: (
    await db.query(
      "SELECT to_jsonb(o) AS row FROM receipt_expense_candidate.outcomes o ORDER BY account_id,operation_id",
    )
  ).rows,
  candidateCatalog: (
    await db.query(`SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text,
    (SELECT jsonb_agg(jsonb_build_object('name',k.conname,'type',k.contype,'validated',k.convalidated,'definition',pg_get_constraintdef(k.oid)) ORDER BY k.conname)
      FROM pg_constraint k WHERE k.conrelid=c.oid) AS constraints,
    (SELECT jsonb_agg(pg_get_triggerdef(t.oid) ORDER BY t.tgname) FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal) AS triggers
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='receipt_expense_candidate' AND c.relkind='r' ORDER BY c.relname`)
  ).rows,
  candidateNamespace: (
    await db.query(`SELECT n.nspname,r.rolname AS owner,n.nspacl::text
    FROM pg_namespace n JOIN pg_roles r ON r.oid=n.nspowner WHERE n.nspname='receipt_expense_candidate'`)
  ).rows,
  candidateFunctions: (
    await db.query(`SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS args,
    r.rolname AS owner,p.prosecdef,p.provolatile,p.proconfig,p.proacl::text,pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner
    WHERE n.nspname='receipt_expense_candidate' ORDER BY p.proname,pg_get_function_identity_arguments(p.oid)`)
  ).rows,
  candidatePolicies: (
    await db.query(
      "SELECT * FROM pg_policies WHERE schemaname='receipt_expense_candidate' ORDER BY tablename,policyname",
    )
  ).rows,
});
async function fixture(run, options) {
  await withExpensePostingFixture(async (db) => {
    await db.exec(sql);
    await run(db);
  }, options);
}
async function rawOwner(db, payload, binding, subject = ids.manager) {
  await db.exec("BEGIN");
  try {
    // Deliberately synthetic owner invocation. NOT real user Auth attribution.
    await db.query("SELECT set_config('test.user',$1,true)", [subject ?? ""]);
    const result = await one(
      db,
      "SELECT receipt_expense_candidate.create_operation($1::jsonb,$2::text) AS ack",
      [JSON.stringify(payload), binding],
    );
    await db.exec("COMMIT");
    return result.ack;
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}
async function create(db, value = intent(), subject = ids.manager) {
  const bound = bindExpenseOperationRequest(value);
  const raw = await rawOwner(db, bound.payload, bound.binding, subject);
  return parseExpenseOperationAcknowledgment(raw, bound.payload);
}
const failure = (code) => (error) => {
  assert.equal(error.code, code);
  assert.equal(error.message, "Expense operation failed.");
  assert.ok(!error.detail && !error.hint);
  return true;
};

test("pinned private atomic publication is INVOKER, fully qualified, no client grants/legacy repost and explicit unresolved scope", () => {
  assert.equal(createHash("sha256").update(sql).digest("hex"), sqlSha);
  assert.match(sql, /BEGIN;[\s\S]*CREATE SCHEMA receipt_expense_candidate;/);
  assert.match(sql, /COMMIT;\s*$/);
  assert.equal(
    (sql.match(/SECURITY INVOKER SET search_path = pg_catalog, pg_temp/g) ?? []).length,
    4,
  );
  assert.doesNotMatch(
    sql,
    /SECURITY DEFINER|CREATE OR REPLACE|GRANT\s+(?:ALL|EXECUTE|USAGE|SELECT|INSERT)/i,
  );
  assert.doesNotMatch(
    sql,
    /PERFORM\s+shop_manager\.sm_post_journal|SELECT\s+vehicle_receipts_private\.record_expense/i,
  );
  assert.match(sql, /FORCE ROW LEVEL SECURITY/);
  assert.match(
    sql,
    /FOR UPDATE;[\s\S]*FROM shop_manager\.customers[\s\S]*FOR UPDATE;[\s\S]*FROM shop_manager\.vehicles[\s\S]*FOR UPDATE;/,
  );
  assert.match(sql, /NOT original-human\/fresh native authority/);
  assert.match(sql, /nonsuperuser schema owner/);
  assert.match(
    sql,
    /expenses e WHERE e\.id=p_expense FOR UPDATE;[\s\S]*journal_entries j[\s\S]*ORDER BY j\.id FOR UPDATE;[\s\S]*ORDER BY l\.id FOR UPDATE;[\s\S]*ORDER BY a\.id FOR UPDATE;/,
  );
  assert.match(
    sql,
    /ORDER BY a\.id FOR UPDATE;\s*v_intent := receipt_expense_candidate\.validate_intent/,
  );
  assert.match(sql, /do not prevent phantom account-code\/line inserts/);
});

test("actual candidate ACL denies ordinary anon/auth/service functions and ledger DML; owner-only is not human authority", async () => {
  await fixture(async (db) => {
    for (const role of ["anon", "authenticated", "service_role"]) {
      const acl = await one(
        db,
        `SELECT has_schema_privilege($1,'receipt_expense_candidate','USAGE') AS usage,
        has_function_privilege($1,'receipt_expense_candidate.create_operation(jsonb,text)','EXECUTE') AS execute,
        has_table_privilege($1,'receipt_expense_candidate.outcomes','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') AS table_access`,
        [role],
      );
      assert.deepEqual(acl, { usage: false, execute: false, table_access: false });
      await assert.rejects(
        actor(
          db,
          role,
          ids.manager,
          "SELECT receipt_expense_candidate.create_operation('{}'::jsonb,'x')",
        ),
        (error) => error.code === "42501",
      );
      await assert.rejects(
        actor(
          db,
          role,
          ids.manager,
          "INSERT INTO receipt_expense_candidate.outcomes DEFAULT VALUES",
        ),
        (error) => error.code === "42501",
      );
    }
    const metadata = (
      await db.query(
        `SELECT p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='receipt_expense_candidate' ORDER BY p.proname`,
      )
    ).rows;
    assert.equal(metadata.length, 4);
    assert.ok(
      metadata.every(
        (row) => !row.prosecdef && row.proconfig.includes("search_path=pg_catalog, pg_temp"),
      ),
    );
    const table = (await state(db)).candidateCatalog[0];
    assert.equal(table.relrowsecurity, true);
    assert.equal(table.relforcerowsecurity, true);
    assert.equal(table.constraints.filter((constraint) => constraint.type === "f").length, 4);
    assert.equal(
      (
        await one(
          db,
          "SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='receipt_expense_candidate'",
        )
      ).n,
      0,
    );
  });
});

for (const paymentIntent of ["cash", "accounts_payable"]) {
  test(`modeled ${paymentIntent} inserts one expense/native posting and immutable full-binding outcome, exact JS ack admitted`, async () => {
    await fixture(async (db) => {
      const value = intent({ paymentIntent });
      const bound = bindExpenseOperationRequest(value);
      const raw = await rawOwner(db, bound.payload, bound.binding);
      const ack = parseExpenseOperationAcknowledgment(raw, bound.payload);
      assert.equal(ack.expense.amount, "250.00");
      assert.equal(ack.expense.taxAmount, "0.00");
      assert.equal(ack.expense.createdBy, ids.manager);
      assert.equal(ack.journal.createdBy, null);
      assert.equal(ack.journal.lines[1].accountCode, paymentIntent === "cash" ? "1000" : "2000");
      assert.equal(ack.expense.status, paymentIntent === "cash" ? "recorded" : "unpaid");
      assert.deepEqual(await count(db), {
        expenses: 1,
        entries: 1,
        lines: 2,
        accounts: 2,
        outcomes: 1,
      });
      assert.deepEqual(
        await one(
          db,
          "SELECT sum(debit)::text AS debit,sum(credit)::text AS credit FROM shop_manager.journal_entry_lines",
        ),
        { debit: "250.00", credit: "250.00" },
      );
      const saved = await one(
        db,
        "SELECT payload,binding,acknowledgment FROM receipt_expense_candidate.outcomes",
      );
      assert.deepEqual(
        saved.payload,
        JSON.parse(JSON.stringify(bindExpenseOperationRequest(value).payload)),
      );
      assert.equal(saved.binding, ack.requestBinding);
      assert.deepEqual(saved.acknowledgment, raw); // Exact raw SQL -> ledger.
      assert.deepEqual(
        parseExpenseOperationAcknowledgment(saved.acknowledgment, bound.payload),
        ack,
      );
      assert.deepEqual([raw.journal.lines[0].credit, raw.journal.lines[1].debit], ["0", "0"]);
    });
  });
}

test("canonical SQL scalar escaping equals JS binder for null/empty/Unicode/quotes/backslash/control text", async () => {
  for (const vendor of [null, "", '🧾é e\u0301 "quoted" \\path\n\r\t\b\f\u0001']) {
    await fixture(
      async (db) => {
        const value = intent({ vendor });
        const ack = await create(db, value);
        assert.equal(ack.requestBinding, bindExpenseOperationRequest(value).binding);
        assert.equal(ack.expense.description, vendor === null ? "Vehicle parts receipt" : vendor);
      },
      { vendor },
    );
  }
});

test("exact replay rechecks persisted state and returns identical saved IDs with no writes/timestamp/repost", async () => {
  await fixture(async (db) => {
    const first = await create(db);
    const before = await state(db);
    const again = await create(db);
    assert.deepEqual(again, first);
    assert.deepEqual(await state(db), before);
  });
});

test("same operation changed full payload/null-fallback binding refuses even when native descriptions coincide", async () => {
  await fixture(
    async (db) => {
      await create(db, intent({ vendor: null }));
      await db.query(
        "UPDATE public.vehicle_receipts SET vendor='Vehicle parts receipt' WHERE id=$1",
        [ids.receipt],
      );
      const before = await state(db);
      await assert.rejects(
        create(db, intent({ vendor: "Vehicle parts receipt" })),
        failure("22023"),
      );
      assert.deepEqual(await state(db), before);
    },
    { vendor: null },
  );
});

test("new operation for a claimed receipt and existing legacy expense/journal are refused without adoption", async () => {
  await fixture(async (db) => {
    await create(db);
    const before = await state(db);
    await assert.rejects(create(db, intent({ operationId: otherOperation })), failure("55000"));
    assert.deepEqual(await state(db), before);
  });
  await fixture(async (db) => {
    await actor(
      db,
      "authenticated",
      ids.manager,
      "SELECT public.record_vehicle_receipt_expense($1)",
      [ids.receipt],
    );
    const before = await state(db);
    await assert.rejects(create(db), failure("55000"));
    assert.deepEqual(await state(db), before);
    assert.equal((await count(db)).outcomes, 0);
  });
});

test("unrelated preexisting journal is neither adopted nor rewritten", async () => {
  await fixture(async (db) => {
    const prior = await one(
      db,
      "INSERT INTO shop_manager.journal_entries(shop_id,source_type,source_id,memo) VALUES($1,'expense',$2,'Synthetic unrelated legacy') RETURNING id",
      [ids.shop, ids.absent],
    );
    const ack = await create(db);
    assert.notEqual(ack.journal.id, prior.id);
    assert.deepEqual(
      await one(db, "SELECT memo,source_id FROM shop_manager.journal_entries WHERE id=$1", [
        prior.id,
      ]),
      { memo: "Synthetic unrelated legacy", source_id: ids.absent },
    );
    assert.equal((await count(db)).entries, 2);
  });
});

test("direct SQL independently rejects malformed shapes/types/noncanonical values and full binding tampering before writes", async () => {
  await fixture(async (db) => {
    const bound = bindExpenseOperationRequest(intent());
    const before = await state(db);
    const cases = [
      null,
      [],
      { ...bound.payload, extra: true },
      { ...bound.payload, version: "1" },
      { ...bound.payload, kind: "update" },
      { ...bound.payload, amount: "250.001" },
      { ...bound.payload, amount: "0.00" },
      { ...bound.payload, amount: "NaN" },
      { ...bound.payload, amount: "99999999.01" },
      { ...bound.payload, amount: 250 },
      { ...bound.payload, taxAmount: "0.01" },
      { ...bound.payload, currency: "USD" },
      { ...bound.payload, vendor: "x".repeat(201) },
      { ...bound.payload, expenseDate: "infinity" },
      { ...bound.payload, expenseDate: "2023-02-29" },
      { ...bound.payload, paymentIntent: "paid" },
      {
        ...bound.payload,
        expectedAccountId: ids.manager.toUpperCase().replace("00000001", "BADVALUE"),
      },
    ];
    const missing = { ...bound.payload };
    delete missing.vendor;
    cases.push(missing);
    for (const payload of cases) {
      await assert.rejects(rawOwner(db, payload, bound.binding), failure("22023"));
      assert.deepEqual(await state(db), before);
    }
    for (const binding of [
      null,
      "",
      `${bound.binding}\n`,
      bound.binding.replace('"kind":"create"', '"kind":"update"'),
    ]) {
      await assert.rejects(rawOwner(db, bound.payload, binding), failure("22023"));
      assert.deepEqual(await state(db), before);
    }
  });
});

test("actor and captured shop/vehicle mismatches fail with no business/ledger effects", async () => {
  await fixture(async (db) => {
    const before = await state(db);
    for (const subject of [null, ids.stranger]) {
      await assert.rejects(create(db, intent(), subject), failure("42501"));
      assert.deepEqual(await state(db), before);
    }
    for (const overrides of [
      { expectedShopId: ids.otherShop },
      { expectedShopVehicleId: ids.absent },
      { receiptId: ids.absent },
    ]) {
      await assert.rejects(create(db, intent(overrides)), failure("42501"));
      assert.deepEqual(await state(db), before);
    }
  });
});

test("explicit synthetic NULL-helper fault cannot bypass create or replay denial", async () => {
  await fixture(async (db) => {
    // Replace only the explicitly synthetic manager support helper in memory.
    // This fault is NOT a retained/current helper implementation or authority.
    await db.exec(
      "CREATE OR REPLACE FUNCTION shop_manager.is_shop_operations_manager(_uid uuid,_shop uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT NULL::boolean $$",
    );
    const before = await state(db);
    await assert.rejects(create(db), failure("42501"));
    assert.deepEqual(await state(db), before);
  });
  await fixture(async (db) => {
    await create(db);
    // Deliberate negative body replacement, never a positive source-parity case.
    await db.exec(
      "CREATE OR REPLACE FUNCTION vehicle_receipts_private.shop_access(_id uuid,_write boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,shop_manager,pg_temp AS $$ SELECT NULL::boolean $$",
    );
    const before = await state(db);
    await assert.rejects(create(db), failure("42501"));
    assert.deepEqual(await state(db), before);
  });
});

test("actual receipt precision/date/vendor/status/currency must equal captured supported intent", async () => {
  for (const options of [
    { total: "250.001" },
    { purchasedOn: null },
    { purchasedOn: "2026-10-02" },
    { vendor: null },
    { status: "draft" },
    { currency: "USD" },
  ]) {
    await fixture(async (db) => {
      const before = await state(db);
      await assert.rejects(create(db), failure("22023"));
      assert.deepEqual(await state(db), before);
    }, options);
  }
});

test("retry refuses current expense/journal/account/receipt drift rather than returning old success", async () => {
  await fixture(async (db) => {
    const ack = await create(db);
    for (const [change, undo] of [
      [
        "UPDATE shop_manager.expenses SET amount=249.99",
        "UPDATE shop_manager.expenses SET amount=250.00",
      ],
      [
        "UPDATE shop_manager.journal_entries SET status='void'",
        "UPDATE shop_manager.journal_entries SET status='posted'",
      ],
      [
        "UPDATE shop_manager.chart_of_accounts SET name='Changed' WHERE code='1000'",
        "UPDATE shop_manager.chart_of_accounts SET name='Cash' WHERE code='1000'",
      ],
    ]) {
      await db.exec(change);
      const before = await state(db);
      await assert.rejects(create(db), failure("55000"));
      assert.deepEqual(await state(db), before);
      await db.exec(undo);
    }
    await db.query("UPDATE public.vehicle_receipts SET purchased_on='2026-10-02' WHERE id=$1", [
      ids.receipt,
    ]);
    const before = await state(db);
    await assert.rejects(create(db), failure("22023"));
    assert.deepEqual(await state(db), before);
    assert.equal(
      (await one(db, "SELECT expense_id FROM receipt_expense_candidate.outcomes")).expense_id,
      ack.expense.id,
    );
  });
});

test("ambiguous native shop/account codes are refused without adopting/replacing/deleting legacy accounts", async () => {
  await fixture(async (db) => {
    await db.query(
      "INSERT INTO shop_manager.chart_of_accounts(shop_id,code,name,account_type) VALUES($1,'6000','Operating Expenses','expense'),($1,'6000','Operating Expenses','expense')",
      [ids.shop],
    );
    const before = await state(db);
    await assert.rejects(create(db), failure("55000"));
    assert.deepEqual(await state(db), before);
    assert.deepEqual(await count(db), {
      expenses: 0,
      entries: 0,
      lines: 0,
      accounts: 2,
      outcomes: 0,
    });
  });
});

test("genuine late account FK23503 rolls expense/header/firstline/accounts back before ledger insertion", async () => {
  await fixture(async (db) => {
    await db.exec(`CREATE FUNCTION public.lab_candidate_account_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.line_order=1 THEN
        IF (SELECT count(*) FROM shop_manager.expenses)<>1 OR(SELECT count(*) FROM shop_manager.journal_entries)<>1
          OR(SELECT count(*) FROM shop_manager.journal_entry_lines)<>1 OR(SELECT count(*) FROM shop_manager.chart_of_accounts)<>2
          OR(SELECT count(*) FROM receipt_expense_candidate.outcomes)<>0 THEN RAISE EXCEPTION 'Synthetic late account precondition'; END IF;
        NEW.account_id='${ids.absent}'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER lab_candidate_account_fault BEFORE INSERT ON shop_manager.journal_entry_lines FOR EACH ROW EXECUTE FUNCTION public.lab_candidate_account_fault();`);
    const before = await state(db);
    await assert.rejects(create(db), failure("23503"));
    assert.deepEqual(await state(db), before);
    assert.deepEqual(await count(db), {
      expenses: 0,
      entries: 0,
      lines: 0,
      accounts: 0,
      outcomes: 0,
    });
  });
});

test("genuine late outcome journal FK23503 rolls back completed native posting and outcome, real FKs intact", async () => {
  await fixture(async (db) => {
    await db.exec(`CREATE FUNCTION public.lab_candidate_ledger_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF (SELECT count(*) FROM shop_manager.expenses)<>1 OR(SELECT count(*) FROM shop_manager.journal_entries)<>1
        OR(SELECT count(*) FROM shop_manager.journal_entry_lines)<>2 OR(SELECT count(*) FROM shop_manager.chart_of_accounts)<>2
        THEN RAISE EXCEPTION 'Synthetic late outcome precondition'; END IF;
      NEW.journal_entry_id='${ids.absent}'; RETURN NEW; END $$;
      CREATE TRIGGER lab_candidate_ledger_fault BEFORE INSERT ON receipt_expense_candidate.outcomes FOR EACH ROW EXECUTE FUNCTION public.lab_candidate_ledger_fault();`);
    const before = await state(db);
    await assert.rejects(create(db), failure("23503"));
    assert.deepEqual(await state(db), before);
    assert.deepEqual(await count(db), {
      expenses: 0,
      entries: 0,
      lines: 0,
      accounts: 0,
      outcomes: 0,
    });
    assert.equal(
      (await state(db)).candidateCatalog[0].constraints.filter(
        (constraint) => constraint.type === "f",
      ).length,
      4,
    );
  });
});

test("synthetic late same-key/different-receipt unique race reaches23505 and rolls both new side effects back", async () => {
  await fixture(async (db) => {
    await db.query(
      "INSERT INTO public.vehicle_receipts(id,shop_vehicle_id,created_by,vendor,purchased_on,currency,total,status) VALUES($1,$2,$3,'Legacy other','2026-10-01','PHP',10,'confirmed')",
      [otherReceipt, ids.vehicle, ids.manager],
    );
    const legacy = (
      await actor(
        db,
        "authenticated",
        ids.manager,
        "SELECT public.record_vehicle_receipt_expense($1) AS id",
        [otherReceipt],
      )
    ).rows[0].id;
    const legacyJournal = (
      await one(db, "SELECT id FROM shop_manager.journal_entries WHERE source_id=$1", [legacy])
    ).id;
    // Explicit synthetic owner INSERT can fabricate an outcome. This is a
    // boundary/race injection, not trusted provenance or independent sessions.
    await db.exec(`CREATE FUNCTION public.lab_candidate_unique_race() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.receipt_id='${ids.receipt}' THEN
        IF(SELECT count(*) FROM shop_manager.expenses)<>2 OR(SELECT count(*) FROM shop_manager.journal_entries)<>2
          OR(SELECT count(*) FROM shop_manager.journal_entry_lines)<>4 THEN RAISE EXCEPTION 'Synthetic unique race precondition'; END IF;
        INSERT INTO receipt_expense_candidate.outcomes(account_id,operation_id,receipt_id,expense_id,journal_entry_id,payload,binding,acknowledgment)
        VALUES(NEW.account_id,NEW.operation_id,'${otherReceipt}','${legacy}','${legacyJournal}',NEW.payload,NEW.binding,NEW.acknowledgment);
      END IF; RETURN NEW; END $$;
      CREATE TRIGGER lab_candidate_unique_race BEFORE INSERT ON receipt_expense_candidate.outcomes FOR EACH ROW EXECUTE FUNCTION public.lab_candidate_unique_race();`);
    const before = await state(db);
    await assert.rejects(create(db), failure("23505"));
    assert.deepEqual(await state(db), before);
    assert.deepEqual(await count(db), {
      expenses: 1,
      entries: 1,
      lines: 2,
      accounts: 2,
      outcomes: 0,
    });
  });
});

test("owner UPDATE/DELETE/TRUNCATE are refused, including no-op; privileged DDL remains a documented bypass", async () => {
  await fixture(async (db) => {
    await create(db);
    const before = await state(db);
    for (const statement of [
      "UPDATE receipt_expense_candidate.outcomes SET binding=binding",
      "DELETE FROM receipt_expense_candidate.outcomes",
      "TRUNCATE receipt_expense_candidate.outcomes",
    ]) {
      await assert.rejects(
        db.exec(statement),
        (error) =>
          error.code === "42501" && error.message === "Expense outcome mutation is unavailable.",
      );
      assert.deepEqual(await state(db), before);
    }
    // This explicit negative demonstrates the limit; no production tamper-proof
    // claim and no ordinary-role grant. Real DB owner can change table DDL.
    await db.exec(
      "ALTER TABLE receipt_expense_candidate.outcomes DISABLE TRIGGER outcome_no_update_delete",
    );
    await db.exec("UPDATE receipt_expense_candidate.outcomes SET binding='Synthetic DBA bypass'");
    await db.exec(
      "ALTER TABLE receipt_expense_candidate.outcomes ENABLE TRIGGER outcome_no_update_delete",
    );
    const drift = await state(db);
    await assert.rejects(create(db), failure("22023"));
    assert.deepEqual(await state(db), drift);
  });
});

test("existing schema collision and unexpected default function grantee fail publication atomically", async () => {
  await withExpensePostingFixture(async (db) => {
    await db.exec("CREATE SCHEMA receipt_expense_candidate");
    await assert.rejects(db.exec(sql), (error) => error.code === "42P06");
    await db.exec("ROLLBACK");
    assert.equal(
      (
        await one(
          db,
          "SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='receipt_expense_candidate'",
        )
      ).n,
      0,
    );
  });
  await withExpensePostingFixture(async (db) => {
    await db.exec(
      "CREATE ROLE lab_default_grantee; ALTER DEFAULT PRIVILEGES GRANT EXECUTE ON FUNCTIONS TO lab_default_grantee",
    );
    await assert.rejects(
      db.exec(sql),
      (error) =>
        error.code === "55000" && error.message === "Expense candidate publication failed.",
    );
    await db.exec("ROLLBACK");
    assert.equal(
      (await one(db, "SELECT to_regnamespace('receipt_expense_candidate')::text AS name")).name,
      null,
    );
  });
});
