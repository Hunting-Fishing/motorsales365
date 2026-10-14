// Retained-source privacy regression, not a transfer workflow or live finding.
// Ownership changes below are privileged synthetic setup in memory only.
// Storage assertions concern synthetic object-metadata rows, NEVER file bytes,
// signed URLs, downloads, HTTP/JWT transport or the Supabase Storage service.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const migrations = new URL("../../supabase/migrations/", import.meta.url);
const sha = (sql) => createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex");
function readPinned(name, expected) {
  const source = fs.readFileSync(new URL(name, migrations), "utf8");
  assert.equal(sha(source), expected, `${name}: unchanged source pin required`);
  return source;
}
function section(source, pattern, expected, label) {
  const matches = [...source.matchAll(pattern)];
  assert.equal(matches.length, 1, `${label}: exactly one retained section required`);
  const original = matches[0][0];
  assert.equal(sha(original), expected, `${label}: extracted source changed`);
  return original; // Execute matched source bytes, not reconstructed policy/helper SQL.
}
const receiptSource = readPinned(
  "20261014043336_vehicle_receipts_shared_history.sql",
  "73de34ce2f20b6fb0b2bb9b343fd48cbed7e09091e0000f931fc7aa51637d21d",
);
const vehicleSource = readPinned(
  "20260525155935_31efaded-ef49-43e7-945b-f213f41edda7.sql",
  "d295c784c97c5ee99dfbec99e4255651350f2a600187f1431fe1b0d264c54d3f",
);
const receiptSections = [
  [
    /^CREATE TABLE public\.vehicle_shop_links \([\s\S]*?^\);/gm,
    "f07a7054e65f08eacbde65e3f8b90b6e7e6e0bb7ac196f9abc3d6980bc5f3399",
    "link table",
  ],
  [
    /^CREATE TABLE public\.vehicle_receipts \([\s\S]*?^\);/gm,
    "928bb03fcb29a34b269b6c13f9b3f81a2bd39db837d6fff76328229fe9742a1c",
    "receipt table",
  ],
  [
    /^CREATE TABLE public\.vehicle_receipt_items \([\s\S]*?^\);/gm,
    "fe1e0439c17b579b748b8219133a007b6aef61ae07ec79d699d2f515a01aaa27",
    "item table required by retained grants",
  ],
  [
    /^CREATE FUNCTION vehicle_receipts_private\.owns_vehicle\([\s\S]*?\$\$;/gm,
    "1e9e23b86ea82180b6134e0d2ccc3d879908bb409edf108db5cdbbf500eadce3",
    "current-owner helper",
  ],
  [
    /^CREATE FUNCTION vehicle_receipts_private\.shop_access\([\s\S]*?\$\$;/gm,
    "a20a9ae54e0c7bb745a705571f8e7bf477b4ea08b3bfd34ce181e8892c4faf36",
    "native shop helper",
  ],
  [
    /^CREATE FUNCTION vehicle_receipts_private\.receipt_access\([\s\S]*?\$\$;/gm,
    "7df9cd7084ce4bcea7983a6376b47cb1fcca3523d891d59f55ad6b10370725ce",
    "receipt access helper",
  ],
  [
    /^CREATE POLICY receipt_read[\s\S]*?;/gm,
    "3cc3c3ee0c2eff6f4f34dd57426225eef13067c30c158ff5576596bc3beb2a47",
    "receipt SELECT policy",
  ],
  [
    /^CREATE POLICY vehicle_shop_link_read[\s\S]*?;/gm,
    "96bf35fde1c5f522e73716458a0a38e6305dd996d5e95d9418460e1e7f1f9ca5",
    "link SELECT policy",
  ],
  [
    /^CREATE POLICY vehicle_receipt_file_read[\s\S]*?;/gm,
    "bbfbc7b3b588d5751d858b86a16ca99d02671621cd9231466403ded550f561d9",
    "storage object-metadata SELECT policy",
  ],
  [
    /^GRANT SELECT ON public\.vehicle_receipts,public\.vehicle_receipt_items,public\.vehicle_shop_links TO authenticated;/gm,
    "e24ce78f62f4159d1e4f66f83f6f26cd964258491d2b81fda003c530f0619108",
    "receipt/link SELECT grants",
  ],
  [
    /^REVOKE ALL ON ALL FUNCTIONS IN SCHEMA vehicle_receipts_private FROM PUBLIC,anon,authenticated;\r?\nGRANT EXECUTE ON FUNCTION vehicle_receipts_private\.owns_vehicle\(uuid\)[\s\S]*?GRANT EXECUTE ON FUNCTION vehicle_receipts_private\.receipt_access\(uuid,boolean\) TO authenticated,service_role;/gm,
    "d11c7bea5cf9d8990556eaa98e46a3a354d9f75df34a0538876f65c8c37524ac",
    "three helper EXECUTE grants",
  ],
].map(([pattern, hash, label]) => section(receiptSource, pattern, hash, label));
const vehiclePolicies = [
  [
    /^CREATE POLICY "Owners manage own vehicles"[\s\S]*?;/gm,
    "8fbae48762109ed87c704201d9a9046f16b9c79a631717c63e84576e6d8becaf",
    "actual vehicle owner policy",
  ],
  [
    /^CREATE POLICY "Public vehicles readable"[\s\S]*?;/gm,
    "13d5af6de464c4ca66d61377245053d854e4f2b929f0bad3e15097c5025be991",
    "actual public vehicle policy",
  ],
  [
    /^CREATE POLICY "Admins manage vehicles"[\s\S]*?;/gm,
    "e2eb92e0ec77799153b049cb82de28016e6ec876f60c9f41d0c3f3cb91dc524c",
    "actual vehicle admin policy",
  ],
].map(([pattern, hash, label]) => section(vehicleSource, pattern, hash, label));

const oldOwner = "00000000-0000-4000-8000-000000000001";
const newOwner = "00000000-0000-4000-8000-000000000002";
const staff = "00000000-0000-4000-8000-000000000003";
const stranger = "00000000-0000-4000-8000-000000000004";
const shop = "10000000-0000-4000-8000-000000000001";
const customer = "20000000-0000-4000-8000-000000000001";
const nativeVehicle = "30000000-0000-4000-8000-000000000001";
const vehicle = "40000000-0000-4000-8000-000000000001";
const ownerReceipt = "50000000-0000-4000-8000-000000000001";
const shopReceipt = "50000000-0000-4000-8000-000000000002";
const metadataPath = `${oldOwner}/${ownerReceipt}/original.png`;
const options = { concurrency: false, timeout: 20_000 };

async function asActor(db, actor) {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [actor]);
  await db.exec("SET ROLE authenticated");
}
async function observation(db, actor, receipt = ownerReceipt) {
  await asActor(db, actor);
  return (
    await db.query(
      `
    SELECT vehicle_receipts_private.receipt_access($1,false) AS helper_allowed,
      (SELECT count(*)::int FROM public.vehicle_receipts WHERE id=$1) AS receipt_rows,
      (SELECT count(*)::int FROM storage.objects WHERE name=$2) AS metadata_rows
  `,
      [receipt, metadataPath],
    )
  ).rows[0];
}
async function syntheticOwnerChange(db) {
  // A privileged fixture-only UPDATE, not a real transfer endpoint or workflow.
  // No ownership epoch, link-invalidation mitigation or production repair exists here.
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.vehicles SET owner_user_id=$1 WHERE id=$2", [newOwner, vehicle]);
}

async function withFixture(run) {
  const db = new PGlite(); // No persistent path, environment credentials or network client.
  try {
    await db.exec(`
      SET statement_timeout='3000ms'; SET lock_timeout='1000ms';
      CREATE ROLE anon NOLOGIN NOSUPERUSER NOBYPASSRLS;
      CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOINHERIT NOBYPASSRLS;
      CREATE ROLE service_role NOLOGIN NOSUPERUSER NOBYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA shop_manager;
      CREATE SCHEMA vehicle_receipts_private;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid
      $$;
      CREATE TYPE public.app_role AS ENUM ('admin');
      -- Supporting admin/module helpers are explicit stubs, NOT live authority proofs.
      -- No actor is an admin; the unchanged admin policy must not grant a shortcut.
      CREATE FUNCTION public.has_role(uuid,public.app_role) RETURNS boolean
        LANGUAGE sql STABLE AS $$ SELECT false $$;
      CREATE FUNCTION shop_manager.employee_allowed_modules() RETURNS text[]
        LANGUAGE sql STABLE AS $$ SELECT ARRAY['vehicles']::text[] $$;
      CREATE FUNCTION shop_manager.is_shop_operations_manager(uuid,uuid) RETURNS boolean
        LANGUAGE sql STABLE AS $$ SELECT false $$;
      -- Minimal supporting schema. The three receipt/link/item tables below are actual DDL.
      CREATE TABLE public.vehicles(id uuid PRIMARY KEY,owner_user_id uuid NOT NULL,is_public boolean NOT NULL DEFAULT false);
      CREATE TABLE shop_manager.shops(id uuid PRIMARY KEY);
      CREATE TABLE shop_manager.customers(id uuid PRIMARY KEY,shop_id uuid);
      CREATE TABLE shop_manager.vehicles(id uuid PRIMARY KEY,customer_id uuid);
      CREATE TABLE shop_manager.profiles(id uuid PRIMARY KEY,user_id uuid,shop_id uuid);
      CREATE TABLE shop_manager.roles(id uuid PRIMARY KEY,name text);
      CREATE TABLE shop_manager.user_roles(user_id uuid,role_id uuid);
      CREATE TABLE storage.objects(id integer PRIMARY KEY,bucket_id text NOT NULL,name text NOT NULL);
      ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA auth,storage,shop_manager,vehicle_receipts_private TO authenticated;
      GRANT EXECUTE ON FUNCTION auth.uid(),public.has_role(uuid,public.app_role) TO authenticated;
      GRANT SELECT ON public.vehicles,storage.objects TO authenticated;
      -- Fixture-only UPDATE privilege tests the original owner's RLS WITH CHECK;
      -- it is not a production grant observation or implemented transfer authority.
      GRANT UPDATE(owner_user_id) ON public.vehicles TO authenticated;
    `);
    for (const sql of vehiclePolicies) await db.exec(sql);
    for (const sql of receiptSections.slice(0, 3)) await db.exec(sql);
    await db.exec(`
      ALTER TABLE public.vehicle_receipts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.vehicle_receipt_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.vehicle_shop_links ENABLE ROW LEVEL SECURITY;
    `);
    for (const sql of receiptSections.slice(3)) await db.exec(sql);
    await db.query("INSERT INTO auth.users(id) VALUES($1),($2),($3),($4)", [
      oldOwner,
      newOwner,
      staff,
      stranger,
    ]);
    await db.query("INSERT INTO public.vehicles(id,owner_user_id) VALUES($1,$2)", [
      vehicle,
      oldOwner,
    ]);
    await db.query("INSERT INTO shop_manager.shops VALUES($1)", [shop]);
    await db.query("INSERT INTO shop_manager.customers VALUES($1,$2)", [customer, shop]);
    await db.query("INSERT INTO shop_manager.vehicles VALUES($1,$2)", [nativeVehicle, customer]);
    await db.query("INSERT INTO shop_manager.profiles VALUES($1,$1,$2)", [staff, shop]);
    await db.query("INSERT INTO shop_manager.roles VALUES($1,'service_advisor')", [shop]);
    await db.query("INSERT INTO shop_manager.user_roles VALUES($1,$2)", [staff, shop]);
    await db.query(
      `INSERT INTO public.vehicle_shop_links(shop_vehicle_id,vehicle_id,shop_id,approved_by)
      VALUES($1,$2,$3,$4)`,
      [nativeVehicle, vehicle, shop, oldOwner],
    );
    await db.query(
      `INSERT INTO public.vehicle_receipts(id,vehicle_id,created_by,file_path,status,share_with_shop)
      VALUES($1,$2,$3,$4,'confirmed',false)`,
      [ownerReceipt, vehicle, oldOwner, metadataPath],
    );
    await db.query(
      `INSERT INTO public.vehicle_receipts(id,vehicle_id,shop_vehicle_id,created_by,status,share_with_shop)
      VALUES($1,$2,$3,$4,'confirmed',false)`,
      [shopReceipt, vehicle, nativeVehicle, staff],
    );
    await db.query(
      "INSERT INTO storage.objects VALUES(1,'vehicle-receipts',$1),(2,'vehicle-receipts','unrelated-synthetic.png')",
      [metadataPath],
    );
    await asActor(db, stranger);
    const role = (
      await db.query(`SELECT current_user AS actor_role,
      (SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname=current_user) AS bypass,
      row_security_active('public.vehicles') AS vehicle_rls,
      row_security_active('public.vehicle_receipts') AS receipt_rls,
      row_security_active('storage.objects') AS metadata_rls`)
    ).rows[0];
    assert.deepEqual(role, {
      actor_role: "authenticated",
      bypass: false,
      vehicle_rls: true,
      receipt_rls: true,
      metadata_rls: true,
    });
    await run(db);
  } finally {
    await db.close();
  }
}

test("two full sources and fourteen selected original sections are LF-hash pinned", () => {
  assert.equal(receiptSections.length, 11);
  assert.equal(vehiclePolicies.length, 3);
  assert.match(receiptSections[5], /SECURITY DEFINER/);
  assert.match(receiptSections[8], /bucket_id='vehicle-receipts'/);
});

test(
  "current ownership, not creator identity or public visibility, controls unshared receipt and metadata reads",
  options,
  () =>
    withFixture(async (db) => {
      assert.deepEqual(await observation(db, oldOwner), {
        helper_allowed: true,
        receipt_rows: 1,
        metadata_rows: 1,
      });
      assert.deepEqual(await observation(db, newOwner), {
        helper_allowed: false,
        receipt_rows: 0,
        metadata_rows: 0,
      });
      assert.deepEqual(await observation(db, stranger), {
        helper_allowed: false,
        receipt_rows: 0,
        metadata_rows: 0,
      });
      assert.deepEqual(await observation(db, staff), {
        helper_allowed: false,
        receipt_rows: 0,
        metadata_rows: 0,
      });
      await asActor(db, staff);
      assert.equal(
        (await db.query("SELECT count(*)::int AS n FROM public.vehicles WHERE id=$1", [vehicle]))
          .rows[0].n,
        0,
      );
      await db.exec("RESET ROLE");
      await db.query("UPDATE public.vehicles SET is_public=true WHERE id=$1", [vehicle]);
      await asActor(db, stranger);
      assert.equal(
        (await db.query("SELECT count(*)::int AS n FROM public.vehicles WHERE id=$1", [vehicle]))
          .rows[0].n,
        1,
      );
      assert.deepEqual(await observation(db, stranger), {
        helper_allowed: false,
        receipt_rows: 0,
        metadata_rows: 0,
      });
    }),
);

test(
  "privileged synthetic owner change reveals prior-creator unshared receipt and object metadata to new owner",
  options,
  () =>
    withFixture(async (db) => {
      await asActor(db, oldOwner);
      await assert.rejects(
        db.query("UPDATE public.vehicles SET owner_user_id=$1 WHERE id=$2", [newOwner, vehicle]),
        (error) => error.code === "42501",
      );
      await syntheticOwnerChange(db);
      assert.deepEqual(await observation(db, newOwner), {
        helper_allowed: true,
        receipt_rows: 1,
        metadata_rows: 1,
      });
      assert.deepEqual(await observation(db, oldOwner), {
        helper_allowed: false,
        receipt_rows: 0,
        metadata_rows: 0,
      });
      await db.exec("RESET ROLE");
      const retained = (
        await db.query(
          `SELECT created_by,share_with_shop FROM public.vehicle_receipts WHERE id=$1`,
          [ownerReceipt],
        )
      ).rows[0];
      assert.deepEqual(retained, { created_by: oldOwner, share_with_shop: false });
      const link = (
        await db.query(
          "SELECT active,approved_by FROM public.vehicle_shop_links WHERE shop_vehicle_id=$1",
          [nativeVehicle],
        )
      ).rows[0];
      assert.deepEqual(link, { active: true, approved_by: oldOwner });
    }),
);

test(
  "linked-shop sharing is separate: stale active approval still permits shared origin, revocation removes that path",
  options,
  () =>
    withFixture(async (db) => {
      assert.deepEqual(await observation(db, staff), {
        helper_allowed: false,
        receipt_rows: 0,
        metadata_rows: 0,
      });
      await db.exec("RESET ROLE");
      await db.query("UPDATE public.vehicle_receipts SET share_with_shop=true WHERE id=$1", [
        ownerReceipt,
      ]);
      assert.deepEqual(await observation(db, staff), {
        helper_allowed: true,
        receipt_rows: 1,
        metadata_rows: 1,
      });
      await syntheticOwnerChange(db);
      assert.deepEqual(await observation(db, staff), {
        helper_allowed: true,
        receipt_rows: 1,
        metadata_rows: 1,
      });
      await db.exec("RESET ROLE");
      await db.query(
        "UPDATE public.vehicle_shop_links SET active=false,revoked_at=now() WHERE shop_vehicle_id=$1",
        [nativeVehicle],
      );
      assert.deepEqual(await observation(db, staff), {
        helper_allowed: false,
        receipt_rows: 0,
        metadata_rows: 0,
      });
      // Direct native-shop receipts take a different original helper branch; no owner
      // sharing flag or active public link is required for that existing branch.
      const shopRead = await observation(db, staff, shopReceipt);
      assert.equal(shopRead.helper_allowed, true);
      assert.equal(shopRead.receipt_rows, 1);
      assert.equal(shopRead.metadata_rows, 0); // This observation still targets prior-owner metadata.
      assert.deepEqual(await observation(db, newOwner), {
        helper_allowed: true,
        receipt_rows: 1,
        metadata_rows: 1,
      });
    }),
);
