import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

// Disposable proof of the exact candidate, NOT a live executor or release approval.
// No connection strings, environment inputs, persistent dataDir, or network calls.
const migrations = new URL("../../supabase/migrations/", import.meta.url);
const historicalSql = fs.readFileSync(
  new URL("20260715012303_a5daad1f-ca4a-4606-b07d-3f38ec8c7ee9.sql", migrations),
  "utf8",
);
const candidateSql = fs.readFileSync(
  new URL("20261014175040_contain_legacy_invoice_conversion_execute.sql", migrations),
  "utf8",
);
const rollbackSql = fs.readFileSync(
  new URL("../../docs/evidence/invoice-converter-acl-rollback-review.sql", import.meta.url),
  "utf8",
);
const converter = "shop_manager.convert_work_order_to_invoice(uuid)";
const totals = "shop_manager.calculate_work_order_totals(uuid)";
const definitionMd5 = "e590e08f9f68cc5fdead8a853af670b9";
const orderId = "30000000-0000-4000-8000-000000000001";
const invoiceId = "INV-SYNTHETIC-PRIVATE";
const historicalFunctions = [
  [
    "calculate_work_order_totals",
    "aa2bea4e7de7e7333ad614fa6a90b1ba9e8ea67b1ba69ecf15d48c1f7cccc773",
  ],
  [
    "convert_work_order_to_invoice",
    "1f2c322b8cbeec8c2e02435e46246833183d0ae163ea30dec54956f78a5a4065",
  ],
];

function extractUnchangedFunctions(sql) {
  assert.ok(typeof sql === "string" && sql.length > 0 && sql.length <= 256 * 1024);
  return historicalFunctions.map(([name, expectedHash]) => {
    const declaration = `CREATE OR REPLACE FUNCTION shop_manager.${name}(`;
    const grant = `GRANT EXECUTE ON FUNCTION shop_manager.${name}(uuid) TO authenticated;`;
    assert.equal(sql.split(declaration).length, 2, `Expected one ${name} definition`);
    const start = sql.indexOf(declaration);
    const end = sql.indexOf(grant, start);
    assert.ok(end > start, `Missing ${name} grant`);
    // Only normalize checkout line endings. The body/definition/grant is not
    // rewritten; LF reproduces the observed live pg_get_functiondef MD5.
    const unchanged = sql.slice(start, end + grant.length).replace(/\r\n/g, "\n");
    assert.equal(createHash("sha256").update(unchanged).digest("hex"), expectedHash);
    return unchanged;
  });
}
const definitions = extractUnchangedFunctions(historicalSql);
assert.ok(candidateSql.trim().length > 0, "Containment candidate must not be empty");
assert.ok(rollbackSql.trim().length > 0, "Review-only rollback must not be empty");

const fixtureSql = `
CREATE ROLE anon NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE ROLE authenticated NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE ROLE service_role NOLOGIN NOINHERIT NOSUPERUSER BYPASSRLS;
CREATE SCHEMA shop_manager;
CREATE TABLE shop_manager.work_orders(
  id uuid PRIMARY KEY, invoice_id text, total_cost numeric, updated_at timestamptz
);
CREATE TABLE shop_manager.customers(id uuid PRIMARY KEY);
CREATE TABLE shop_manager.work_order_job_lines(work_order_id uuid, total_amount numeric);
CREATE TABLE shop_manager.work_order_parts(work_order_id uuid, customer_price numeric, quantity integer);
GRANT USAGE ON SCHEMA shop_manager TO anon, authenticated, service_role;
GRANT SELECT, UPDATE ON shop_manager.work_orders TO anon, authenticated;
ALTER TABLE shop_manager.work_orders ENABLE ROW LEVEL SECURITY;
INSERT INTO shop_manager.work_orders VALUES ('${orderId}', '${invoiceId}', 999, '2000-01-01');
INSERT INTO shop_manager.work_order_job_lines VALUES ('${orderId}', 1000);
INSERT INTO shop_manager.work_order_parts VALUES ('${orderId}', 112.75, 2);
`;

