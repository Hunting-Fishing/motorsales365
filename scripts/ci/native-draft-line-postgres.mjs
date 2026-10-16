// No entrypoint, transport or admission bypass. Only the existing admitted
// CI-only native driver supplies scoped sessions and observed lock barriers.
// Owner + test.user is synthetic. No API/Auth/Storage/durable-retry acceptance.
import assert from "node:assert/strict";
import { buildDraftLineNativeSource } from "../vehicle-receipts/draft-line-native-source.mjs";

export const DRAFT_LINE_STAGES = Object.freeze([
  "draft-line-setup",
  "draft-line-acl",
  "draft-line-outer",
  "draft-line-cas",
  "draft-line-parent",
  "draft-line-customer",
  "draft-line-vehicle",
  "draft-line-item",
  "draft-line-late",
]);
export const DRAFT_LINE_PASSES = Object.freeze([
  "draft line locked ordinary roles; synthetic owner only",
  "draft line outer COMMIT visibility and ROLLBACK preserve selected graph",
  "draft line observed wait rejects stale full item CAS",
  "draft line parent status drift after observed wait denied",
  "draft line customer shop drift after observed wait denied",
  "draft line vehicle customer drift after observed wait denied",
  "draft line install drift after observed item wait denied",
  "draft line native CHECK and late rewrite roll back all selected rows",
]);
const literal = (value) => (value === null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`);
const single = (lines) => {
  assert.equal(lines.length, 1);
  return lines[0];
};
const uuid = (group, number) => `${group}000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const json = (value) => {
  const bytes = JSON.stringify(value);
  assert.equal(typeof bytes, "string");
  assert.ok(Buffer.byteLength(bytes) <= 65536);
  return `convert_from(decode('${Buffer.from(bytes, "utf8").toString("hex")}','hex'),'UTF8')::jsonb`;
};
export function invokeDraftLineSQL(value) {
  const args = [
    value.account,
    value.receipt,
    value.item,
    value.vehicle,
    value.shopVehicle,
    value.shop,
  ];
  for (const id of args)
    assert.ok(
      id === null || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id),
    );
  return `SELECT receipt_line_candidate.edit_draft_line(${args.map((id) => literal(id) + "::uuid").join(",")},${json(value.expectedReceipt)},${json(value.expectedItem)},${json(value.changes)});`;
}
const itemJSON = (alias) =>
  `to_jsonb(${alias})||jsonb_build_object('quantity',${alias}.quantity::text,'total',${alias}.total::text,'confidence',${alias}.confidence::text,'odometer_km',${alias}.odometer_km::text,'sort_order',${alias}.sort_order::text)`;
// SQL-side hashing keeps all150 full rows below the existing cumulative output
// bound. Exact NUMERIC values become text first. This is equality, not a backup
// or immutable concurrent snapshot; arbitrary other writers remain unaccepted.
export const DRAFT_SNAPSHOT_SQL = `SELECT encode(sha256(convert_to(jsonb_build_object(
 'items',(SELECT coalesce(jsonb_agg(${itemJSON("t")} ORDER BY t.id),'[]'::jsonb) FROM public.vehicle_receipt_items t),
 'links',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.shop_vehicle_id),'[]'::jsonb) FROM public.vehicle_shop_links t),
 'users',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id),'[]'::jsonb) FROM auth.users t),
 'vehicles',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id),'[]'::jsonb) FROM public.vehicles t),
 'schemas',(SELECT jsonb_agg(jsonb_build_object('name',nspname,'owner',pg_get_userbyid(nspowner),'acl',nspacl::text) ORDER BY nspname) FROM pg_namespace WHERE nspname IN('receipt_line_candidate','public','shop_manager')),
 'tables',(SELECT jsonb_agg(jsonb_build_object('name',c.relname,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force',c.relforcerowsecurity,'acl',c.relacl::text) ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN('vehicle_receipts','vehicle_receipt_items','vehicle_shop_links','vehicles')),
 'functions',(SELECT jsonb_agg(jsonb_build_object('definition',pg_get_functiondef(p.oid),'acl',p.proacl::text,'owner',pg_get_userbyid(p.proowner)) ORDER BY p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='receipt_line_candidate'),
 'defaults',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.oid),'[]'::jsonb) FROM pg_default_acl t)
 )::text,'UTF8')),'hex');`;
const queryOne = async (session, sql) => JSON.parse(single(await session.command(sql)));

