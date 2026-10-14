// OFFLINE reminder integrity characterization, not an authorization fix or live
// incident finding. Only selected retained reminder SQL, policy rewrite block4,
// and current-shop helper run in sequential disposable in-memory databases.
// Supporting auth/profile/customer/vehicle shapes, policies and session claims
// are explicitly synthetic, not complete native schema/writer/auth parity.
// No framework, Supabase client, JWT/HTTP, live rows, deployment or data repair.
// PGlite 0.5.9 uses PostgreSQL18; NOT NULL catalog representation differs from
// dated live metadata. Column attnotnull is checked separately, not suppressed.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const sha = (raw) => createHash("sha256").update(raw.replace(/\r\n/g, "\n")).digest("hex");
const root = new URL("../../", import.meta.url);
function pinned(path, expected) {
  const raw = fs.readFileSync(new URL(path, root), "utf8");
  assert.ok(raw.length > 0 && raw.length < 512 * 1024, `${path}: bounded source/evidence`);
  assert.equal(sha(raw), expected, `${path}: LF pin drift`);
  return raw.replace(/\r\n/g, "\n");
}
const reminderSource = pinned(
  "supabase/migrations/20260714034131_1bed039d-569f-4b91-8f56-bf19451a7786.sql",
  "b19993ff90b57a5adb8272b141d7bdb765f1066dca4a554ec46ab4d8cfe821c9",
);
const sweepSource = pinned(
  "supabase/migrations/20260805084402_cd07847a-26f0-4c31-a2fe-ab0088684f77.sql",
  "d987fe1e83505eb4002529a5290361fba2ff4af994938986ced9006c1502b321",
);
const resolverSource = pinned(
  "supabase/migrations/20260713081429_d9cdd366-04dd-4e51-939f-541106ff205e.sql",
  "30dfd8df0c3537efb5155a8891804e00444b180f55e674b56d522e473e2f4144",
);
function extract(raw, declaration, endMarker) {
  assert.ok(typeof raw === "string" && raw.length > 0 && raw.length < 512 * 1024);
  assert.equal(raw.split(declaration).length, 2, "one exact selected source declaration");
  const start = raw.indexOf(declaration);
  const marker = endMarker === null ? raw.length : raw.indexOf(endMarker, start);
  assert.ok(marker > start, "selected source terminator exists after declaration");
  const end = marker + (endMarker?.length ?? 0);
  assert.ok(end > start && end <= raw.length, "complete selected source terminator");
  return raw.slice(start, end);
}
const selected = [
  [
    "reminderSuffix",
    reminderSource,
    "CREATE TABLE IF NOT EXISTS shop_manager.customer_reminders (",
    null,
    "458cecadc4c851ddcff20b16b7662b9a543ecc28c78668088ad031a55c68fff7",
  ],
  [
    "reminderTable",
    reminderSource,
    "CREATE TABLE IF NOT EXISTS shop_manager.customer_reminders (",
    "\n);",
    "04df575e6eeabbdeaa54c2505c7f148ee269f63967ebaefbe22b894efa1ff17c",
  ],
  [
    "touchFunction",
    reminderSource,
    "CREATE OR REPLACE FUNCTION shop_manager.touch_updated_at()",
    "LANGUAGE plpgsql SET search_path = public;",
    "76962694ca3ae60b6fa4e54753ada40065658711161ff3b6522117667a72684e",
  ],
  [
    "touchTrigger",
    reminderSource,
    "CREATE TRIGGER customer_reminders_touch BEFORE UPDATE ON shop_manager.customer_reminders",
    ";",
    "fc7b0ea5bce38e7e5eeba9345efc4815f58617dc6f5ba142309158966160f78d",
  ],
  [
    "policyRewrite",
    sweepSource,
    "-- 4. Replace always-true shop_manager policies with shop-scoped ones",
    "END $$;",
    "6e2959313b8a75248d90b0b74f9f988015c48410801d4d32f61b24916ae260ef",
  ],
  [
    "currentShop",
    resolverSource,
    "CREATE OR REPLACE FUNCTION shop_manager.get_current_user_shop_id()",
    "$$;",
    "96d278351d5b335519711b97e89dd5b52052886929fbce820951414612cd7845",
  ],
].map(([name, source, declaration, endMarker, expected]) => {
  const sql = extract(source, declaration, endMarker);
  assert.equal(sha(sql), expected, `${name}: selected SQL drift`);
  return { name, source, declaration, endMarker, expected, sql };
});
const sql = Object.fromEntries(selected.map((part) => [part.name, part.sql]));
const evidence = Object.fromEntries(
  [
    [
      "policy",
      "customer-card-policy-metadata-2026-10-15.json",
      "cea708c4ba5d4ab520347cba75c83f8552a5d82d2c55eb42b8721162ac4d6c13",
    ],
    [
      "shape",
      "customer-card-shape-metadata-2026-10-15.json",
      "7e959b0d41367135d132d210d0261ccec6ed9ad210c51ec118958cebc1511304",
    ],
    [
      "helpers",
      "native-access-composition-metadata-2026-10-15.json",
      "aaece0fb7c90dbae55a19f797bc9baff647b64901cc321cb1c43b029b8ee6a4a",
    ],
    [
      "integrity",
      "customer-card-integrity-metadata-2026-10-15.json",
      "e7a667979e7a3ba9ac0056370149d36fc05d1a64b4aeb630ad2bb5eff0f7d1aa",
    ],
    [
      "indexes",
      "customer-card-index-metadata-2026-10-15.json",
      "2b3fec3f37eb1b5585ec9b607181f88718cb7909fb92606c09520e4dcc8733c4",
    ],
  ].map(([name, file, expected]) => {
    const parsed = JSON.parse(pinned(`docs/evidence/${file}`, expected));
    assert.equal(parsed.projectRef ?? parsed.project, "wjxaajgvddtrxxtocxen");
    assert.equal(parsed.mode, "read-only-catalog");
    return [name, parsed];
  }),
);
const tableEvidence = (document) => {
  const rows = document.tables.filter((row) => row.relname === "customer_reminders");
  assert.equal(rows.length, 1);
  return rows[0];
};
const current = tableEvidence(evidence.integrity);
const oldPolicy = tableEvidence(evidence.policy);
const oldShape = tableEvidence(evidence.shape);
const options = { concurrency: false, timeout: 30_000 };
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actorA = uuid(1),
  actorB = uuid(2),
  stranger = uuid(3);
