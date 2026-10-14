import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

// Offline authorization/ACL proof only, not a migration or containment approval.
// No URL, dataDir, credentials, environment input, or live database connection.
const migration = new URL(
  "../../supabase/migrations/20260715012303_a5daad1f-ca4a-4606-b07d-3f38ec8c7ee9.sql",
  import.meta.url,
);
const source = fs.readFileSync(migration, "utf8");
const functions = [
  {
    name: "calculate_work_order_totals",
    sha256: "aa2bea4e7de7e7333ad614fa6a90b1ba9e8ea67b1ba69ecf15d48c1f7cccc773",
  },
  {
    name: "convert_work_order_to_invoice",
    sha256: "1f2c322b8cbeec8c2e02435e46246833183d0ae163ea30dec54956f78a5a4065",
  },
];
const normalize = (sql) => sql.replace(/\r\n/g, "\n");
const hash = (sql) => createHash("sha256").update(normalize(sql)).digest("hex");

function extractHistoricalFunctions(sql) {
  assert.ok(typeof sql === "string" && sql.length > 0 && sql.length <= 256 * 1024);
  return functions.map(({ name, sha256 }) => {
    const declaration = `CREATE OR REPLACE FUNCTION shop_manager.${name}(`;
    const grant = `GRANT EXECUTE ON FUNCTION shop_manager.${name}(uuid) TO authenticated;`;
    assert.equal(sql.split(declaration).length, 2, `Expected one ${name} definition`);
    const start = sql.indexOf(declaration);
    const end = sql.indexOf(grant, start);
    assert.ok(end > start, `Missing ${name} historical grant`);
    const unchanged = sql.slice(start, end + grant.length);
    assert.equal(hash(unchanged), sha256, `Historical ${name} source changed`);
    return { name, signature: `shop_manager.${name}(uuid)`, sql: unchanged };
  });
}

const historical = extractHistoricalFunctions(source);
const signatures = historical.map(({ signature }) => signature).join(", ");
const userA = "00000000-0000-4000-8000-000000000001";
const userB = "00000000-0000-4000-8000-000000000002";
const linkedOrder = "30000000-0000-4000-8000-000000000001";
const openOrder = "30000000-0000-4000-8000-000000000002";
const invoiceId = "INV-SYNTHETIC-PRIVATE";
const clients = [
  { role: "anon", user: null },
  { role: "authenticated", user: userB },
];

// Minimal synthetic relations for these exact functions, not application schema
// replay. In particular there are no sales-posting, stock, or invoice triggers.
const fixtureSql = `
CREATE ROLE anon NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE ROLE authenticated NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA auth;
CREATE SCHEMA shop_manager;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE shop_manager.shops(id uuid PRIMARY KEY, owner_user_id uuid NOT NULL);
CREATE TABLE shop_manager.customers(
  id uuid PRIMARY KEY, shop_id uuid, first_name text, last_name text, email text
);
CREATE TABLE shop_manager.work_orders(
  id uuid PRIMARY KEY, shop_id uuid NOT NULL, customer_id uuid, invoice_id text,
  description text, total_cost numeric, updated_at timestamptz, invoiced_at timestamptz
);
CREATE TABLE shop_manager.work_order_job_lines(
  work_order_id uuid, name text, description text, estimated_hours numeric,
  labor_rate numeric, total_amount numeric
);
CREATE TABLE shop_manager.work_order_parts(
  work_order_id uuid, part_name text, part_number text, quantity integer, customer_price numeric
);
CREATE SEQUENCE shop_manager.work_order_number_seq;
CREATE TABLE shop_manager.invoices(
  id text PRIMARY KEY, customer text, customer_email text, description text,
  date text, due_date text NOT NULL, status text, work_order_id text,
  subtotal numeric, tax numeric, total numeric, created_by text,
  customer_id uuid, created_at timestamptz
);
CREATE TABLE shop_manager.invoice_items(
  invoice_id text, name text, description text, quantity numeric,
  price numeric, total numeric, hours boolean
);
GRANT USAGE ON SCHEMA auth, shop_manager TO anon, authenticated;
GRANT SELECT ON shop_manager.shops TO anon, authenticated;
GRANT SELECT, UPDATE ON shop_manager.work_orders,
  shop_manager.work_order_job_lines, shop_manager.work_order_parts TO anon, authenticated;
ALTER TABLE shop_manager.work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY shop_owner ON shop_manager.work_orders TO authenticated
  USING (shop_id IN (SELECT id FROM shop_manager.shops WHERE owner_user_id = (SELECT auth.uid())))
  WITH CHECK (shop_id IN (SELECT id FROM shop_manager.shops WHERE owner_user_id = (SELECT auth.uid())));
ALTER TABLE shop_manager.work_order_job_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY shop_owner ON shop_manager.work_order_job_lines TO authenticated
  USING (work_order_id IN (SELECT id FROM shop_manager.work_orders))
  WITH CHECK (work_order_id IN (SELECT id FROM shop_manager.work_orders));
ALTER TABLE shop_manager.work_order_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY shop_owner ON shop_manager.work_order_parts TO authenticated
  USING (work_order_id IN (SELECT id FROM shop_manager.work_orders))
  WITH CHECK (work_order_id IN (SELECT id FROM shop_manager.work_orders));
INSERT INTO auth.users VALUES ('${userA}'), ('${userB}');
INSERT INTO shop_manager.shops VALUES
  ('10000000-0000-4000-8000-000000000001', '${userA}'),
  ('10000000-0000-4000-8000-000000000002', '${userB}');
INSERT INTO shop_manager.customers VALUES
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
   'Synthetic', 'Customer', 'customer@example.invalid');
INSERT INTO shop_manager.work_orders VALUES
  ('${linkedOrder}', '10000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000001', '${invoiceId}', 'Private linked order', 999, '2000-01-01', NULL),
  ('${openOrder}', '10000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000001', NULL, 'Owner-only conversion probe', 0, '2000-01-01', NULL);
INSERT INTO shop_manager.work_order_job_lines VALUES
  ('${linkedOrder}', 'Synthetic labor', NULL, 2.5, 400, 1000),
  ('${openOrder}', 'Internal helper probe', NULL, 1, 10, 10);
INSERT INTO shop_manager.work_order_parts VALUES
  ('${linkedOrder}', 'Synthetic part', 'PART-1', 2, 112.75),
  ('${openOrder}', 'Internal part probe', 'PART-2', 1, 2);
INSERT INTO shop_manager.invoices(id, due_date, work_order_id)
  VALUES ('${invoiceId}', '2000-02-01', '${linkedOrder}');
`;