// Canonical ACL includes grantor and grant option, not just effective EXECUTE.
// Array order has no ACL meaning; this proves exact original grant semantics.
async function acl(db, signature) {
  return (
    await db.query(
      `SELECT COALESCE(grantee.rolname, 'PUBLIC') AS grantee,
              grantor.rolname AS grantor, a.privilege_type, a.is_grantable
       FROM pg_proc p
       CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
       LEFT JOIN pg_roles grantee ON grantee.oid = a.grantee
       JOIN pg_roles grantor ON grantor.oid = a.grantor
       WHERE p.oid = $1::regprocedure
       ORDER BY 1, 2, 3, 4`,
      [signature],
    )
  ).rows;
}
const grantEntry = (grantee) => ({
  grantee,
  grantor: "postgres",
  privilege_type: "EXECUTE",
  is_grantable: false,
});
const originalAcl = ["PUBLIC", "postgres", "service_role"].map(grantEntry);
const restrictedAcl = ["postgres", "service_role"].map(grantEntry);

async function definitionState(db) {
  return (
    await db.query(
      `SELECT md5(pg_get_functiondef(p.oid)) AS md5, p.prosecdef, r.rolname AS owner
       FROM pg_proc p JOIN pg_roles r ON r.oid = p.proowner
       WHERE p.oid = $1::regprocedure`,
      [converter],
    )
  ).rows[0];
}

async function withFixture(run) {
  const db = new PGlite(); // Memory-only and always closed, including failures.
  try {
    await db.exec(fixtureSql);
    for (const definition of definitions) await db.exec(definition);
    // Reproduce the observed LIVE converter ACL, not the historical direct
    // authenticated grant. The helper retains its historical fixture ACL.
    await db.exec(`REVOKE EXECUTE ON FUNCTION ${converter} FROM authenticated;
      GRANT EXECUTE ON FUNCTION ${converter} TO service_role;`);
    assert.deepEqual(await acl(db, converter), originalAcl);
    assert.deepEqual(await definitionState(db), {
      md5: definitionMd5,
      prosecdef: true,
      owner: "postgres",
    });
    await run(db);
  } finally {
    await db.close();
  }
}

async function asRole(db, role, run) {
  assert.ok(["anon", "authenticated", "service_role"].includes(role));
  try {
    await db.exec(`SET ROLE ${role}`);
    const context = (
      await db.query(
        "SELECT current_user, session_user, rolsuper FROM pg_roles WHERE rolname=current_user",
      )
    ).rows[0];
    assert.deepEqual(context, { current_user: role, session_user: "postgres", rolsuper: false });
    await run();
  } finally {
    await db.exec("RESET ROLE");
  }
}
const callConverter = (db) =>
  db.query("SELECT shop_manager.convert_work_order_to_invoice($1::uuid) AS result", [orderId]);
const callTotals = (db) =>
  db.query("SELECT shop_manager.calculate_work_order_totals($1::uuid) AS result", [orderId]);

async function assertRefusesWithoutAclChange(db, sql = candidateSql) {
  const before = { converter: await acl(db, converter), helper: await acl(db, totals) };
  await assert.rejects(db.exec(sql), { code: "55000" });
  // A guarded candidate may explicitly wrap its statements in a transaction.
  // Clear the failed disposable transaction before inspecting unchanged ACLs.
  await db.exec("ROLLBACK");
  assert.deepEqual(await acl(db, converter), before.converter);
  assert.deepEqual(await acl(db, totals), before.helper);
}

test("exact historical definitions fail closed when source is missing, duplicated, changed, or oversized", () => {
  assert.equal(definitions.length, 2);
  for (const malformed of [
    "",
    historicalSql + definitions[0],
    historicalSql.replace("grand := labor_total + parts_total;", "grand := 0;"),
    " ".repeat(256 * 1024 + 1),
    null,
  ])
    assert.throws(() => extractUnchangedFunctions(malformed));
});

test("exact candidate blocks only converter clients and preserves owner/service access plus totals-helper ACL and behavior", async () => {
  await withFixture(async (db) => {
    const helperAcl = await acl(db, totals);
    for (const role of ["anon", "authenticated"]) {
      await asRole(db, role, async () =>
        assert.equal((await callConverter(db)).rows[0].result, invoiceId),
      );
    }
    await db.exec(candidateSql);
    assert.deepEqual(await acl(db, converter), restrictedAcl);
    assert.deepEqual(await acl(db, totals), helperAcl);
    assert.deepEqual(await definitionState(db), {
      md5: definitionMd5,
      prosecdef: true,
      owner: "postgres",
    });
    for (const role of ["anon", "authenticated"]) {
      await asRole(db, role, async () => {
        await assert.rejects(callConverter(db), { code: "42501" });
        // Remaining helper exposure is deliberate scope, NOT authorization approval.
        assert.equal(Number((await callTotals(db)).rows[0].result), 1225.5);
      });
    }
    await asRole(db, "service_role", async () => {
      assert.equal((await callConverter(db)).rows[0].result, invoiceId);
      assert.equal(Number((await callTotals(db)).rows[0].result), 1225.5);
    });
    assert.equal((await callConverter(db)).rows[0].result, invoiceId);
    assert.equal(Number((await callTotals(db)).rows[0].result), 1225.5);
  });
});