const shopA = uuid(101),
  shopB = uuid(102);
const customerA = uuid(201),
  secondCustomerA = uuid(202),
  customerB = uuid(203);
const vehicleA = uuid(301),
  vehicleB = uuid(302);
const reminderA = uuid(401),
  secondReminderA = uuid(402),
  reminderB = uuid(403);

async function policies(db) {
  return (
    await db.query(`SELECT polname AS name,pg_get_expr(polwithcheck,polrelid) AS check,
    ARRAY(SELECT rolname::text FROM pg_roles WHERE oid=ANY(polroles) ORDER BY rolname) AS roles,
    pg_get_expr(polqual,polrelid) AS using,polcmd::text AS command,polpermissive AS permissive
    FROM pg_policy WHERE polrelid='shop_manager.customer_reminders'::regclass ORDER BY polname`)
  ).rows;
}
async function allRows(db) {
  return (
    await db.query("SELECT to_jsonb(r) AS row FROM shop_manager.customer_reminders r ORDER BY id")
  ).rows;
}
async function asActor(db, subject, run, role = "authenticated") {
  assert.ok(["authenticated", "anon"].includes(role));
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [subject ?? ""]);
  try {
    await db.exec(`SET ROLE ${role}`);
    assert.deepEqual(
      (
        await db.query(`SELECT current_user AS actor,session_user,auth.uid() AS subject,
      rolsuper,rolbypassrls,row_security_active('shop_manager.customer_reminders') AS reminder_rls
      FROM pg_roles WHERE rolname=current_user`)
      ).rows[0],
      {
        actor: role,
        session_user: "postgres",
        subject: subject ?? null,
        rolsuper: false,
        rolbypassrls: false,
        reminder_rls: true,
      },
    );
    await run();
  } finally {
    await db.exec("RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false)");
  }
}
async function insertReminder(
  db,
  {
    id = uuid(500),
    shop = shopA,
    customer = customerA,
    vehicle = vehicleA,
    assigned = null,
    creator = null,
  } = {},
) {
  return (
    await db.query(
      `INSERT INTO shop_manager.customer_reminders
    (id,shop_id,customer_id,vehicle_id,title,due_date,assigned_to,created_by)
    VALUES($1,$2,$3,$4,'Synthetic review','2026-10-22',$5,$6)
    RETURNING id,shop_id,customer_id,vehicle_id,assigned_to,created_by,status`,
      [id, shop, customer, vehicle, assigned, creator],
    )
  ).rows;
}
async function withFixture(run, { rewrite = true } = {}) {
  const db = new PGlite("memory://");
  try {
    await db.exec(`SET statement_timeout='3000ms'; SET lock_timeout='1000ms';
      CREATE ROLE anon NOLOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
      CREATE ROLE authenticated NOLOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
      CREATE ROLE service_role NOLOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA shop_manager;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      CREATE TABLE shop_manager.profiles(id uuid PRIMARY KEY,shop_id uuid);
      CREATE TABLE shop_manager.customers(id uuid PRIMARY KEY,shop_id uuid NOT NULL);
      CREATE TABLE shop_manager.vehicles(id uuid PRIMARY KEY,customer_id uuid NOT NULL);
      ALTER TABLE shop_manager.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE shop_manager.customers ENABLE ROW LEVEL SECURITY;
      ALTER TABLE shop_manager.vehicles ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA auth,shop_manager TO anon,authenticated,service_role;
      GRANT SELECT ON shop_manager.profiles,shop_manager.customers,shop_manager.vehicles TO authenticated;`);
    await db.exec(sql.currentShop);
    // Explicit observed ACL reproduction, not replay of broad default privileges.
    await db.exec(
      "GRANT EXECUTE ON FUNCTION shop_manager.get_current_user_shop_id() TO authenticated,service_role",
    );
    // Only the reminder suffix runs. Expense and storage statements never run.
    await db.exec(sql.reminderSuffix);
    await db.exec("GRANT EXECUTE ON FUNCTION shop_manager.touch_updated_at() TO service_role");
    // These two supporting policies are SYNTHETIC controls, not claims about the
    // actual native customer/vehicle policies or every upstream writer.
    await db.exec(`CREATE POLICY synthetic_customer_scope ON shop_manager.customers FOR SELECT TO authenticated
      USING (shop_id=shop_manager.get_current_user_shop_id());
      CREATE POLICY synthetic_vehicle_scope ON shop_manager.vehicles FOR SELECT TO authenticated
      USING (EXISTS(SELECT 1 FROM shop_manager.customers c WHERE c.id=vehicles.customer_id));`);
    await db.query("INSERT INTO shop_manager.profiles VALUES($1,$2),($3,$4)", [
      actorA,
      shopA,
      actorB,
      shopB,
    ]);
    await db.query("INSERT INTO shop_manager.customers VALUES($1,$2),($3,$2),($4,$5)", [
      customerA,
      shopA,
      secondCustomerA,
      customerB,
      shopB,
    ]);
    await db.query("INSERT INTO shop_manager.vehicles VALUES($1,$2),($3,$4)", [
      vehicleA,
      customerA,
      vehicleB,
      customerB,
    ]);
    for (const [id, shop, customer, vehicle, creator] of [
      [reminderA, shopA, customerA, vehicleA, actorA],
      [secondReminderA, shopA, secondCustomerA, null, actorA],
      [reminderB, shopB, customerB, vehicleB, actorB],
    ])
      await db.query(
        `INSERT INTO shop_manager.customer_reminders
      (id,shop_id,customer_id,vehicle_id,title,due_date,created_by,created_at,updated_at)
      VALUES($1,$2,$3,$4,'Synthetic seeded reminder','2026-10-22',$5,'2020-01-01Z','2020-01-01Z')`,
        [id, shop, customer, vehicle, creator],
      );
    if (rewrite) await db.exec(sql.policyRewrite);
    await run(db);
  } finally {
    await db.close();
  }
}

