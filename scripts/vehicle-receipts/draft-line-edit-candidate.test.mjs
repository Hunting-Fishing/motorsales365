// Always-closed memory SQL only. Owner/test.user/legacy helpers are synthetic,
// not JWT/session/native authority, independent-session or recovery acceptance.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  actor,
  ids,
  pins,
  parentPins,
  parentLimitations,
  selectedSources,
  snapshot,
  sourcePins,
  withDraftLineEditFixture,
} from "./draft-line-edit-fixture.mjs";

const sql = fs
  .readFileSync(new URL("./draft-line-edit-candidate.sql", import.meta.url), "utf8")
  .replaceAll("\r\n", "\n");
const sqlSha = "78c9eff2bfc62c2897be0e22a510d9a552dc1fa48a19cfb0822d610be3ca609b";
const lineId = (i) => `60000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
const selectedItem = lineId(101);
const ownerVehicle = "70000000-0000-4000-8000-000000000001";
const otherReceipt = "50000000-0000-4000-8000-000000000002";
const signature =
  "receipt_line_candidate.edit_draft_line(uuid,uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb)";
const one = async (db, query, args = []) => (await db.query(query, args)).rows[0];
const failure = (code) => (error) => {
  assert.equal(error.code, code);
  assert.equal(error.message, "Draft line operation failed.");
  assert.ok(!error.detail && !error.hint);
  return true;
};
const changes = (overrides = {}) => ({
  description: "  Corrected retained line101  ",
  category: "brakes",
  brand: "Synthetic 日本語",
  part_number: null,
  quantity: "2.0000000000000001",
  total: "0.125000",
  reviewed: true,
  ...overrides,
});
async function seed(db) {
  // No Auth signup or real original file/history data. The parent supplied only
  // synthetic Auth/profile/native/financial supports; their limitations remain.
  await db.query("UPDATE public.vehicle_receipts SET total=250.00000 WHERE id=$1", [ids.receipt]);
  await db.query(
    `INSERT INTO public.vehicle_receipt_items
    (id,receipt_id,description,category,brand,part_number,quantity,total,confidence,reviewed,
     installed_on,installed_by,installation_origin,odometer_km,public_summary_allowed,sort_order)
    SELECT ('60000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,$1,
      '  Retained line'||n::text||'  ','misc',NULL,'  raw-part  ',
      1.23456789012345678900,0.00000000000012300000,0.123456789012345678900,false,
      CASE WHEN n=109 THEN DATE '2026-10-02' END,CASE WHEN n=109 THEN $2::uuid END,
      CASE WHEN n=109 THEN 'customer_entered' END,CASE WHEN n=109 THEN 102 END,
      n%2=1,CASE WHEN n%5=0 THEN -5 ELSE n%7 END
    FROM generate_series(1,150) n`,
    [ids.receipt, ids.manager],
  );
}
async function fixture(run) {
  return withDraftLineEditFixture(async (db) => {
    await db.exec(sql);
    await seed(db);
    await run(db);
  });
}
async function state(db) {
  return {
    base: await snapshot(db),
    candidateSchemas: (
      await db.query(`SELECT nspname,pg_get_userbyid(nspowner) AS owner,nspacl::text
      FROM pg_namespace WHERE nspname='receipt_line_candidate' ORDER BY nspname`)
    ).rows,
    candidateFunctions: (
      await db.query(`SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS args,
      pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.proconfig,p.proacl::text,pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='receipt_line_candidate' ORDER BY p.proname`)
    ).rows,
    defaultAcl: (
      await db.query(
        "SELECT defaclrole::regrole::text AS owner,defaclnamespace::regnamespace::text AS namespace,defaclobjtype,defaclacl::text FROM pg_default_acl ORDER BY defaclrole,defaclnamespace,defaclobjtype",
      )
    ).rows,
  };
}
async function intent(db, overrides = {}) {
  const observed = await one(
    db,
    `SELECT
    (SELECT to_jsonb(r)||jsonb_build_object('total',r.total::text)
      FROM public.vehicle_receipts r WHERE id=$1) AS receipt,
    (SELECT to_jsonb(i)||jsonb_build_object('quantity',i.quantity::text,'total',i.total::text,
      'confidence',i.confidence::text,'odometer_km',i.odometer_km::text,'sort_order',i.sort_order::text)
      FROM public.vehicle_receipt_items i WHERE id=$2) AS item`,
    [ids.receipt, selectedItem],
  );
  return {
    account: ids.manager,
    receipt: ids.receipt,
    item: selectedItem,
    vehicle: null,
    shopVehicle: ids.vehicle,
    shop: ids.shop,
    expectedReceipt: observed.receipt,
    expectedItem: observed.item,
    changes: changes(),
    ...overrides,
  };
}
async function invoke(db, value, subject = ids.manager) {
  await db.exec("SAVEPOINT draft_line_attempt");
  try {
    await db.query("SELECT set_config('test.user',$1,true)", [subject ?? ""]);
    const result = await one(
      db,
      `SELECT receipt_line_candidate.edit_draft_line(
      $1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,$7::jsonb,$8::jsonb,$9::jsonb) AS ack`,
      [
        value.account,
        value.receipt,
        value.item,
        value.vehicle,
        value.shopVehicle,
        value.shop,
        JSON.stringify(value.expectedReceipt),
        JSON.stringify(value.expectedItem),
        JSON.stringify(value.changes),
      ],
    );
    await db.exec("RELEASE SAVEPOINT draft_line_attempt");
    return result.ack;
  } catch (error) {
    await db.exec("ROLLBACK TO SAVEPOINT draft_line_attempt; RELEASE SAVEPOINT draft_line_attempt");
    throw error;
  }
}
async function unchangedFailure(db, value, code, subject = ids.manager) {
  const before = await state(db);
  await assert.rejects(invoke(db, value, subject), failure(code));
  assert.deepEqual(await state(db), before);
}

test("pinned private one-item UPDATE, retained source constraints and explicit non-acceptance boundaries", () => {
  assert.equal(createHash("sha256").update(sql).digest("hex"), sqlSha);
  assert.equal(pins.length, 7);
  assert.equal(parentPins.length, 22);
  assert.equal(
    sourcePins.parentFixture.sha256,
    "98db65cfe826651d234367e9fae9c3222a294010d99bbd8a6876fc880fc6d2d1",
  );
  for (const section of selectedSources)
    assert.equal(createHash("sha256").update(section.sql).digest("hex"), section.sha256);
  assert.ok(parentLimitations.some((value) => value.includes("Synthetic auth.uid")));
  assert.match(sql, /SECURITY INVOKER SET search_path = pg_catalog, pg_temp/);
  assert.match(sql, /WHERE i.id=p_item AND i.receipt_id=p_receipt RETURNING/);
  assert.match(
    sql,
    /FOR UPDATE;[\s\S]*FROM shop_manager.customers[\s\S]*FOR UPDATE;[\s\S]*FROM shop_manager.vehicles[\s\S]*FOR UPDATE;/,
  );
  assert.doesNotMatch(
    sql,
    /SECURITY DEFINER|CREATE OR REPLACE|GRANT\s+(?:ALL|EXECUTE|USAGE|UPDATE)/i,
  );
  assert.doesNotMatch(
    sql,
    /\b(?:INSERT INTO|DELETE FROM|TRUNCATE|UPDATE public.vehicle_receipts\b|PERFORM\s+vehicle_receipts_private)/i,
  );
  assert.match(sql, /NOT an ABA epoch/);
  assert.match(sql, /all-writer\/expense-phantom\/current-catalog/);
});

test("ordinary roles cannot execute the candidate; no privileged happy client is manufactured", async () => {
  await fixture(async (db) => {
    for (const role of ["anon", "authenticated", "service_role"]) {
      assert.deepEqual(
        await one(
          db,
          `SELECT has_schema_privilege($1,'receipt_line_candidate','USAGE') AS usage,
        has_function_privilege($1,$2,'EXECUTE') AS execute`,
          [role, signature],
        ),
        { usage: false, execute: false },
      );
      await assert.rejects(
        actor(
          db,
          role,
          ids.manager,
          `SELECT receipt_line_candidate.edit_draft_line(
        NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL)`,
        ),
        (error) => error.code === "42501",
      );
    }
    assert.equal(
      (
        await one(
          db,
          "SELECT has_table_privilege('authenticated','public.vehicle_receipt_items','UPDATE') AS allowed",
        )
      ).allowed,
      false,
    );
    assert.equal(
      (await one(db, "SELECT prosecdef FROM pg_proc WHERE oid=$1::regprocedure", [signature]))
        .prosecdef,
      false,
    );
  });
});

test("committed memory edit of line101 preserves all150 IDs, siblings, complete header and selected immutable fields", async () => {
  await fixture(async (db) => {
    const before = await state(db);
    const request = await intent(db);
    assert.equal(before.base.data["public.vehicle_receipt_items"].length, 150);
    assert.equal(request.expectedItem.quantity, "1.23456789012345678900");
    assert.equal(request.expectedItem.public_summary_allowed, true);
    await db.exec("BEGIN");
    const ack = await invoke(db, request);
    await db.exec("COMMIT");
    assert.deepEqual(ack, {
      version: 1,
      kind: "draftLineUpdate",
      accountId: ids.manager,
      receiptId: ids.receipt,
      itemId: selectedItem,
      selectedVehicleId: null,
      selectedShopVehicleId: ids.vehicle,
      selectedShopId: ids.shop,
      receipt: request.expectedReceipt,
      before: request.expectedItem,
      after: { ...request.expectedItem, ...request.changes },
    });
    const after = await state(db);
    const expected = structuredClone(before);
    expected.base.data["public.vehicle_receipt_items"] = expected.base.data[
      "public.vehicle_receipt_items"
    ].map((row) => (row.id === selectedItem ? { ...row, ...request.changes } : row));
    assert.deepEqual(after, expected);
    assert.deepEqual(
      after.base.data["public.vehicle_receipt_items"].find((row) => row.id === lineId(109)),
      before.base.data["public.vehicle_receipt_items"].find((row) => row.id === lineId(109)),
    );
    // A lost reply cannot be blindly retried as success. No durable operation
    // receipt is implemented; stale prior-row CAS refuses the second attempt.
    await db.exec("BEGIN");
    await unchangedFailure(db, request, "40001");
    await db.exec("ROLLBACK");
  });
});

test("isolated refusal, exact prior-state and late rollback cohorts share one unchanged retained graph", async (t) => {
  await fixture(async (db) => {
    const baseline = await state(db);
    async function isolated(name, run) {
      await t.test(name, async () => {
        await db.exec("BEGIN");
        try {
          await run();
        } finally {
          await db.exec("ROLLBACK");
        }
        assert.deepEqual(await state(db), baseline);
      });
    }
    await isolated(
      "wrong account, missing subject, genuine legacy access loss and wrong selected shop deny",
      async () => {
        await unchangedFailure(db, await intent(db, { account: ids.stranger }), "42501");
        await unchangedFailure(db, await intent(db), "42501", null);
        await unchangedFailure(
          db,
          await intent(db, { account: ids.stranger }),
          "42501",
          ids.stranger,
        );
        await unchangedFailure(db, await intent(db, { shop: ids.otherShop }), "42501");
      },
    );
    await isolated(
      "wrong receipt/item/selected target and ambiguous target tuples deny",
      async () => {
        for (const override of [
          { receipt: ids.absent },
          { item: ids.absent },
          { shopVehicle: ids.absent },
        ])
          await unchangedFailure(db, await intent(db, override), "42501");
        for (const override of [
          { vehicle: ownerVehicle },
          { shopVehicle: null },
          { shop: null },
          { vehicle: ownerVehicle, shopVehicle: null },
        ])
          await unchangedFailure(db, await intent(db, override), "22023");
        await db.query(
          "INSERT INTO public.vehicle_receipts(id,shop_vehicle_id,created_by) VALUES($1,$2,$3)",
          [otherReceipt, ids.vehicle, ids.manager],
        );
        await db.query("UPDATE public.vehicle_receipt_items SET receipt_id=$1 WHERE id=$2", [
          otherReceipt,
          selectedItem,
        ]);
        await unchangedFailure(db, await intent(db), "42501");
      },
    );
    await isolated(
      "full receipt CAS binds both stored targets and all header fields, not only updated_at",
      async () => {
        const request = await intent(db);
        await db.query(
          "UPDATE public.vehicle_receipts SET vendor='Changed without timestamp' WHERE id=$1",
          [ids.receipt],
        );
        await unchangedFailure(db, request, "40001");
        await db.query("INSERT INTO public.vehicles(id,owner_user_id) VALUES($1,$2)", [
          ownerVehicle,
          ids.manager,
        ]);
        const next = await intent(db);
        await db.query("UPDATE public.vehicle_receipts SET vehicle_id=$1 WHERE id=$2", [
          ownerVehicle,
          ids.receipt,
        ]);
        await unchangedFailure(db, next, "40001");
      },
    );
    await isolated(
      "dual stored targets and noncreator shop access preserve the other binding",
      async () => {
        await db.query("INSERT INTO public.vehicles(id,owner_user_id) VALUES($1,$2)", [
          ownerVehicle,
          ids.manager,
        ]);
        await db.query(
          "UPDATE public.vehicle_receipts SET vehicle_id=$1,created_by=$2 WHERE id=$3",
          [ownerVehicle, ids.stranger, ids.receipt],
        );
        const request = await intent(db);
        const ack = await invoke(db, request);
        assert.equal(ack.receipt.vehicle_id, ownerVehicle);
        assert.equal(ack.receipt.created_by, ids.stranger);
        assert.deepEqual(ack.after, { ...request.expectedItem, ...request.changes });
      },
    );
    await isolated(
      "selected owner-vehicle path is bound independently, not inferred from receipt creator",
      async () => {
        await db.query("INSERT INTO public.vehicles(id,owner_user_id) VALUES($1,$2)", [
          ownerVehicle,
          ids.manager,
        ]);
        await db.query("UPDATE public.vehicle_receipts SET vehicle_id=$1 WHERE id=$2", [
          ownerVehicle,
          ids.receipt,
        ]);
        const request = await intent(db, { vehicle: ownerVehicle, shopVehicle: null, shop: null });
        const ack = await invoke(db, request);
        assert.equal(ack.selectedVehicleId, ownerVehicle);
        assert.equal(ack.receipt.shop_vehicle_id, ids.vehicle);
        const current = await intent(db, { vehicle: ownerVehicle, shopVehicle: null, shop: null });
        await db.query("UPDATE public.vehicles SET owner_user_id=$1 WHERE id=$2", [
          ids.stranger,
          ownerVehicle,
        ]);
        await unchangedFailure(db, current, "42501");
      },
    );
    await isolated(
      "full item CAS preserves exact decimal scale and every protected value",
      async () => {
        const request = await intent(db);
        const rounded = structuredClone(request);
        rounded.expectedItem.quantity = "1.234567890123456789";
        await unchangedFailure(db, rounded, "40001");
        for (const field of ["description", "public_summary_allowed", "sort_order", "confidence"]) {
          const changed = structuredClone(request);
          changed.expectedItem[field] = field === "public_summary_allowed" ? false : "changed";
          await unchangedFailure(db, changed, "40001");
        }
        const missing = structuredClone(request);
        delete missing.expectedItem.installed_by;
        await unchangedFailure(db, missing, "40001");
      },
    );
    await isolated(
      "confirmed and each installation metadata field refuse fresh rather than stale witnesses",
      async () => {
        await db.query("UPDATE public.vehicle_receipts SET status='confirmed' WHERE id=$1", [
          ids.receipt,
        ]);
        await unchangedFailure(db, await intent(db), "42501");
        await db.query("UPDATE public.vehicle_receipts SET status='draft' WHERE id=$1", [
          ids.receipt,
        ]);
        for (const assignment of [
          "installed_on=DATE '2026-10-02'",
          `installed_by='${ids.manager}'::uuid`,
          "installation_origin='business_attested'",
          "odometer_km=0",
        ]) {
          await db.query(`UPDATE public.vehicle_receipt_items SET ${assignment} WHERE id=$1`, [
            selectedItem,
          ]);
          await unchangedFailure(db, await intent(db), "42501");
          await db.query(
            "UPDATE public.vehicle_receipt_items SET installed_on=NULL,installed_by=NULL,installation_origin=NULL,odometer_km=NULL WHERE id=$1",
            [selectedItem],
          );
        }
      },
    );
    await isolated(
      "retained confirmed posting then synthetic draft corruption refuses without financial changes",
      async () => {
        // The real retained expense guard correctly forbids posting a draft.
        // Create a valid confirmed posting first, then privileged fixture-only
        // corruption returns its parent to draft; no app reversal is implied.
        await db.query("UPDATE public.vehicle_receipts SET status='confirmed' WHERE id=$1", [
          ids.receipt,
        ]);
        await db.query(
          `INSERT INTO shop_manager.expenses(shop_id,vehicle_id,vehicle_receipt_id,amount,expense_date,description,created_by,status)
        VALUES($1,$2,$3,250,DATE '2026-10-01','Synthetic linked draft',$4,'recorded')`,
          [ids.shop, ids.vehicle, ids.receipt, ids.manager],
        );
        await db.query("UPDATE public.vehicle_receipts SET status='draft' WHERE id=$1", [
          ids.receipt,
        ]);
        assert.equal(
          (await one(db, "SELECT count(*)::int AS n FROM shop_manager.journal_entries")).n,
          1,
        );
        await unchangedFailure(db, await intent(db), "42501");
      },
    );
    await isolated(
      "NULL legacy access is a denial, never a successful unknown predicate",
      async () => {
        await db.exec(`CREATE OR REPLACE FUNCTION vehicle_receipts_private.receipt_access(_id uuid,_write boolean DEFAULT false)
        RETURNS boolean LANGUAGE sql STABLE AS $$SELECT NULL::boolean$$;`);
        await unchangedFailure(db, await intent(db), "42501");
      },
    );
    await isolated(
      "strict writable keys refuse protected field, missing key, wrong type and decimal normalization",
      async () => {
        for (const value of [
          { ...changes(), confidence: "1" },
          { ...changes(), reviewed: "true" },
          { ...changes(), quantity: 2 },
          { ...changes(), quantity: "01" },
          { ...changes(), total: "1e2" },
          { ...changes(), total: "NaN" },
          { ...changes(), total: "-1" },
          { ...changes(), total: "1." },
          { ...changes(), total: "0." + "0".repeat(512) },
          { ...changes(), description: null },
          { ...changes(), category: false },
        ])
          await unchangedFailure(db, await intent(db, { changes: value }), "22023");
        const missing = changes();
        delete missing.brand;
        await unchangedFailure(db, await intent(db, { changes: missing }), "22023");
        for (const override of [
          { changes: null },
          { expectedItem: null },
          { expectedReceipt: null },
        ])
          await unchangedFailure(db, await intent(db, override), "22023");
      },
    );
    await isolated(
      "native retained CHECK failures roll back the statement without sibling/header/financial loss",
      async () => {
        for (const value of [
          changes({ quantity: "0" }),
          changes({ quantity: "100000" }),
          changes({ total: "100000000" }),
          changes({ category: "invented" }),
          changes({ description: "   " }),
          changes({ brand: "x".repeat(121) }),
        ])
          await unchangedFailure(db, await intent(db, { changes: value }), "23514");
      },
    );
    await isolated(
      "nullable native money and exact no-op return only observed statement state",
      async () => {
        const request = await intent(db, {
          changes: changes({ quantity: null, total: null, brand: null, category: null }),
        });
        const ack = await invoke(db, request);
        assert.equal(ack.after.quantity, null);
        assert.equal(ack.after.total, null);
        const current = await intent(db);
        current.changes = Object.fromEntries(
          Object.keys(changes()).map((key) => [key, current.expectedItem[key]]),
        );
        const before = await state(db);
        const noop = await invoke(db, current);
        assert.deepEqual(noop.before, noop.after);
        const after = await state(db);
        assert.deepEqual(after, before);
      },
    );
    await isolated(
      "BEFORE suppression and retained protected-field rewrite cannot fabricate success",
      async () => {
        await db.exec(`CREATE FUNCTION receipt_line_candidate.synthetic_fault() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RETURN NULL; END$$;
        CREATE TRIGGER synthetic_fault BEFORE UPDATE ON public.vehicle_receipt_items FOR EACH ROW
        EXECUTE FUNCTION receipt_line_candidate.synthetic_fault();`);
        await unchangedFailure(db, await intent(db), "55000");
        await db.exec(`CREATE OR REPLACE FUNCTION receipt_line_candidate.synthetic_fault() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN NEW.confidence:=0.9; RETURN NEW; END$$;`);
        await unchangedFailure(db, await intent(db), "55000");
      },
    );
    await isolated(
      "AFTER target/header/selected-shop rewrites are reread, refused and fully rolled back",
      async () => {
        await db.exec(`CREATE FUNCTION receipt_line_candidate.synthetic_after() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF pg_trigger_depth()=1 THEN UPDATE public.vehicle_receipt_items SET confidence=0.9 WHERE id=NEW.id; END IF;
        RETURN NEW; END$$;
        CREATE TRIGGER synthetic_after AFTER UPDATE ON public.vehicle_receipt_items FOR EACH ROW
        EXECUTE FUNCTION receipt_line_candidate.synthetic_after();`);
        await unchangedFailure(db, await intent(db), "55000");
        await db.exec(`CREATE OR REPLACE FUNCTION receipt_line_candidate.synthetic_after() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN UPDATE public.vehicle_receipts SET share_with_shop=true WHERE id=NEW.receipt_id; RETURN NEW; END$$;`);
        await unchangedFailure(db, await intent(db), "55000");
        await db.exec(`CREATE OR REPLACE FUNCTION receipt_line_candidate.synthetic_after() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN UPDATE shop_manager.customers SET shop_id='${ids.otherShop}'::uuid WHERE id='${ids.customer}'::uuid; RETURN NEW; END$$;`);
        await unchangedFailure(db, await intent(db), "55000");
      },
    );
    await isolated(
      "outer rollback after a returned acknowledgment restores every selected row/catalog facet",
      async () => {
        const request = await intent(db);
        const ack = await invoke(db, request);
        assert.deepEqual(ack.after, { ...request.expectedItem, ...request.changes });
        assert.notDeepEqual(
          (await state(db)).base.data["public.vehicle_receipt_items"],
          baseline.base.data["public.vehicle_receipt_items"],
        );
        // isolated() performs the outer rollback and exact selected-state equality.
      },
    );
  });
});

test("unexpected default grantee and existing schema collision fail publication without partial installation", async () => {
  await withDraftLineEditFixture(async (db) => {
    await db.exec("CREATE ROLE unexpected_candidate_grantee NOLOGIN;");
    for (const [privilege, objectType] of [
      ["EXECUTE", "FUNCTIONS"],
      ["USAGE", "SCHEMAS"],
    ]) {
      await db.exec(
        `ALTER DEFAULT PRIVILEGES GRANT ${privilege} ON ${objectType} TO unexpected_candidate_grantee;`,
      );
      const before = await state(db);
      await assert.rejects(
        db.exec(sql),
        (error) =>
          error.code === "55000" && error.message === "Draft line candidate publication failed.",
      );
      await db.exec("ROLLBACK");
      assert.equal(
        (
          await one(
            db,
            "SELECT count(*)::int AS n FROM pg_namespace WHERE nspname='receipt_line_candidate'",
          )
        ).n,
        0,
      );
      assert.deepEqual(await state(db), before);
      await db.exec(
        `ALTER DEFAULT PRIVILEGES REVOKE ${privilege} ON ${objectType} FROM unexpected_candidate_grantee;`,
      );
    }
    await db.exec("CREATE SCHEMA receipt_line_candidate;");
    const collision = await state(db);
    await assert.rejects(db.exec(sql), (error) => error.code === "42P06");
    await db.exec("ROLLBACK");
    assert.equal(
      (
        await one(
          db,
          "SELECT count(*)::int AS n FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='receipt_line_candidate'",
        )
      ).n,
      0,
    );
    assert.deepEqual(await state(db), collision);
  });
});
