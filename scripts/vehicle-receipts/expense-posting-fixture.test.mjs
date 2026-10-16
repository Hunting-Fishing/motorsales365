// Docker-free, always-closed memory-only retained SQL characterization. No
// production/Auth/API/Storage/authority/financial-policy acceptance is asserted.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  actor,
  ids,
  limitations,
  pins,
  selectedSources,
  snapshot,
  withExpensePostingFixture,
} from "./expense-posting-fixture.mjs";

const recordSql = "SELECT public.record_vehicle_receipt_expense($1::uuid) AS id";
const record = async (db, subject = ids.manager) =>
  (await actor(db, "authenticated", subject, recordSql, [ids.receipt])).rows[0].id;
const queryOne = async (db, sql, args = []) => (await db.query(sql, args)).rows[0];
const counts = (db) =>
  queryOne(
    db,
    `SELECT
  (SELECT count(*)::int FROM shop_manager.expenses) AS expenses,
  (SELECT count(*)::int FROM shop_manager.journal_entries) AS entries,
  (SELECT count(*)::int FROM shop_manager.journal_entry_lines) AS lines,
  (SELECT count(*)::int FROM shop_manager.chart_of_accounts) AS accounts`,
  );
const expense = (db) =>
  queryOne(
    db,
    `SELECT id,shop_id,vehicle_id,vehicle_receipt_id,
  amount::text,tax_amount::text,expense_date::text,description,status,created_by,receipt_url,
  updated_at::text FROM shop_manager.expenses ORDER BY id LIMIT 1`,
  );
const journalLines = async (db) =>
  (
    await db.query(`SELECT l.account_code,a.name,a.account_type,
  l.debit::text,l.credit::text,l.line_order FROM shop_manager.journal_entry_lines l
  JOIN shop_manager.chart_of_accounts a ON a.id=l.account_id ORDER BY l.line_order,l.id`)
  ).rows;
const sqlState = (code, message) => (error) => {
  assert.equal(error.code, code);
  if (message) assert.match(error.message, message);
  return true;
};

test("seven immutable LF sources and 22 complete unchanged selections; no historical replay or fabricated expense URL guard", () => {
  assert.equal(new Set(pins.map((pin) => pin.path)).size, 7);
  assert.equal(pins.length, 22);
  assert.equal(new Set(pins.map((pin) => pin.name)).size, 22);
  for (const section of selectedSources) {
    assert.equal(createHash("sha256").update(section.sql).digest("hex"), section.sha256);
    assert.ok(section.sql.trim().endsWith(";"));
  }
  const get = (name) => selectedSources.find((section) => section.name === name).sql;
  assert.match(get("expenseTables"), /amount NUMERIC\(14,2\) NOT NULL DEFAULT 0/);
  assert.match(get("glTables"), /account_id UUID REFERENCES shop_manager\.chart_of_accounts\(id\)/);
  assert.match(get("glTables"), /debit NUMERIC NOT NULL DEFAULT 0/);
  assert.match(
    get("expenseLinksRecord"),
    /ON CONFLICT\(vehicle_receipt_id\) DO UPDATE SET vehicle_receipt_id=EXCLUDED\.vehicle_receipt_id/,
  );
  assert.match(
    get("expenseGuard"),
    /BEFORE INSERT OR UPDATE OF vehicle_id,vehicle_receipt_id,shop_id/,
  );
  assert.match(get("expensePostTrigger"), /AFTER INSERT ON shop_manager\.expenses/);
  assert.match(get("journalSource"), /\(source_type, source_id\)/);
  assert.match(get("latestTouch"), /SET search_path = public/);
  const executed = selectedSources.map((section) => section.sql).join("\n");
  assert.doesNotMatch(
    executed,
    /sm_fill_shop_id|guard_service_receipt|sm_seed_chart_of_accounts|CREATE TABLE storage\./,
  );
  assert.ok(limitations.some((limit) => limit.includes("NOT expenses")));
  assert.ok(limitations.some((limit) => limit.includes("not authority proof")));
});