test(
  "whole-source/selected-section pins exclude expense/storage/full-sweep execution and fail on boundary drift",
  options,
  () => {
    assert.equal(selected.length, 6);
    assert.ok(!/storage\.|shop_manager\.expenses/.test(sql.reminderSuffix));
    assert.ok(!/REVOKE|-- 5\.|storage\./.test(sql.policyRewrite));
    assert.match(sql.touchTrigger, /BEFORE UPDATE/);
    assert.ok(!/REFERENCES|FOREIGN KEY/i.test(sql.reminderTable));
    for (const part of selected) {
      assert.equal(extract(part.source, part.declaration, part.endMarker), part.sql);
      for (const bad of ["", null, part.source + part.source])
        assert.throws(() => extract(bad, part.declaration, part.endMarker));
      if (part.endMarker !== null)
        assert.throws(() => extract(part.source, part.declaration, "MISSING_SELECTED_TERMINATOR"));
      assert.notEqual(sha(part.sql + " "), part.expected);
    }
  },
);

test(
  "selected reminder catalog contracts match immutable observations, with explicit PostgreSQL18 NOT NULL limits",
  options,
  async () => {
    assert.equal(current.observed_at_utc, "2026-10-14 21:14:13.699192");
    assert.deepEqual(current.policies, oldPolicy.policies);
    assert.deepEqual(current.constraints, oldShape.constraints);
    assert.deepEqual(current.triggers, oldShape.triggers);
    await withFixture(async (db) => {
      assert.equal(
        JSON.parse(fs.readFileSync(new URL("package.json", root), "utf8")).devDependencies[
          "@electric-sql/pglite"
        ],
        "0.5.9",
      );
      const engine = (
        await db.query(
          "SELECT version() AS version,current_setting('server_version_num') AS version_num",
        )
      ).rows[0];
      assert.match(engine.version, /PGlite 0\.5\.9/);
      assert.match(engine.version_num, /^18\d{4}$/);
      const table = (
        await db.query(`SELECT pg_get_userbyid(relowner) AS owner,relrowsecurity AS rls,
      relforcerowsecurity AS force_rls,relacl::text AS acl FROM pg_class
      WHERE oid='shop_manager.customer_reminders'::regclass`)
      ).rows[0];
      assert.deepEqual(table, {
        owner: current.owner,
        rls: current.rls,
        force_rls: current.force_rls,
        acl: current.acl,
      });
      for (const action of ["select", "insert", "update", "delete"])
        assert.equal(
          (
            await db.query(
              "SELECT has_table_privilege('authenticated','shop_manager.customer_reminders',$1) AS allowed",
              [action],
            )
          ).rows[0].allowed,
          oldPolicy[`authenticated_${action}`],
        );
      assert.deepEqual(await policies(db), current.policies);
      const columns = (
        await db.query(`SELECT a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,
      a.attnotnull AS not_null,pg_get_expr(d.adbin,d.adrelid) AS column_default
      FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE a.attrelid='shop_manager.customer_reminders'::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum`)
      ).rows;
      assert.deepEqual(
        columns,
        evidence.integrity.columns
          .filter((row) => row.relname === "customer_reminders")
          .map(({ observed_at_utc: _time, relname: _table, ...column }) => column),
      );
      assert.deepEqual(
        columns,
        oldShape.columns.map(({ default: column_default, ...column }) => ({
          ...column,
          column_default,
        })),
      );
      // PostgreSQL18 represents NOT NULL additionally as contype=n. Only that
      // engine representation is excluded after exact attnotnull checks above.
      const constraints = (
        await db.query(`SELECT conname AS name,contype::text AS type,convalidated AS validated,
      pg_get_constraintdef(oid) AS definition FROM pg_constraint
      WHERE conrelid='shop_manager.customer_reminders'::regclass AND contype<>'n' ORDER BY conname`)
      ).rows;
      assert.deepEqual(constraints, current.constraints);
      const triggers = (
        await db.query(`SELECT tgname AS name,tgenabled::text AS enabled,tgisinternal AS internal,
      pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgrelid='shop_manager.customer_reminders'::regclass ORDER BY tgname`)
      ).rows;
      assert.deepEqual(triggers, current.triggers);
      const indexes = (
        await db.query(`SELECT indisvalid AS valid,indisready AS ready,pg_get_indexdef(indexrelid) AS definition
      FROM pg_index WHERE indrelid='shop_manager.customer_reminders'::regclass ORDER BY indexrelid::regclass::text`)
      ).rows;
      assert.deepEqual(
        indexes,
        evidence.indexes.indexes
          .filter((row) => row.table_name === "customer_reminders")
          .map(({ observed_at_utc: _time, table_name: _table, ...index }) => index),
      );
      for (const observed of evidence.integrity.functions) {
        const actual = (
          await db.query(
            `SELECT pg_get_userbyid(p.proowner) AS owner,l.lanname AS language,
        p.prosecdef,p.provolatile,p.proconfig,p.proacl::text AS acl,md5(pg_get_functiondef(p.oid)) AS definition_md5,
        md5(replace(p.prosrc,chr(13),'')) AS body_md5,has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
        has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
        has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute
        FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang WHERE p.oid=$1::regprocedure`,
            [observed.signature],
          )
        ).rows[0];
        const { observed_at_utc: _time, signature: _signature, ...expected } = observed;
        assert.deepEqual(actual, expected);
        if (observed.signature === "shop_manager.get_current_user_shop_id()") {
          const previous = evidence.helpers.helpers.find(
            (row) => row.signature === observed.signature,
          );
          assert.equal(actual.definition_md5, previous.definition_md5);
          assert.equal(actual.body_md5, previous.body_md5);
          assert.equal(actual.acl, previous.acl);
        }
      }
    });
  },
);