async function withFixture(run) {
  const db = new PGlite(); // Deliberately memory-only; always closed below.
  try {
    await db.exec(fixtureSql);
    for (const definition of historical) {
      await db.exec(definition.sql); // Execute the exact extracted bytes, including original GRANT.
      const stored = (
        await db.query(
          `SELECT p.prosrc, p.prosecdef, p.proconfig, r.rolname AS owner
           FROM pg_proc p JOIN pg_roles r ON r.oid = p.proowner
           WHERE p.oid = $1::regprocedure`,
          [definition.signature],
        )
      ).rows[0];
      assert.equal(stored.prosecdef, true);
      assert.equal(stored.owner, "postgres");
      assert.deepEqual(stored.proconfig, ["search_path=shop_manager, public"]);
      assert.equal(
        normalize(stored.prosrc),
        normalize(definition.sql.match(/AS \$\$([\s\S]*)\$\$;/)[1]),
      );
    }
    await run(db);
  } finally {
    await db.close();
  }
}

async function withClient(db, client, run) {
  assert.ok(["anon", "authenticated"].includes(client.role));
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [client.user ?? ""]);
  try {
    await db.exec(`SET ROLE ${client.role}`);
    const context = (
      await db.query(
        `SELECT current_user, session_user, auth.uid() AS user_id, r.rolsuper, r.rolbypassrls,
                row_security_active('shop_manager.work_orders'::regclass) AS rls_active
         FROM pg_roles r WHERE r.rolname = current_user`,
      )
    ).rows[0];
    assert.deepEqual(context, {
      current_user: client.role,
      session_user: "postgres",
      user_id: client.user,
      rolsuper: false,
      rolbypassrls: false,
      rls_active: true,
    });
    await run();
  } finally {
    await db.exec("RESET ROLE");
    await db.query("SELECT set_config('request.jwt.claim.sub', '', false)");
  }
}

async function executionAllowed(db, role, signature) {
  return (
    await db.query("SELECT has_function_privilege($1::name, $2::text, 'EXECUTE') AS allowed", [
      role,
      signature,
    ])
  ).rows[0].allowed;
}

async function assertDirectRowsHidden(db) {
  for (const table of ["work_orders", "work_order_job_lines", "work_order_parts"]) {
    assert.deepEqual((await db.query(`SELECT * FROM shop_manager.${table}`)).rows, []);
  }
  assert.deepEqual(
    (
      await db.query(
        "UPDATE shop_manager.work_orders SET total_cost = -1 WHERE id = $1 RETURNING id",
        [linkedOrder],
      )
    ).rows,
    [],
  );
}

const callExisting = (db) =>
  db.query("SELECT shop_manager.convert_work_order_to_invoice($1::uuid) AS result", [linkedOrder]);
const callTotals = (db) =>
  db.query("SELECT shop_manager.calculate_work_order_totals($1::uuid) AS result", [linkedOrder]);
const storedTotal = async (db) =>
  (
    await db.query("SELECT total_cost::text AS total FROM shop_manager.work_orders WHERE id = $1", [
      linkedOrder,
    ])
  ).rows[0].total;

test("historical extraction is unchanged and fails closed on missing, ambiguous, altered, or oversized SQL", () => {
  assert.equal(historical.length, 2);
  for (const definition of historical) assert.ok(source.includes(definition.sql));
  for (const malformed of [
    "",
    source.replace(
      "GRANT EXECUTE ON FUNCTION shop_manager.calculate_work_order_totals(uuid) TO authenticated;",
      "",
    ),
    source + historical[0].sql,
    source.replace("grand := labor_total + parts_total;", "grand := 0;"),
    " ".repeat(256 * 1024 + 1),
    null,
  ]) {
    assert.throws(() => extractHistoricalFunctions(malformed));
  }
});