test("actual expense/GL constraints, retained RLS and exactly the selected attachments remain installed", async () => {
  await withExpensePostingFixture(async (db) => {
    const state = await snapshot(db);
    const native = state.catalog.tables.filter((table) =>
      [
        "expenses",
        "expense_categories",
        "chart_of_accounts",
        "journal_entries",
        "journal_entry_lines",
      ].includes(table.relname),
    );
    assert.equal(native.length, 5);
    assert.ok(native.every((table) => table.relrowsecurity && !table.relforcerowsecurity));
    assert.deepEqual(
      state.catalog.triggers.map(({ relname, tgname }) => [relname, tgname]),
      [
        ["expense_categories", "trg_expense_categories_updated"],
        ["expenses", "expense_vehicle_scope"],
        ["expenses", "sm_trg_expense_post_ins"],
        ["expenses", "trg_expenses_updated"],
      ],
    );
    const columns = state.catalog.columns.filter((column) => column.relname === "expenses");
    assert.equal(columns.length, 18);
    assert.equal(columns.find((column) => column.attname === "amount").type, "numeric(14,2)");
    assert.equal(columns.find((column) => column.attname === "tax_amount").type, "numeric(14,2)");
    assert.equal(columns.find((column) => column.attname === "status").attnotnull, true);
    assert.ok(
      state.catalog.constraints.some(
        (constraint) =>
          constraint.relname === "journal_entry_lines" &&
          constraint.contype === "f" &&
          /FOREIGN KEY \(account_id\)/.test(constraint.definition),
      ),
    );
    assert.ok(
      state.catalog.constraints.some(
        (constraint) =>
          constraint.relname === "expenses" &&
          constraint.contype === "u" &&
          /vehicle_receipt_id/.test(constraint.definition),
      ),
    );
    assert.ok(
      !state.catalog.constraints.some(
        (constraint) => constraint.relname === "expenses" && constraint.contype === "c",
      ),
    );
    assert.deepEqual(await counts(db), { expenses: 0, entries: 0, lines: 0, accounts: 0 });
    const touch = state.catalog.functions.find((fn) => fn.proname === "touch_updated_at");
    assert.deepEqual(touch.proconfig, ["search_path=public"]);
    assert.equal(touch.prosecdef, false);
    const role = await queryOne(
      db,
      "SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname='authenticated'",
    );
    assert.deepEqual(role, { rolsuper: false, rolbypassrls: false });
  });
});

test("retained RPC creates fixed-scale expense and default Cash journal; SQL sums match the persisted expense", async () => {
  await withExpensePostingFixture(async (db) => {
    const result = await record(db);
    const row = await expense(db);
    assert.equal(result, row.id);
    assert.deepEqual(
      {
        shop: row.shop_id,
        vehicle: row.vehicle_id,
        receipt: row.vehicle_receipt_id,
        amount: row.amount,
        tax: row.tax_amount,
        date: row.expense_date,
        status: row.status,
        creator: row.created_by,
      },
      {
        shop: ids.shop,
        vehicle: ids.vehicle,
        receipt: ids.receipt,
        amount: "250.00",
        tax: "0.00",
        date: "2026-10-01",
        status: "recorded",
        creator: ids.manager,
      },
    );
    assert.deepEqual(await journalLines(db), [
      {
        account_code: "6000",
        name: "Operating Expenses",
        account_type: "expense",
        debit: "250.00",
        credit: "0",
        line_order: 0,
      },
      {
        account_code: "1000",
        name: "Cash",
        account_type: "asset",
        debit: "0",
        credit: "250.00",
        line_order: 1,
      },
    ]);
    const entry = await queryOne(
      db,
      "SELECT source_type,source_id,status,created_by FROM shop_manager.journal_entries",
    );
    assert.deepEqual(entry, {
      source_type: "expense",
      source_id: result,
      status: "posted",
      created_by: null,
    });
    assert.deepEqual(
      await queryOne(
        db,
        `SELECT sum(l.debit)::text AS debit,sum(l.credit)::text AS credit,
      sum(l.debit)=max(e.amount+e.tax_amount) AS matches FROM shop_manager.journal_entry_lines l
      JOIN shop_manager.journal_entries j ON j.id=l.journal_entry_id JOIN shop_manager.expenses e ON e.id=j.source_id`,
      ),
      { debit: "250.00", credit: "250.00", matches: true },
    );
    assert.deepEqual(await counts(db), { expenses: 1, entries: 1, lines: 2, accounts: 2 });
  });
});

test("unscaled fractional receipt cents are coerced by native NUMERIC(14,2), not silently equated with receipt total", async () => {
  await withExpensePostingFixture(
    async (db) => {
      await record(db);
      assert.deepEqual(
        await queryOne(
          db,
          `SELECT r.total::text AS receipt,e.amount::text AS expense,
      r.total=e.amount AS same FROM public.vehicle_receipts r JOIN shop_manager.expenses e ON e.vehicle_receipt_id=r.id`,
        ),
        { receipt: "12.345", expense: "12.35", same: false },
      );
      assert.deepEqual(
        await queryOne(
          db,
          "SELECT sum(debit)::text AS debit,sum(credit)::text AS credit FROM shop_manager.journal_entry_lines",
        ),
        { debit: "12.35", credit: "12.35" },
      );
    },
    { total: "12.345" },
  );
});