test("definition or owner precondition mismatch refuses candidate without changing either ACL", async () => {
  for (const mismatch of [
    `ALTER FUNCTION ${converter} SECURITY INVOKER`,
    `ALTER FUNCTION ${converter} OWNER TO service_role`,
  ]) {
    await withFixture(async (db) => {
      await db.exec(mismatch);
      await assertRefusesWithoutAclChange(db);
    });
  }
});

test("unexpected ACLs or inherited access refuse candidate without partial ACL changes", async () => {
  for (const mismatch of [
    `GRANT EXECUTE ON FUNCTION ${converter} TO anon`,
    `GRANT EXECUTE ON FUNCTION ${converter} TO authenticated`,
    `REVOKE EXECUTE ON FUNCTION ${converter} FROM service_role`,
    // The exact original ACL passes the initial guard, but effective inherited
    // access fails AFTER REVOKE. The single DO must roll back that partial change.
    "ALTER ROLE authenticated INHERIT; GRANT service_role TO authenticated",
  ]) {
    await withFixture(async (db) => {
      await db.exec(mismatch);
      await assertRefusesWithoutAclChange(db);
    });
  }
});

test("repeated exact candidate accepts only the already-restricted state and is idempotent", async () => {
  await withFixture(async (db) => {
    const helperAcl = await acl(db, totals);
    await db.exec(candidateSql);
    assert.deepEqual(await acl(db, converter), restrictedAcl);
    await db.exec(candidateSql);
    assert.deepEqual(await acl(db, converter), restrictedAcl);
    assert.deepEqual(await acl(db, totals), helperAcl);
    for (const role of ["anon", "authenticated"]) {
      await asRole(db, role, async () => assert.rejects(callConverter(db), { code: "42501" }));
    }
  });
});

test("explicit fixture-only rollback restores the exact unsafe original ACL, never an automatic recovery action", async () => {
  await withFixture(async (db) => {
    const helperAcl = await acl(db, totals);
    await db.exec(candidateSql);
    assert.deepEqual(await acl(db, converter), restrictedAcl);
    await assertRefusesWithoutAclChange(db, rollbackSql); // No operator opt-in.
    // UNSAFE prior state, restored only in this disposable transaction. Execute
    // the actual review-only file unchanged, not a substitute inline GRANT.
    await db.exec(
      "BEGIN; SET LOCAL motorsales365.invoice_acl_recovery = 'owner-reviewed-unsafe-restore'",
    );
    await db.exec(rollbackSql);
    await db.exec("COMMIT");
    assert.deepEqual(await acl(db, converter), originalAcl);
    assert.deepEqual(await acl(db, totals), helperAcl);
    assert.notEqual(
      (
        await db.query(
          "SELECT current_setting('motorsales365.invoice_acl_recovery', true) AS opt_in",
        )
      ).rows[0].opt_in,
      "owner-reviewed-unsafe-restore",
    );
    for (const role of ["anon", "authenticated", "service_role"]) {
      await asRole(db, role, async () =>
        assert.equal((await callConverter(db)).rows[0].result, invoiceId),
      );
    }
  });
  for (const mismatch of [
    `ALTER FUNCTION ${converter} SECURITY INVOKER`,
    `GRANT EXECUTE ON FUNCTION ${converter} TO authenticated`,
  ]) {
    await withFixture(async (db) => {
      await db.exec(candidateSql);
      await db.exec(mismatch);
      await db.exec(
        "BEGIN; SET LOCAL motorsales365.invoice_acl_recovery = 'owner-reviewed-unsafe-restore'",
      );
      await assertRefusesWithoutAclChange(db, rollbackSql);
    });
  }
});
