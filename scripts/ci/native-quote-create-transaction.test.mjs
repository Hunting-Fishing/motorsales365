import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  IDs,
  SIGNATURE,
  nativeTables,
  nativeForeignKeys,
  nativeNumberFunction,
  readCandidate,
  installCandidate,
  withNativeQuoteFixture,
  grantFixtureOperator,
  invoke,
} from "./fixtures/native-quote-create-fixture.mjs";

// Actual memory-only SQL/physical-constraint rehearsal, NOT a migration, live
// native authority/JWT/API, PG17 independent-session concurrency/restore, final
// financial policy, audit, durable receipt, retry or idempotency acceptance.
let ordinal = 0;
const uuid = (value) => `50000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
function input(overrides = {}) {
  const next = ++ordinal * 1000;
  return {
    expectedAccount: IDs.actorA,
    quoteId: uuid(next),
    customerId: IDs.customerA,
    vehicleId: IDs.vehicleA,
    taxRate: "0.08",
    expiryDate: "2026-10-30",
    notes: "Synthetic notes",
    terms: "Synthetic terms",
    items: [
      {
        id: uuid(next + 1),
        name: "Synthetic service",
        description: null,
        quantity: "1.00",
        unit_price: "100.25",
        item_type: "service",
      },
    ],
    ...overrides,
  };
}
const quoteKeys = [
  "id",
  "quote_number",
  "customer_id",
  "vehicle_id",
  "status",
  "subtotal",
  "tax_rate",
  "tax_amount",
  "total_amount",
  "expiry_date",
  "notes",
  "terms_conditions",
  "created_by",
].sort();
const itemKeys = [
  "id",
  "quote_id",
  "name",
  "description",
  "category",
  "quantity",
  "unit_price",
  "total_price",
  "item_type",
  "display_order",
].sort();
const counts = async (db) =>
  (
    await db.query(`SELECT
 (SELECT count(*)::int FROM shop_manager.quotes) AS quotes,
 (SELECT count(*)::int FROM shop_manager.quote_items) AS items`)
  ).rows[0];
const relations = async (db) =>
  (
    await db.query(`SELECT n.nspname AS schema,c.relname,c.relkind
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN ('shop_manager','auth','public') AND c.relkind IN ('r','S','v','m')
 ORDER BY 1,2,3`)
  ).rows;
async function bodyFailure(db, value, code = "22023", actorOptions) {
  const before = await counts(db);
  await assert.rejects(
    () => invoke(db, value, actorOptions),
    (error) => {
      assert.equal(error.code, code);
      assert.equal(error.message, "Quote creation failed.");
      assert.ok(error.detail === undefined || error.detail === null || error.detail === "");
      assert.ok(error.hint === undefined || error.hint === null || error.hint === "");
      assert.ok(!JSON.stringify(error).includes("SYNTHETIC-PRIVATE-FAULT"));
      return true;
    },
  );
  assert.deepEqual(
    await counts(db),
    before,
    "whole statement rollback, not partial header/children",
  );
}
async function installFault(
  db,
  {
    table = "quote_items",
    timing = "BEFORE",
    body,
    target = "fault-late",
    update = false,
    remove = false,
  },
) {
  assert.ok(["quotes", "quote_items"].includes(table));
  assert.ok(["BEFORE", "AFTER"].includes(timing));
  const column = table === "quotes" ? "notes" : "name";
  if (update) await db.exec(`GRANT UPDATE ON shop_manager.${table} TO authenticated`);
  if (remove) await db.exec(`GRANT DELETE ON shop_manager.${table} TO authenticated`);
  // Clearly synthetic fault injection, not an asserted production trigger.
  // It executes as the same non-superuser caller; physical constraints remain.
  await db.exec(`CREATE FUNCTION shop_manager.fixture_quote_fault() RETURNS trigger
   LANGUAGE plpgsql SECURITY INVOKER AS $fixture$
   BEGIN IF NEW.${column} = '${target}' THEN ${body} END IF; RETURN NEW; END
   $fixture$;
   CREATE TRIGGER zz_fixture_quote_fault ${timing} INSERT ON shop_manager.${table}
   FOR EACH ROW EXECUTE FUNCTION shop_manager.fixture_quote_fault();`);
  return async () => {
    await db.exec(
      `DROP TRIGGER zz_fixture_quote_fault ON shop_manager.${table}; DROP FUNCTION shop_manager.fixture_quote_fault()`,
    );
    if (update) await db.exec(`REVOKE UPDATE ON shop_manager.${table} FROM authenticated`);
    if (remove) await db.exec(`REVOKE DELETE ON shop_manager.${table} FROM authenticated`);
  };
}
function walk(dir) {
  if (dir instanceof URL) dir = fileURLToPath(dir);
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory() || (entry.isSymbolicLink() && fs.statSync(full).isDirectory()))
      return walk(full);
    return /\.(?:[cm]?[jt]sx?|sql)$/.test(entry.name) ? [full] : [];
  });
}

test("unapplied quote candidate source is disconnected and contains no new receipt/idempotency schema", () => {
  const sql = readCandidate().replace(/--[^\n]*/g, "");
  assert.match(sql, /\bBEGIN\s*;/i);
  assert.match(sql, /\bCOMMIT\s*;\s*$/i);
  assert.equal(
    [...sql.matchAll(/CREATE\s+FUNCTION\s+shop_manager\.create_quote_atomic_candidate\(/gi)].length,
    1,
  );
  assert.doesNotMatch(sql, /CREATE\s+OR\s+REPLACE\s+FUNCTION/i);
  assert.doesNotMatch(
    sql,
    /CREATE\s+(?:UNLOGGED\s+)?TABLE|ON\s+CONFLICT|SECURITY\s+DEFINER|\bSQLERRM\b/i,
  );
  for (const dir of [
    new URL("../../src/", import.meta.url),
    new URL("../../supabase/migrations/", import.meta.url),
  ]) {
    for (const file of walk(dir))
      assert.doesNotMatch(
        fs.readFileSync(file, "utf8"),
        /create_quote_atomic_candidate/,
        `candidate must remain disconnected: ${file}`,
      );
  }
});

test("actual candidate SQL under exact selected native schema and fixture-only legacy-scoped role", async (t) => {
  await withNativeQuoteFixture(async (db) => {
    const version = (
      await db.query("SELECT version() AS version,current_setting('server_version_num') AS number")
    ).rows[0];
    t.diagnostic(
      `Installed memory-only PGlite engine: ${version.version}; server_version_num=${version.number}. Not native PostgreSQL17 acceptance.`,
    );
    const beforeRelations = await relations(db);
    await t.test(
      "selected physical constraints/scales and exact native number trigger remain intact",
      async () => {
        assert.equal(Object.keys(nativeTables).length, 5);
        const constraints = (
          await db.query(`SELECT conname FROM pg_constraint
       WHERE connamespace='shop_manager'::regnamespace ORDER BY conname`)
        ).rows.map((row) => row.conname);
        for (const name of [
          ...nativeForeignKeys.map((fk) => fk.name),
          "quotes_status_check",
          "quotes_pkey",
          "quotes_quote_number_key",
          "quote_items_item_type_check",
          "quote_items_pkey",
          "vehicles_owner_type_check",
          "customers_pkey",
        ])
          assert.ok(constraints.includes(name), `actual physical constraint ${name} is present`);
        const foreignKeys = (
          await db.query(
            `SELECT conname,convalidated,confupdtype,confdeltype,
        pg_get_constraintdef(oid) AS definition FROM pg_constraint
        WHERE connamespace='shop_manager'::regnamespace AND conname=ANY($1::text[])
        ORDER BY conname`,
            [nativeForeignKeys.map((fk) => fk.name)],
          )
        ).rows;
        const expectedForeignKeys = {
          customers_household_id_fkey: [
            "FOREIGN KEY (household_id) REFERENCES shop_manager.households(id)",
            "a",
          ],
          customers_shop_id_fkey: ["FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id)", "a"],
          customers_auth_user_id_fkey: [
            "FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL",
            "n",
          ],
          customers_user_id_fkey: [
            "FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL",
            "n",
          ],
          fk_vehicles_customer: [
            "FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE SET NULL",
            "n",
          ],
          vehicles_customer_id_fkey: [
            "FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE",
            "c",
          ],
          vehicles_checked_out_to_fkey: [
            "FOREIGN KEY (checked_out_to) REFERENCES shop_manager.profiles(id)",
            "a",
          ],
          quotes_created_by_fkey: ["FOREIGN KEY (created_by) REFERENCES auth.users(id)", "a"],
          profiles_user_id_fkey: [
            "FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL",
            "n",
          ],
        };
        assert.equal(foreignKeys.length, 9, "original DO exceptions must not hide a missing FK");
        for (const fk of foreignKeys) {
          assert.equal(fk.convalidated, true);
          assert.equal(fk.confupdtype, "a");
          assert.equal(fk.confdeltype, expectedForeignKeys[fk.conname][1]);
          assert.equal(fk.definition, expectedForeignKeys[fk.conname][0]);
        }
        assert.ok(
          !constraints.includes("quote_items_quote_id_fkey"),
          "no invented native quote_id FK",
        );
        const scales = (
          await db.query(`SELECT table_name,column_name,numeric_precision,numeric_scale
       FROM information_schema.columns WHERE table_schema='shop_manager'
       AND table_name IN ('quotes','quote_items') AND data_type='numeric' ORDER BY 1,2`)
        ).rows;
        assert.equal(scales.length, 7);
        for (const value of scales) {
          assert.equal(value.numeric_precision, value.column_name === "tax_rate" ? 5 : 10);
          assert.equal(value.numeric_scale, value.column_name === "tax_rate" ? 4 : 2);
        }
        const trigger = (
          await db.query(`SELECT p.prosrc,p.prosecdef,t.tgenabled
       FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
       WHERE t.tgrelid='shop_manager.quotes'::regclass AND t.tgname='trg_generate_quote_number'`)
        ).rows[0];
        assert.equal(trigger.prosrc, nativeNumberFunction.split("$$")[1]);
        assert.equal(
          trigger.prosecdef,
          true,
          "retained number trigger is privileged, unlike new candidate",
        );
        assert.equal(trigger.tgenabled, "O");
      },
    );

    await t.test(
      "candidate is INVOKER and owner-only before explicit TEST-ONLY execution grant",
      async () => {
        const stored = (
          await db.query(
            `SELECT p.prosecdef,p.proowner,
       array_agg(a.grantee ORDER BY a.grantee) AS grantees
       FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
       WHERE p.oid=$1::regprocedure GROUP BY p.oid`,
            [SIGNATURE],
          )
        ).rows[0];
        assert.equal(stored.prosecdef, false);
        assert.deepEqual(stored.grantees, [stored.proowner]);
        for (const role of ["anon", "authenticated", "service_role"]) {
          assert.equal(
            (
              await db.query(
                "SELECT has_function_privilege($1::name,$2::text,'EXECUTE') AS allowed",
                [role, SIGNATURE],
              )
            ).rows[0].allowed,
            false,
          );
          await assert.rejects(
            () => invoke(db, input(), { role }),
            (error) => error.code === "42501",
          );
        }
        assert.deepEqual(await counts(db), { quotes: 0, items: 0 });
        await grantFixtureOperator(db);
        assert.equal(
          (
            await db.query(
              "SELECT has_function_privilege('authenticated',$1::text,'EXECUTE') AS allowed",
              [SIGNATURE],
            )
          ).rows[0].allowed,
          true,
        );
      },
    );

    await t.test(
      "one non-superuser call inserts header/all ordered items and returns exact string-valued receipt",
      async () => {
        const value = input();
        value.items.push({
          id: uuid(++ordinal * 1000 + 2),
          name: "Synthetic part",
          description: "Preserved text",
          quantity: "2.00",
          unit_price: "10.00",
          item_type: "part",
        });
        const response = await invoke(db, value);
        assert.deepEqual(Object.keys(response).sort(), ["items", "quote"]);
        assert.deepEqual(Object.keys(response.quote).sort(), quoteKeys);
        assert.deepEqual(response.quote, {
          id: value.quoteId,
          quote_number: response.quote.quote_number,
          customer_id: IDs.customerA,
          vehicle_id: IDs.vehicleA,
          status: "draft",
          subtotal: "120.25",
          tax_rate: "0.0800",
          tax_amount: "9.62",
          total_amount: "129.87",
          expiry_date: "2026-10-30",
          notes: "Synthetic notes",
          terms_conditions: "Synthetic terms",
          created_by: IDs.actorA,
        });
        assert.match(response.quote.quote_number, /^Q-\d{4}-\d{5,}$/);
        assert.equal(response.items.length, 2);
        for (const [index, item] of response.items.entries()) {
          assert.deepEqual(Object.keys(item).sort(), itemKeys);
          assert.deepEqual(item, {
            ...value.items[index],
            quote_id: value.quoteId,
            category: value.items[index].item_type,
            total_price: index === 0 ? "100.25" : "20.00",
            display_order: index,
          });
        }
        const actual = (
          await db.query(
            `SELECT id::text,quote_number,subtotal::text,tax_rate::text,tax_amount::text,total_amount::text,created_by::text
       FROM shop_manager.quotes WHERE id=$1`,
            [value.quoteId],
          )
        ).rows[0];
        assert.deepEqual(actual, {
          id: value.quoteId,
          quote_number: response.quote.quote_number,
          subtotal: "120.25",
          tax_rate: "0.0800",
          tax_amount: "9.62",
          total_amount: "129.87",
          created_by: IDs.actorA,
        });
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::int AS count FROM shop_manager.quote_items WHERE quote_id=$1",
              [value.quoteId],
            )
          ).rows[0].count,
          2,
        );
      },
    );

    await t.test(
      "customer-only creation preserves optional null fields without inventing expiry policy",
      async () => {
        const value = input({ vehicleId: null, expiryDate: null, notes: null, terms: null });
        const response = await invoke(db, value);
        assert.equal(response.quote.vehicle_id, null);
        assert.equal(response.quote.expiry_date, null);
        assert.equal(response.quote.notes, null);
        assert.equal(response.quote.terms_conditions, null);
      },
    );

    for (const expiryDate of ["0001-01-01", "9999-12-31"])
      await t.test(
        `finite supported AD date ${expiryDate} is preserved without today/order rule`,
        async () => {
          const value = input({ expiryDate });
          assert.equal((await invoke(db, value)).quote.expiry_date, expiryDate);
        },
      );
    for (const expiryDate of ["infinity", "-infinity", "0001-01-01 BC", "10000-01-01"])
      await t.test(`date outside supported finite AD subset ${expiryDate} rejects`, () =>
        bodyFailure(db, input({ expiryDate })),
      );

    for (const [name, overrides, actorOptions] of [
      ["different expected actor", { expectedAccount: IDs.actorB }],
      ["null expected actor", { expectedAccount: null }],
      ["no claimed actor", {}, { actor: null }],
      ["no legacy profile binding", { expectedAccount: IDs.noProfile }, { actor: IDs.noProfile }],
      ["invisible other-shop customer", { customerId: IDs.customerB, vehicleId: null }],
      ["missing customer", { customerId: uuid(999999001), vehicleId: null }],
      ["missing vehicle", { vehicleId: uuid(999999002) }],
      ["other-shop vehicle", { vehicleId: IDs.vehicleB }],
      ["same-shop wrong-customer vehicle", { vehicleId: IDs.vehicleA2 }],
      ["unbound vehicle", { vehicleId: IDs.orphanVehicle }],
    ])
      await t.test(`${name} rejects without any partial row`, () =>
        bodyFailure(db, input(overrides), "42501", actorOptions),
      );

    await t.test(
      "fresh relation changes after a former caller read are rechecked in actual SQL",
      async () => {
        await db.exec(
          `UPDATE shop_manager.vehicles SET customer_id='${IDs.customerA2}' WHERE id='${IDs.vehicleA}'`,
        );
        try {
          await bodyFailure(db, input(), "42501");
        } finally {
          await db.exec(
            `UPDATE shop_manager.vehicles SET customer_id='${IDs.customerA}' WHERE id='${IDs.vehicleA}'`,
          );
        }
      },
    );

    await t.test(
      "INVOKER cannot substitute privileged access when the fixture caller lacks required SELECT",
      async () => {
        await db.exec("REVOKE SELECT ON shop_manager.customers FROM authenticated");
        try {
          await bodyFailure(db, input(), "42501");
        } finally {
          await db.exec("GRANT SELECT ON shop_manager.customers TO authenticated");
        }
      },
    );

    for (const [name, mutate] of [
      [
        "unknown item field",
        (value) => {
          value.items[0].unknown = true;
        },
      ],
      [
        "missing required description key",
        (value) => {
          delete value.items[0].description;
        },
      ],
      [
        "numeric rather than text quantity",
        (value) => {
          value.items[0].quantity = 1;
        },
      ],
      [
        "numeric rather than text price",
        (value) => {
          value.items[0].unit_price = 1;
        },
      ],
      [
        "wrong description type",
        (value) => {
          value.items[0].description = {};
        },
      ],
      [
        "empty item name",
        (value) => {
          value.items[0].name = "";
        },
      ],
      [
        "unsupported item type",
        (value) => {
          value.items[0].item_type = "inventory";
        },
      ],
      [
        "malformed client item ID",
        (value) => {
          value.items[0].id = "private-not-uuid";
        },
      ],
      [
        "null items",
        (value) => {
          value.items = null;
        },
      ],
      [
        "object items",
        (value) => {
          value.items = {};
        },
      ],
      [
        "empty items",
        (value) => {
          value.items = [];
        },
      ],
      [
        "over-limit 101 items",
        (value) => {
          value.items = Array.from({ length: 101 }, (_, i) => ({
            ...value.items[0],
            id: uuid(++ordinal * 1000 + i),
          }));
        },
      ],
      [
        "duplicate item client IDs",
        (value) => {
          value.items.push({ ...value.items[0] });
        },
      ],
      [
        "null quote client ID",
        (value) => {
          value.quoteId = null;
        },
      ],
      [
        "over-limit name text",
        (value) => {
          value.items[0].name = "a".repeat(201);
        },
      ],
      [
        "UTF16 supplementary text limit",
        (value) => {
          value.items[0].name = "😀".repeat(101);
        },
      ],
      [
        "over-limit notes text",
        (value) => {
          value.notes = "a".repeat(4001);
        },
      ],
    ])
      await t.test(`strict candidate input: ${name}`, async () => {
        const value = input();
        mutate(value);
        await bodyFailure(db, value);
      });

    for (const [column, values] of [
      ["quantity", ["0", "-1", "1e2", "1.005", "NaN", "Infinity", " 1", "100000000.00"]],
      ["unit_price", ["-1", "1e2", "0.001", "NaN", "Infinity", "1,000", "100000000.00"]],
    ])
      for (const value of values)
        await t.test(`reject ${column} ${value} without native rounding`, async () => {
          const request = input();
          request.items[0][column] = value;
          await bodyFailure(db, request);
        });
    for (const taxRate of [null, "-0.01", "10", "0.00001", "1e-2", "NaN", "Infinity", " 0.08"])
      await t.test(`reject unsupported tax fraction ${taxRate}`, () =>
        bodyFailure(db, input({ taxRate })),
      );

    await t.test(
      "exact cents arithmetic does not silently round line products or tax",
      async () => {
        const product = input({ taxRate: "0" });
        product.items[0].quantity = "0.25";
        product.items[0].unit_price = "0.01";
        await bodyFailure(db, product);
        const tax = input({ taxRate: "0.075" });
        tax.items[0].unit_price = "0.10";
        await bodyFailure(db, tax);
        const valid = input({ taxRate: "0.075" });
        valid.items[0].unit_price = "10.00";
        const response = await invoke(db, valid);
        assert.equal(response.quote.tax_amount, "0.75");
        assert.equal(response.quote.total_amount, "10.75");
      },
    );

    await t.test(
      "native upper exact range and four-place tax fractions are retained, overflow rejects",
      async () => {
        const upper = input({ taxRate: "0" });
        upper.items[0].unit_price = "99999999.99";
        assert.equal((await invoke(db, upper)).quote.total_amount, "99999999.99");
        const tax = input({ taxRate: "9.9999" });
        tax.items[0].unit_price = "10000.00";
        const response = await invoke(db, tax);
        assert.equal(response.quote.tax_rate, "9.9999");
        assert.equal(response.quote.tax_amount, "99999.00");
        assert.equal(response.quote.total_amount, "109999.00");
        const overflow = input({ taxRate: "0" });
        overflow.items[0].quantity = "2";
        overflow.items[0].unit_price = "99999999.99";
        await bodyFailure(db, overflow);
        const totalOverflow = input({ taxRate: "1" });
        totalOverflow.items[0].unit_price = "99999999.99";
        await bodyFailure(db, totalOverflow);
      },
    );

    await t.test(
      "native fixed-scale coercion is real; candidate rejects rather than relying on it",
      async () => {
        const id = uuid(++ordinal * 1000);
        await db.query(
          "INSERT INTO shop_manager.quote_items(id,quote_id,name,quantity,unit_price,total_price) VALUES($1,$2,'Native scale probe',1,1.005,1.005)",
          [id, uuid(999999999)],
        );
        assert.deepEqual(
          (
            await db.query(
              "SELECT unit_price::text,total_price::text FROM shop_manager.quote_items WHERE id=$1",
              [id],
            )
          ).rows[0],
          { unit_price: "1.01", total_price: "1.01" },
        );
        const value = input();
        value.items[0].unit_price = "1.005";
        await bodyFailure(db, value);
      },
    );

    await t.test(
      "duplicate persisted header client ID errors rather than replaying or inserting more items",
      async () => {
        const value = input();
        await invoke(db, value);
        await bodyFailure(db, value, "23505");
      },
    );
    await t.test(
      "persisted item client ID conflict rolls back new header and earlier valid child",
      async () => {
        const original = input();
        await invoke(db, original);
        const next = input();
        next.items.push({ ...original.items[0], name: "Late existing item ID" });
        await bodyFailure(db, next, "23505");
        assert.equal(
          (
            await db.query("SELECT count(*)::int AS count FROM shop_manager.quotes WHERE id=$1", [
              next.quoteId,
            ])
          ).rows[0].count,
          0,
        );
      },
    );

    for (const [name, body, code] of [
      ["actual late native CHECK", "NEW.item_type := 'INVALID-NATIVE-TYPE';", "23514"],
      [
        "actual late trigger error",
        "RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='SYNTHETIC-PRIVATE-FAULT',DETAIL='SYNTHETIC-PRIVATE-FAULT',HINT='SYNTHETIC-PRIVATE-FAULT';",
        "P0001",
      ],
    ])
      await t.test(
        `${name} rolls back header and every earlier child with generic error`,
        async () => {
          const value = input();
          value.items.push({
            ...value.items[0],
            id: uuid(++ordinal * 1000 + 2),
            name: "fault-late",
          });
          const cleanup = await installFault(db, { body });
          const sequenceBefore = (
            await db.query("SELECT last_value::text AS value FROM shop_manager.quote_number_seq")
          ).rows[0].value;
          try {
            await bodyFailure(db, value, code);
          } finally {
            await cleanup();
          }
          const sequenceAfter = (
            await db.query("SELECT last_value::text AS value FROM shop_manager.quote_number_seq")
          ).rows[0].value;
          assert.ok(
            BigInt(sequenceAfter) > BigInt(sequenceBefore),
            "sequence allocation may gap despite row rollback",
          );
        },
      );
    await t.test(
      "actual late native PK failure rolls back header and all children without disabling constraints",
      async () => {
        const value = input();
        value.items.push({ ...value.items[0], id: uuid(++ordinal * 1000 + 2), name: "fault-late" });
        const cleanup = await installFault(db, { body: `NEW.id := '${value.items[0].id}'::uuid;` });
        try {
          await bodyFailure(db, value, "23505");
        } finally {
          await cleanup();
        }
      },
    );

    for (const [name, options] of [
      ["header BEFORE suppression", { table: "quotes", body: "RETURN NULL;" }],
      [
        "header BEFORE retarget",
        { table: "quotes", body: `NEW.customer_id := '${IDs.customerA2}'::uuid;` },
      ],
      [
        "header BEFORE value change",
        { table: "quotes", body: "NEW.total_amount := NEW.total_amount + 0.01;" },
      ],
      [
        "header AFTER deletion",
        {
          table: "quotes",
          timing: "AFTER",
          remove: true,
          code: "42501",
          body: "DELETE FROM shop_manager.quotes WHERE id=NEW.id;",
        },
      ],
      ["item BEFORE suppression", { body: "RETURN NULL;" }],
      ["item BEFORE value change", { body: "NEW.unit_price := NEW.unit_price + 0.01;" }],
      [
        "item AFTER value change",
        {
          timing: "AFTER",
          update: true,
          body: "UPDATE shop_manager.quote_items SET name='Changed by synthetic fault' WHERE id=NEW.id;",
        },
      ],
      [
        "item AFTER extra matching row",
        {
          timing: "AFTER",
          body: `INSERT INTO shop_manager.quote_items(id,quote_id,name,quantity,unit_price,total_price,item_type) VALUES('${uuid(999999800)}',NEW.quote_id,'Synthetic extra matching row',1,0,0,'part');`,
        },
      ],
    ])
      await t.test(
        `postcondition or earlier native RLS rejects ${name} and rolls back all transaction rows`,
        async () => {
          const value = input({
            notes: options.table === "quotes" ? "fault-late" : "Synthetic notes",
          });
          value.items.push({
            ...value.items[0],
            id: uuid(++ordinal * 1000 + 2),
            name: "fault-late",
          });
          const cleanup = await installFault(db, options);
          try {
            await bodyFailure(db, value, options.code ?? "55000");
          } finally {
            await cleanup();
          }
        },
      );

    await t.test("postcondition rejects an item retargeted to another visible header", async () => {
      const other = input();
      await invoke(db, other);
      const value = input();
      value.items.push({ ...value.items[0], id: uuid(++ordinal * 1000 + 2), name: "fault-late" });
      const cleanup = await installFault(db, { body: `NEW.quote_id := '${other.quoteId}'::uuid;` });
      try {
        await bodyFailure(db, value, "55000");
      } finally {
        await cleanup();
      }
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int AS count FROM shop_manager.quote_items WHERE quote_id=$1",
            [other.quoteId],
          )
        ).rows[0].count,
        1,
      );
    });

    await t.test(
      "late second child retarget to an invisible other-shop header hits actual RLS and rolls back earlier rows",
      async () => {
        const other = input({
          expectedAccount: IDs.actorB,
          customerId: IDs.customerB,
          vehicleId: IDs.vehicleB,
        });
        await invoke(db, other, { actor: IDs.actorB });
        const value = input();
        value.items.push({ ...value.items[0], id: uuid(++ordinal * 1000 + 2), name: "fault-late" });
        const cleanup = await installFault(db, {
          body: `NEW.quote_id := '${other.quoteId}'::uuid;`,
        });
        try {
          await bodyFailure(db, value, "42501");
        } finally {
          await cleanup();
        }
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::int AS count FROM shop_manager.quote_items WHERE quote_id=$1",
              [other.quoteId],
            )
          ).rows[0].count,
          1,
        );
      },
    );

    await t.test(
      "late trigger changes selected vehicle relationship and final parent guard rolls back that change and all quote rows",
      async () => {
        const value = input();
        value.items.push({ ...value.items[0], id: uuid(++ordinal * 1000 + 2), name: "fault-late" });
        // Explicit TEST-ONLY grant for the synthetic trigger to reach the final
        // relationship guard as the same non-superuser; no production grant.
        await db.exec("GRANT UPDATE(customer_id) ON shop_manager.vehicles TO authenticated");
        const cleanup = await installFault(db, {
          timing: "AFTER",
          body: `UPDATE shop_manager.vehicles SET customer_id='${IDs.customerA2}' WHERE id='${IDs.vehicleA}';`,
        });
        try {
          await bodyFailure(db, value, "42501");
        } finally {
          await cleanup();
          await db.exec("REVOKE UPDATE(customer_id) ON shop_manager.vehicles FROM authenticated");
        }
        assert.equal(
          (
            await db.query(
              "SELECT customer_id::text AS customer_id FROM shop_manager.vehicles WHERE id=$1",
              [IDs.vehicleA],
            )
          ).rows[0].customer_id,
          IDs.customerA,
        );
      },
    );

    await t.test(
      "preexisting native orphan quote_id row cannot masquerade as this new receipt",
      async () => {
        const value = input();
        const orphanId = uuid(++ordinal * 1000 + 3);
        await db.query(
          "INSERT INTO shop_manager.quote_items(id,quote_id,name,quantity,unit_price,total_price) VALUES($1,$2,'Synthetic preexisting orphan',1,0,0)",
          [orphanId, value.quoteId],
        );
        await bodyFailure(db, value, "55000");
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::int AS count FROM shop_manager.quote_items WHERE id=$1 AND quote_id=$2",
              [orphanId, value.quoteId],
            )
          ).rows[0].count,
          1,
        );
        assert.equal(
          (
            await db.query("SELECT count(*)::int AS count FROM shop_manager.quotes WHERE id=$1", [
              value.quoteId,
            ])
          ).rows[0].count,
          0,
        );
      },
    );

    await t.test(
      "invalid DATE/JSON Unicode admission fails before body; no generic parser claim or partial rows",
      async () => {
        const before = await counts(db);
        await assert.rejects(
          () => invoke(db, input({ expiryDate: "not-a-date" })),
          (error) => error.code === "22007",
        );
        const value = input();
        value.items[0].name = "\ud800";
        await assert.rejects(
          () => invoke(db, value),
          (error) => error.code === "22P02",
        );
        assert.deepEqual(await counts(db), before);
      },
    );
    await t.test(
      "candidate introduced no receipt/idempotency relation or migration history",
      async () => {
        assert.deepEqual(await relations(db), beforeRelations);
      },
    );
  });
});

test("candidate installation rejects existing function collision without replacement", async () => {
  await withNativeQuoteFixture(
    async (db) => {
      await db.exec(
        `CREATE FUNCTION ${SIGNATURE} RETURNS jsonb LANGUAGE sql SECURITY INVOKER AS $$ SELECT '{"fixture":"preexisting"}'::jsonb $$`,
      );
      const before = (
        await db.query(
          "SELECT prosrc,proacl::text AS acl FROM pg_proc WHERE oid=$1::regprocedure",
          [SIGNATURE],
        )
      ).rows[0];
      await assert.rejects(
        () => installCandidate(db),
        (error) => error.code === "42723",
      );
      assert.deepEqual(
        (
          await db.query(
            "SELECT prosrc,proacl::text AS acl FROM pg_proc WHERE oid=$1::regprocedure",
            [SIGNATURE],
          )
        ).rows[0],
        before,
      );
      assert.deepEqual(await counts(db), { quotes: 0, items: 0 });
    },
    { install: false },
  );
});

test("candidate installation rolls back unknown default EXECUTE grantee instead of silently publishing", async () => {
  await withNativeQuoteFixture(
    async (db) => {
      await db.exec(
        "CREATE ROLE fixture_unexpected_default NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS; ALTER DEFAULT PRIVILEGES IN SCHEMA shop_manager GRANT EXECUTE ON FUNCTIONS TO fixture_unexpected_default",
      );
      const beforeRelations = await relations(db);
      const beforeDefaults = (
        await db.query("SELECT defaclacl::text AS acl FROM pg_default_acl ORDER BY oid")
      ).rows;
      await assert.rejects(
        () => installCandidate(db),
        (error) => {
          assert.equal(error.code, "55000");
          assert.equal(error.message, "Quote candidate publication failed.");
          return true;
        },
      );
      assert.equal(
        (await db.query("SELECT to_regprocedure($1) AS candidate", [SIGNATURE])).rows[0].candidate,
        null,
      );
      assert.deepEqual(
        (await db.query("SELECT defaclacl::text AS acl FROM pg_default_acl ORDER BY oid")).rows,
        beforeDefaults,
      );
      assert.deepEqual(await relations(db), beforeRelations);
      assert.deepEqual(await counts(db), { quotes: 0, items: 0 });
    },
    { install: false },
  );
});