test(
  "historical broad policy admits other-shop/null-subject authenticated writes; actual block4 replaces that behavior",
  options,
  async () => {
    await withFixture(
      async (db) => {
        assert.equal((await policies(db))[0].name, "reminders_all_authenticated");
        await asActor(db, null, async () => {
          assert.equal(
            (await db.query("SELECT id FROM shop_manager.customer_reminders")).rows.length,
            3,
          );
          assert.equal(
            (await insertReminder(db, { shop: shopB, customer: customerB, vehicle: vehicleB }))
              .length,
            1,
          );
        });
        await db.exec(sql.policyRewrite);
        assert.deepEqual(await policies(db), current.policies);
        await asActor(db, null, async () => {
          assert.deepEqual(
            (await db.query("SELECT id FROM shop_manager.customer_reminders")).rows,
            [],
          );
          await assert.rejects(
            insertReminder(db, { id: uuid(501), shop: shopB, customer: customerB }),
            { code: "42501" },
          );
        });
      },
      { rewrite: false },
    );
  },
);

test(
  "rewritten policy permits own-shop CRUD for real non-bypass actors, independently of direct profile visibility",
  options,
  async () => {
    await withFixture(async (db) =>
      asActor(db, actorA, async () => {
        assert.deepEqual((await db.query("SELECT id FROM shop_manager.profiles")).rows, []);
        assert.equal(
          (await db.query("SELECT shop_manager.get_current_user_shop_id() AS shop")).rows[0].shop,
          shopA,
        );
        assert.deepEqual(
          (await db.query("SELECT id FROM shop_manager.customer_reminders ORDER BY id")).rows,
          [{ id: reminderA }, { id: secondReminderA }],
        );
        assert.equal((await insertReminder(db)).length, 1);
        assert.deepEqual(
          (
            await db.query(
              "UPDATE shop_manager.customer_reminders SET status='completed' WHERE id=$1 RETURNING id,status",
              [uuid(500)],
            )
          ).rows,
          [{ id: uuid(500), status: "completed" }],
        );
        assert.deepEqual(
          (
            await db.query("DELETE FROM shop_manager.customer_reminders WHERE id=$1 RETURNING id", [
              uuid(500),
            ])
          ).rows,
          [{ id: uuid(500) }],
        );
      }),
    );
  },
);