test("repeat returns same UUID and touches timestamp without reposting or reconciling changed financial fields", async () => {
  await withExpensePostingFixture(async (db) => {
    // Prior mismatching expense is explicit fixture data inserted through all
    // actual selected native guards/posting; no trigger/constraint is disabled.
    const first = (
      await actor(
        db,
        "authenticated",
        ids.manager,
        `INSERT INTO shop_manager.expenses
      (shop_id,vehicle_id,vehicle_receipt_id,amount,tax_amount,expense_date,description,created_by,updated_at)
      VALUES($1,$2,$3,17.89,2.01,'2001-02-03','Synthetic prior mismatch',$4,'2000-01-01') RETURNING id`,
        [ids.shop, ids.vehicle, ids.receipt, ids.stranger],
      )
    ).rows[0].id;
    const linesBefore = await journalLines(db);
    assert.deepEqual(
      await queryOne(
        db,
        "SELECT sum(debit)::text AS debit,sum(credit)::text AS credit FROM shop_manager.journal_entry_lines",
      ),
      { debit: "19.90", credit: "19.90" },
    );
    assert.equal(await record(db), first);
    const row = await expense(db);
    assert.deepEqual(
      {
        amount: row.amount,
        tax: row.tax_amount,
        date: row.expense_date,
        description: row.description,
        creator: row.created_by,
      },
      {
        amount: "17.89",
        tax: "2.01",
        date: "2001-02-03",
        description: "Synthetic prior mismatch",
        creator: ids.stranger,
      },
    );
    assert.notEqual(row.updated_at, "2000-01-01 00:00:00+00");
    assert.equal(
      await queryOne(
        db,
        "SELECT updated_at>'2000-01-01'::timestamptz AS touched FROM shop_manager.expenses",
      ).then((value) => value.touched),
      true,
    );
    assert.equal(await record(db), first);
    assert.deepEqual(await journalLines(db), linesBefore);
    assert.deepEqual(await counts(db), { expenses: 1, entries: 1, lines: 2, accounts: 2 });
  });
});

test("conflict no-op still fires actual UPDATE OF binding guard after privileged synthetic scope drift", async () => {
  await withExpensePostingFixture(async (db) => {
    await record(db);
    await db.query("UPDATE shop_manager.customers SET shop_id=$1 WHERE id=$2", [
      ids.otherShop,
      ids.customer,
    ]);
    await db.query("UPDATE shop_manager.profiles SET shop_id=$1 WHERE id=$2", [
      ids.otherShop,
      ids.manager,
    ]);
    const before = await snapshot(db);
    await assert.rejects(record(db), sqlState("P0001", /Expense vehicle must belong to this shop/));
    assert.deepEqual(await snapshot(db), before);
    assert.deepEqual(await counts(db), { expenses: 1, entries: 1, lines: 2, accounts: 2 });
  });
});

test("retained exact unpaid status chooses AP; default/other statuses choose Cash and include tax", async () => {
  await withExpensePostingFixture(async (db) => {
    await actor(
      db,
      "authenticated",
      ids.manager,
      `INSERT INTO shop_manager.expenses(shop_id,amount,tax_amount,expense_date,status)
      VALUES($1,10,1.25,'2026-10-01','unpaid'),($1,20,2.50,'2026-10-01','PAID')`,
      [ids.shop],
    );
    const rows = (
      await db.query(`SELECT e.status,l.account_code,l.debit::text,l.credit::text FROM shop_manager.expenses e
      JOIN shop_manager.journal_entries j ON j.source_id=e.id JOIN shop_manager.journal_entry_lines l ON l.journal_entry_id=j.id
      ORDER BY e.status,l.line_order`)
    ).rows;
    assert.deepEqual(rows, [
      { status: "PAID", account_code: "6000", debit: "22.50", credit: "0" },
      { status: "PAID", account_code: "1000", debit: "0", credit: "22.50" },
      { status: "unpaid", account_code: "6000", debit: "11.25", credit: "0" },
      { status: "unpaid", account_code: "2000", debit: "0", credit: "11.25" },
    ]);
  });
});