for (const client of clients) {
  test(`${client.role} cannot read/update another shop directly but historical definer calls disclose ID and mutate totals`, async () => {
    await withFixture(async (db) => {
      // Positive control: the same authenticated role sees shop A with A's identity.
      await withClient(db, { role: "authenticated", user: userA }, async () => {
        assert.equal((await db.query("SELECT id FROM shop_manager.work_orders")).rows.length, 2);
        assert.equal(
          (
            await db.query(
              "UPDATE shop_manager.work_orders SET total_cost = 999 WHERE id = $1 RETURNING id",
              [linkedOrder],
            )
          ).rows.length,
          1,
        );
      });
      await withClient(db, client, async () => {
        await assertDirectRowsHidden(db);
        for (const { signature } of historical) {
          assert.equal(await executionAllowed(db, client.role, signature), true);
        }
        assert.equal((await callExisting(db)).rows[0].result, invoiceId);
      });
      // Existing-invoice disclosure returns before the helper; it did not mutate totals.
      assert.equal(await storedTotal(db), "999");
      await withClient(db, client, async () => {
        assert.equal(Number((await callTotals(db)).rows[0].result), 1225.5);
        await assertDirectRowsHidden(db);
      });
      assert.equal(await storedTotal(db), "1225.50");
      assert.equal(
        (await db.query("SELECT count(*)::int AS n FROM shop_manager.invoices")).rows[0].n,
        1,
      );
    });
  });
}

test("PUBLIC-only revoke blocks anon but leaves the historical direct authenticated grants effective", async () => {
  await withFixture(async (db) => {
    await db.exec(`REVOKE EXECUTE ON FUNCTION ${signatures} FROM PUBLIC`);
    for (const { signature } of historical) {
      assert.equal(await executionAllowed(db, "anon", signature), false);
      assert.equal(await executionAllowed(db, "authenticated", signature), true);
    }
    await withClient(db, clients[0], async () => {
      await assert.rejects(callExisting(db), { code: "42501" });
      await assert.rejects(callTotals(db), { code: "42501" });
    });
    await withClient(db, clients[1], async () => {
      assert.equal((await callExisting(db)).rows[0].result, invoiceId);
      assert.equal(Number((await callTotals(db)).rows[0].result), 1225.5);
    });
    assert.equal(await storedTotal(db), "1225.50");
  });
});

test("disposable full revoke blocks both client roles while DB-owner and nested helper execution remain available", async () => {
  await withFixture(async (db) => {
    // Additional synthetic direct anon grants ensure PUBLIC revocation alone
    // cannot hide a direct grant; this is not a claim about live anon ACL entries.
    await db.exec(`GRANT EXECUTE ON FUNCTION ${signatures} TO anon`);
    await db.exec(`REVOKE EXECUTE ON FUNCTION ${signatures} FROM PUBLIC, anon, authenticated`);
    for (const client of clients) {
      for (const { signature } of historical) {
        assert.equal(await executionAllowed(db, client.role, signature), false);
      }
      await withClient(db, client, async () => {
        await assertDirectRowsHidden(db);
        await assert.rejects(callExisting(db), { code: "42501" });
        await assert.rejects(callTotals(db), { code: "42501" });
      });
    }
    assert.equal(await storedTotal(db), "999");
    assert.equal(
      (await db.query("SELECT count(*)::int AS n FROM shop_manager.invoices")).rows[0].n,
      1,
    );
    assert.equal(
      (await db.query("SELECT invoice_id FROM shop_manager.work_orders WHERE id = $1", [openOrder]))
        .rows[0].invoice_id,
      null,
    );

    // This preserves trusted database-owner/internal ability, NOT a rightful
    // shop owner's authenticated client RPC: that direct call is also revoked.
    for (const { signature } of historical) {
      assert.equal(await executionAllowed(db, "postgres", signature), true);
    }
    assert.equal(Number((await callTotals(db)).rows[0].result), 1225.5);
    assert.equal((await callExisting(db)).rows[0].result, invoiceId);
    const created = (
      await db.query("SELECT shop_manager.convert_work_order_to_invoice($1::uuid) AS result", [
        openOrder,
      ])
    ).rows[0].result;
    assert.match(created, /^INV-\d{4}-\d{5}$/);
    const linked = (
      await db.query(
        "SELECT invoice_id, total_cost::text AS total FROM shop_manager.work_orders WHERE id = $1",
        [openOrder],
      )
    ).rows[0];
    assert.equal(linked.invoice_id, created);
    assert.equal(linked.total, "12"); // Converter's revoked helper still executed as owner.
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM shop_manager.invoice_items WHERE invoice_id = $1",
          [created],
        )
      ).rows[0].n,
      2,
    );
  });
});