test(
  "other-shop inserts and moving an own row to another shop are rejected by current USING/WITH CHECK",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await allRows(db);
      await asActor(db, actorA, async () => {
        assert.deepEqual(
          (
            await db.query("SELECT id FROM shop_manager.customer_reminders WHERE id=$1", [
              reminderB,
            ])
          ).rows,
          [],
        );
        await assert.rejects(insertReminder(db, { shop: shopB, customer: customerB }), {
          code: "42501",
        });
        await assert.rejects(
          db.query(
            "UPDATE shop_manager.customer_reminders SET shop_id=$1 WHERE id=$2 RETURNING id",
            [shopB, reminderA],
          ),
          { code: "42501" },
        );
      });
      assert.deepEqual(await allRows(db), before);
    });
  },
);

test(
  "null/no-profile subjects fail closed; PUBLIC helper EXECUTE is distinct from anon reminder table access",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await allRows(db);
      for (const subject of [null, stranger])
        await asActor(db, subject, async () => {
          assert.equal(
            (await db.query("SELECT shop_manager.get_current_user_shop_id() AS shop")).rows[0].shop,
            null,
          );
          assert.deepEqual(
            (await db.query("SELECT id FROM shop_manager.customer_reminders")).rows,
            [],
          );
          await assert.rejects(insertReminder(db), { code: "42501" });
          assert.deepEqual(
            (
              await db.query(
                "UPDATE shop_manager.customer_reminders SET status='completed' WHERE id=$1 RETURNING id",
                [reminderA],
              )
            ).rows,
            [],
          );
          assert.deepEqual(
            (
              await db.query(
                "DELETE FROM shop_manager.customer_reminders WHERE id=$1 RETURNING id",
                [reminderA],
              )
            ).rows,
            [],
          );
        });
      await asActor(
        db,
        null,
        async () => {
          assert.equal(
            (await db.query("SELECT shop_manager.get_current_user_shop_id() AS shop")).rows[0].shop,
            null,
          );
          await assert.rejects(db.query("SELECT id FROM shop_manager.customer_reminders"), {
            code: "42501",
          });
        },
        "anon",
      );
      assert.deepEqual(await allRows(db), before);
    });
  },
);