export async function rehearseDraftLine({
  observer,
  withSessions,
  observedBlock,
  expectedError,
  financialSnapshotSQL,
  setStage,
  pass,
}) {
  setStage("draft-line-setup");
  const source = buildDraftLineNativeSource();
  assert.equal(source.additionalStatements.length, 7);
  for (const statement of source.additionalStatements) await observer.command(statement);
  await observer.command(source.candidateSQL);
  const ids = source.ids;
  const otherCustomer = uuid("73", 1);
  await observer.command(
    `INSERT INTO shop_manager.customers(id,shop_id) VALUES(${literal(otherCustomer)},${literal(ids.shop)});`,
  );
  const snapshot = async (session = observer) => {
    const financial = single(await session.command(financialSnapshotSQL));
    const draft = single(await session.command(DRAFT_SNAPSHOT_SQL));
    assert.match(financial, /^[0-9a-f]{64}$/);
    assert.match(draft, /^[0-9a-f]{64}$/);
    return financial + draft;
  };
  let sequence = 0;
  async function seed(publicTarget = false) {
    const ordinal = ++sequence,
      receipt = uuid("71", ordinal),
      item = uuid("72", ordinal * 1000 + 101);
    const vehicle = publicTarget ? uuid("74", ordinal) : null;
    if (vehicle !== null)
      await observer.command(
        `INSERT INTO public.vehicles(id,owner_user_id) VALUES(${literal(vehicle)},${literal(ids.manager)});`,
      );
    await observer.command(`INSERT INTO public.vehicle_receipts(id,vehicle_id,shop_vehicle_id,created_by,vendor,purchased_on,currency,total,status)
      VALUES(${literal(receipt)},${literal(vehicle)},${literal(publicTarget ? null : ids.vehicle)},${literal(ids.manager)},'Synthetic native draft','2026-10-01','PHP',250.00000,'draft');`);
    await observer.command(`INSERT INTO public.vehicle_receipt_items
      (id,receipt_id,description,category,brand,part_number,quantity,total,confidence,reviewed,installed_on,installed_by,installation_origin,odometer_km,public_summary_allowed,sort_order)
      SELECT ('72000000-0000-4000-8000-'||lpad((${ordinal * 1000}+n)::text,12,'0'))::uuid,${literal(receipt)},
        '  Retained line'||n::text||'  ','misc',NULL,'  raw-part  ',1.23456789012345678900,0.00000000000012300000,0.123456789012345678900,false,
        CASE WHEN n=109 THEN DATE '2026-10-02' END,CASE WHEN n=109 THEN ${literal(ids.manager)}::uuid END,
        CASE WHEN n=109 THEN 'customer_entered' END,CASE WHEN n=109 THEN 102 END,n%2=1,CASE WHEN n%5=0 THEN -5 ELSE n%7 END
      FROM generate_series(1,150) n;`);
    const observed = await queryOne(
      observer,
      `SELECT json_build_object(
      'receipt',(SELECT to_jsonb(r)||jsonb_build_object('total',r.total::text) FROM public.vehicle_receipts r WHERE id=${literal(receipt)}),
      'item',(SELECT ${itemJSON("i")} FROM public.vehicle_receipt_items i WHERE id=${literal(item)}));`,
    );
    assert.equal(observed.item.id, item);
    assert.equal(observed.receipt.id, receipt);
    return {
      account: ids.manager,
      receipt,
      item,
      vehicle,
      shopVehicle: publicTarget ? null : ids.vehicle,
      shop: publicTarget ? null : ids.shop,
      expectedReceipt: observed.receipt,
      expectedItem: observed.item,
      changes: {
        description: "  Corrected retained line101  ",
        category: "brakes",
        brand: "Synthetic 日本語",
        part_number: null,
        quantity: "2.0000000000000001",
        total: "0.125000",
        reviewed: true,
      },
    };
  }
  async function siblings(value, session = observer) {
    return queryOne(
      session,
      `SELECT json_build_object('count',count(*)::text,
      'ids',encode(sha256(convert_to(string_agg(id::text,',' ORDER BY id),'UTF8')),'hex'),
      'siblings',encode(sha256(convert_to(coalesce(jsonb_agg(${itemJSON("i")} ORDER BY id) FILTER(WHERE id<>${literal(value.item)}),'[]'::jsonb)::text,'UTF8')),'hex'))
      FROM public.vehicle_receipt_items i WHERE receipt_id=${literal(value.receipt)};`,
    );
  }
  async function result(owner, value) {
    const ack = await queryOne(owner, invokeDraftLineSQL(value));
    assert.deepEqual(ack, {
      version: 1,
      kind: "draftLineUpdate",
      accountId: value.account,
      receiptId: value.receipt,
      itemId: value.item,
      selectedVehicleId: value.vehicle,
      selectedShopVehicleId: value.shopVehicle,
      selectedShopId: value.shop,
      receipt: value.expectedReceipt,
      before: value.expectedItem,
      after: { ...value.expectedItem, ...value.changes },
    });
    return ack;
  }
  async function waitDrift(value, lockSQL, driftSQL, code) {
    await withSessions([null, ids.manager], async (locker, owner) => {
      await locker.command(`BEGIN; ${lockSQL}`);
      const pending = expectedError(owner.command(invokeDraftLineSQL(value)), code);
      await observedBlock(observer, owner, locker);
      await locker.command(`${driftSQL} COMMIT;`);
      const committedDrift = await snapshot();
      await pending;
      assert.equal(
        await snapshot(),
        committedDrift,
        "candidate leaves the legitimate locker writes unchanged",
      );
    });
  }

  setStage("draft-line-acl");
  const acl = await queryOne(
    observer,
    `SELECT json_build_object(
    'functions',(SELECT count(*)::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='receipt_line_candidate'),
    'definer',(SELECT count(*)::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='receipt_line_candidate' AND p.prosecdef),
    'allowed',(SELECT count(*)::text FROM pg_roles r WHERE r.rolname IN('anon','authenticated','service_role') AND
       (has_schema_privilege(r.oid,'receipt_line_candidate','USAGE') OR has_function_privilege(r.oid,${literal(source.signature)},'EXECUTE'))),
    'clientUpdate',has_table_privilege('authenticated','public.vehicle_receipt_items','UPDATE'),
    'owner',(SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='receipt_line_candidate'),
    'path',(SELECT proconfig FROM pg_proc WHERE oid=${literal(source.signature)}::regprocedure));`,
  );
  assert.deepEqual(acl, {
    functions: "1",
    definer: "0",
    allowed: "0",
    clientUpdate: false,
    owner: "postgres",
    path: ["search_path=pg_catalog, pg_temp"],
  });
  for (const role of ["anon", "authenticated", "service_role"])
    await withSessions([null], async (denied) => {
      await expectedError(
        denied.command(
          `SET ROLE ${role}; SELECT receipt_line_candidate.edit_draft_line(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);`,
        ),
        "42501",
      );
    });
  pass(DRAFT_LINE_PASSES[0]);

  setStage("draft-line-outer");
  for (const publicTarget of [false, true]) {
    const value = await seed(publicTarget),
      before = await snapshot(),
      untouched = await siblings(value);
    assert.equal(untouched.count, "150");
    await withSessions([ids.manager, null], async (owner, competitor) => {
      await owner.command("BEGIN;");
      await result(owner, value);
      assert.equal(await snapshot(), before, "ack is not outer commit");
      await owner.command("ROLLBACK;");
      assert.equal(await snapshot(), before);
      await owner.command("BEGIN;");
      await result(owner, value);
      const saved = await snapshot(owner);
      assert.equal(
        saved.slice(0, 64),
        before.slice(0, 64),
        "selected header/financial/native support rows do not change",
      );
      assert.equal(await snapshot(), before);
      const pending = competitor.command(
        `BEGIN; SELECT id FROM public.vehicle_receipts WHERE id=${literal(value.receipt)} FOR UPDATE;`,
      );
      pending.catch(() => {});
      await observedBlock(observer, competitor, owner);
      await owner.command("COMMIT;");
      await pending;
      await competitor.command("ROLLBACK;");
      assert.equal(await snapshot(), saved);
      assert.deepEqual(
        await siblings(value),
        untouched,
        "all150 IDs and149 exact siblings preserved",
      );
    });
  }
  pass(DRAFT_LINE_PASSES[1]);

  setStage("draft-line-cas");
  {
    const value = await seed(),
      untouched = await siblings(value),
      financialBefore = (await snapshot()).slice(0, 64);
    await withSessions([ids.manager, ids.manager], async (first, second) => {
      await first.command("BEGIN;");
      await result(first, value);
      const saved = await snapshot(first);
      assert.equal(
        saved.slice(0, 64),
        financialBefore,
        "item edit does not mutate selected financial/header rows",
      );
      const pending = expectedError(second.command(invokeDraftLineSQL(value)), "40001");
      await observedBlock(observer, second, first);
      await first.command("COMMIT;");
      await pending;
      assert.equal(await snapshot(), saved);
      assert.deepEqual(await siblings(value), untouched);
    });
  }
  pass(DRAFT_LINE_PASSES[2]);

  setStage("draft-line-parent");
  {
    const value = await seed();
    await waitDrift(
      value,
      `SELECT id FROM public.vehicle_receipts WHERE id=${literal(value.receipt)} FOR UPDATE;`,
      `UPDATE public.vehicle_receipts SET status='confirmed' WHERE id=${literal(value.receipt)};`,
      "42501",
    );
  }
  pass(DRAFT_LINE_PASSES[3]);
  setStage("draft-line-customer");
  {
    const value = await seed();
    await waitDrift(
      value,
      `SELECT id FROM shop_manager.customers WHERE id=${literal(ids.customer)} FOR UPDATE;`,
      `UPDATE shop_manager.customers SET shop_id=${literal(ids.otherShop)} WHERE id=${literal(ids.customer)};
       UPDATE shop_manager.profiles SET shop_id=${literal(ids.otherShop)} WHERE id=${literal(ids.manager)};`,
      "42501",
    );
    await observer.command(`UPDATE shop_manager.customers SET shop_id=${literal(ids.shop)} WHERE id=${literal(ids.customer)};
      UPDATE shop_manager.profiles SET shop_id=${literal(ids.shop)} WHERE id=${literal(ids.manager)};`);
  }
  pass(DRAFT_LINE_PASSES[4]);
  setStage("draft-line-vehicle");
  {
    const value = await seed();
    await waitDrift(
      value,
      `SELECT id FROM shop_manager.vehicles WHERE id=${literal(ids.vehicle)} FOR UPDATE;`,
      `UPDATE shop_manager.vehicles SET customer_id=${literal(otherCustomer)} WHERE id=${literal(ids.vehicle)};`,
      "42501",
    );
    await observer.command(
      `UPDATE shop_manager.vehicles SET customer_id=${literal(ids.customer)} WHERE id=${literal(ids.vehicle)};`,
    );
    const owned = await seed(true);
    await waitDrift(
      owned,
      `SELECT id FROM public.vehicles WHERE id=${literal(owned.vehicle)} FOR UPDATE;`,
      `UPDATE public.vehicles SET owner_user_id=${literal(ids.stranger)} WHERE id=${literal(owned.vehicle)};`,
      "42501",
    );
  }
  pass(DRAFT_LINE_PASSES[5]);
  setStage("draft-line-item");
  {
    const value = await seed();
    // Exact old full-item CAS refuses40001 BEFORE the installation guard. The
    // locker never touches the candidate-locked parent/customer/vehicle.
    await waitDrift(
      value,
      `SELECT id FROM public.vehicle_receipt_items WHERE id=${literal(value.item)} FOR UPDATE;`,
      `UPDATE public.vehicle_receipt_items SET installed_on='2026-10-03',installed_by=${literal(ids.manager)},installation_origin='customer_entered',odometer_km=103 WHERE id=${literal(value.item)};`,
      "40001",
    );
  }
  pass(DRAFT_LINE_PASSES[6]);
  setStage("draft-line-late");
  {
    const value = await seed(),
      before = await snapshot();
    await withSessions([ids.manager], async (owner) => {
      await expectedError(
        owner.command(
          invokeDraftLineSQL({
            ...value,
            changes: { ...value.changes, category: "invalid-lab-category" },
          }),
        ),
        "23514",
      );
    });
    assert.equal(await snapshot(), before);
    for (const target of ["item", "header"]) {
      await observer.command(`CREATE FUNCTION public.lab_draft_line_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF pg_trigger_depth()=1 AND NEW.id=${literal(value.item)}::uuid THEN
          ${target === "item" ? `UPDATE public.vehicle_receipt_items SET confidence=0.9 WHERE id=NEW.id;` : `UPDATE public.vehicle_receipts SET vendor='Synthetic late rewrite' WHERE id=NEW.receipt_id;`}
        END IF; RETURN NEW; END $$;
        CREATE TRIGGER lab_draft_line_rewrite AFTER UPDATE ON public.vehicle_receipt_items FOR EACH ROW EXECUTE FUNCTION public.lab_draft_line_rewrite();`);
      try {
        const faultBaseline = await snapshot();
        await withSessions([ids.manager], async (owner) => {
          await expectedError(owner.command(invokeDraftLineSQL(value)), "55000");
        });
        assert.equal(await snapshot(), faultBaseline);
      } finally {
        await observer.command(
          "DROP TRIGGER lab_draft_line_rewrite ON public.vehicle_receipt_items; DROP FUNCTION public.lab_draft_line_rewrite();",
        );
      }
      assert.equal(await snapshot(), before);
    }
  }
  pass(DRAFT_LINE_PASSES[7]);
}