test("zero receipt returns a real expense UUID but source posting deliberately creates no journal", async () => {
  await withExpensePostingFixture(
    async (db) => {
      assert.equal(await record(db), (await expense(db)).id);
      assert.equal((await expense(db)).amount, "0.00");
      assert.deepEqual(await counts(db), { expenses: 1, entries: 0, lines: 0, accounts: 0 });
    },
    { total: "0" },
  );
});

test("source-key existing journal short-circuits without validating changed shop or amount; not a request ledger", async () => {
  await withExpensePostingFixture(async (db) => {
    const expenseId = await record(db);
    const before = await snapshot(db);
    const prior = await queryOne(db, "SELECT id FROM shop_manager.journal_entries");
    const result = await queryOne(
      db,
      `SELECT shop_manager.sm_post_journal($1,'1999-01-01','changed','changed','expense',$2,
      '[{"code":"X","debit":999,"credit":0}]'::jsonb) AS id`,
      [ids.otherShop, expenseId],
    );
    assert.equal(result.id, prior.id);
    assert.deepEqual(await snapshot(db), before);
  });
});

test("native expense NaN is admitted and source journal contains NaN; receipt CHECK separately rejects NaN", async () => {
  await withExpensePostingFixture(async (db) => {
    const before = await snapshot(db);
    await assert.rejects(
      db.query("UPDATE public.vehicle_receipts SET total='NaN'::numeric WHERE id=$1", [
        ids.receipt,
      ]),
      sqlState("23514"),
    );
    assert.deepEqual(await snapshot(db), before);
    await actor(
      db,
      "authenticated",
      ids.manager,
      "INSERT INTO shop_manager.expenses(shop_id,amount) VALUES($1,'NaN'::numeric)",
      [ids.shop],
    );
    assert.equal((await expense(db)).amount, "NaN");
    assert.deepEqual(
      await queryOne(
        db,
        "SELECT sum(debit)::text AS debit,sum(credit)::text AS credit FROM shop_manager.journal_entry_lines",
      ),
      { debit: "NaN", credit: "NaN" },
    );
    assert.deepEqual(await counts(db), { expenses: 1, entries: 1, lines: 2, accounts: 2 });
  });
});

test("missing purchase date reaches genuine NOT NULL failure and atomically leaves no expense/journal", async () => {
  await withExpensePostingFixture(
    async (db) => {
      const before = await snapshot(db);
      await assert.rejects(record(db), sqlState("23502"));
      assert.deepEqual(await snapshot(db), before);
      assert.deepEqual(await counts(db), { expenses: 0, entries: 0, lines: 0, accounts: 0 });
    },
    { purchasedOn: null },
  );
});

test("synthetic second-line corruption reaches REAL account FK23503 after expense/header/firstline; whole statement rolls back", async () => {
  await withExpensePostingFixture(async (db) => {
    // Synthetic fault injection ONLY. It does not remove/replace any real native
    // constraint or posting function. Assertions prove the late boundary was
    // reached; the actual account_id FK produces the observed SQLSTATE23503.
    await db.exec(`CREATE FUNCTION public.lab_second_line_missing_account() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.line_order=1 THEN
        IF (SELECT count(*) FROM shop_manager.expenses)<>1
          OR (SELECT count(*) FROM shop_manager.journal_entries)<>1
          OR (SELECT count(*) FROM shop_manager.journal_entry_lines)<>1
          OR (SELECT count(*) FROM shop_manager.chart_of_accounts)<>2
        THEN RAISE EXCEPTION 'Synthetic late-boundary precondition failed'; END IF;
        NEW.account_id='${ids.absent}'::uuid;
      END IF; RETURN NEW; END $$;
      CREATE TRIGGER lab_second_line_missing_account BEFORE INSERT ON shop_manager.journal_entry_lines
      FOR EACH ROW EXECUTE FUNCTION public.lab_second_line_missing_account();`);
    const before = await snapshot(db);
    await assert.rejects(record(db), sqlState("23503", /journal_entry_lines_account_id_fkey/));
    assert.deepEqual(await snapshot(db), before);
    assert.deepEqual(await counts(db), { expenses: 0, entries: 0, lines: 0, accounts: 0 });
    assert.equal(
      await queryOne(
        db,
        "SELECT count(*)::int AS n FROM pg_constraint WHERE conrelid='shop_manager.journal_entry_lines'::regclass AND contype='f'",
      ).then((value) => value.n),
      2,
    );
  });
});