test(
  "app-style insert omitting shop_id is rejected42501; no insert trigger/default populates shop or human identity",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await allRows(db);
      const payload = `INSERT INTO shop_manager.customer_reminders(customer_id,reminder_type,title,notes,due_date)
      VALUES($1,'follow_up','Synthetic app-style payload','','2026-10-22') RETURNING shop_id,created_by,assigned_to`;
      await asActor(
        db,
        actorA,
        async () => await assert.rejects(db.query(payload, [customerA]), { code: "42501" }),
      );
      assert.deepEqual(await allRows(db), before);
      assert.equal(
        (
          await db.query(`SELECT count(*)::int n FROM pg_trigger
      WHERE tgrelid='shop_manager.customer_reminders'::regclass AND (tgtype::int & 4)<>0`)
        ).rows[0].n,
        0,
      );
      // Privileged fixture setup only, not a proposed production repair or writer.
      assert.deepEqual((await db.query(payload, [customerA])).rows, [
        { shop_id: null, created_by: null, assigned_to: null },
      ]);
    });
  },
);

test(
  "own-shop reminders accept existing foreign customer/vehicle and spoofed creator/assignee under present constraints",
  options,
  async () => {
    await withFixture(async (db) =>
      asActor(db, actorA, async () => {
        // Visibility here is intentionally a synthetic supporting-table control.
        assert.deepEqual(
          (await db.query("SELECT id FROM shop_manager.customers WHERE id=$1", [customerB])).rows,
          [],
        );
        assert.deepEqual(
          (await db.query("SELECT id FROM shop_manager.vehicles WHERE id=$1", [vehicleB])).rows,
          [],
        );
        assert.deepEqual(
          await insertReminder(db, {
            customer: customerB,
            vehicle: vehicleB,
            assigned: actorB,
            creator: actorB,
          }),
          [
            {
              id: uuid(500),
              shop_id: shopA,
              customer_id: customerB,
              vehicle_id: vehicleB,
              assigned_to: actorB,
              created_by: actorB,
              status: "pending",
            },
          ],
        );
      }),
    );
  },
);

test(
  "own-shop reminders also accept nonexistent reference UUIDs: there is no physical FK or policy reference binding",
  options,
  async () => {
    await withFixture(async (db) =>
      asActor(db, actorA, async () => {
        const missing = uuid(9999);
        assert.deepEqual(
          (await db.query("SELECT id FROM shop_manager.customers WHERE id=$1", [missing])).rows,
          [],
        );
        assert.deepEqual(
          (await db.query("SELECT id FROM shop_manager.vehicles WHERE id=$1", [missing])).rows,
          [],
        );
        const rows = await insertReminder(db, {
          customer: missing,
          vehicle: missing,
          assigned: missing,
          creator: missing,
        });
        assert.equal(rows[0].customer_id, missing);
        assert.equal(rows[0].vehicle_id, missing);
        assert.equal(rows[0].created_by, missing);
        assert.equal(rows[0].assigned_to, missing);
      }),
    );
  },
);

test(
  "id-only wrong-shop UPDATE/DELETE return zero rows without an error or mutation, not confirmed application success",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await allRows(db);
      await asActor(db, actorA, async () => {
        for (const statement of [
          "UPDATE shop_manager.customer_reminders SET status='completed',completed_at=now() WHERE id=$1 RETURNING id",
          "DELETE FROM shop_manager.customer_reminders WHERE id=$1 RETURNING id",
        ])
          assert.deepEqual((await db.query(statement, [reminderB])).rows, []);
      });
      assert.deepEqual(await allRows(db), before);
      // No Supabase handler/toast is run. Callers must inspect affected rows; this
      // fixture does not prove that a live caller showed a false success message.
    });
  },
);

test(
  "same-shop id-only updates can change another customer's reminder; an explicit customer selector prevents that match",
  options,
  async () => {
    await withFixture(async (db) =>
      asActor(db, actorA, async () => {
        assert.deepEqual(
          (
            await db.query(
              `UPDATE shop_manager.customer_reminders SET status='completed'
      WHERE id=$1 AND customer_id=$2 RETURNING id`,
              [secondReminderA, customerA],
            )
          ).rows,
          [],
        );
        assert.deepEqual(
          (
            await db.query(
              `UPDATE shop_manager.customer_reminders SET status='completed'
      WHERE id=$1 RETURNING id,customer_id,status`,
              [secondReminderA],
            )
          ).rows,
          [{ id: secondReminderA, customer_id: secondCustomerA, status: "completed" }],
        );
      }),
    );
  },
);

test(
  "actual timestamp trigger overwrites supplied updated_at but does not establish creator/assignee or human actor attribution",
  options,
  async () => {
    await withFixture(async (db) =>
      asActor(db, actorA, async () => {
        const rows = (
          await db.query(
            `UPDATE shop_manager.customer_reminders
      SET notes='Synthetic update',updated_at='1900-01-01Z',created_by=$1,assigned_to=$1
      WHERE id=$2 RETURNING (updated_at=now()) AS touched,
      (created_at='2020-01-01Z'::timestamptz) AS created_preserved,created_by,assigned_to`,
            [actorB, reminderA],
          )
        ).rows;
        assert.deepEqual(rows, [
          { touched: true, created_preserved: true, created_by: actorB, assigned_to: actorB },
        ]);
      }),
    );
  },
);

test(
  "repeating only the conditional policy block preserves rows/columns/constraints/triggers/functions and never creates expense/storage objects",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await allRows(db);
      const beforePolicies = await policies(db);
      const fingerprint = async () =>
        (
          await db.query(`SELECT
      (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid='shop_manager.customer_reminders'::regclass) AS attributes,
      (SELECT jsonb_agg(pg_get_constraintdef(oid) ORDER BY conname) FROM pg_constraint WHERE conrelid='shop_manager.customer_reminders'::regclass) AS constraints,
      (SELECT jsonb_agg(pg_get_triggerdef(oid) ORDER BY tgname) FROM pg_trigger WHERE tgrelid='shop_manager.customer_reminders'::regclass) AS triggers,
      (SELECT jsonb_agg(jsonb_build_object('definition',md5(pg_get_functiondef(p.oid)),'acl',p.proacl::text) ORDER BY p.proname)
        FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='shop_manager') AS functions,
      to_regclass('shop_manager.expenses') AS expenses,to_regnamespace('storage') AS storage`)
        ).rows[0];
      const prior = await fingerprint();
      assert.equal(prior.expenses, null);
      assert.equal(prior.storage, null);
      await db.exec(sql.policyRewrite);
      await db.exec(sql.policyRewrite);
      assert.deepEqual(await allRows(db), before);
      assert.deepEqual(await policies(db), beforePolicies);
      assert.deepEqual(await fingerprint(), prior);
    });
  },
);
