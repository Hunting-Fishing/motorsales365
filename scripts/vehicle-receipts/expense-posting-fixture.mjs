// Memory-only retained-source characterization, not a migration or authority model.
// The native expense/GL/receipt table definitions, constraints and selected forward
// functions/attachments below are unchanged LF-normalized source slices. Only the
// explicitly labelled support schema, identities and seed rows are synthetic.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const root = new URL("../../", import.meta.url);
const sha = (value) => createHash("sha256").update(value).digest("hex");
const specifications = [
  [
    "scripts/vehicle-receipts/test-fixture.sql",
    "8c9f9f9bbf36aa73ddaba483914d7cea0240671a155cf44a11af86dca0d5b67e",
    [
      ["rolesAuth", 1, 5, "7abea219cda6d973892ae18b9bca793ba0bfc2fb3d6c8d4dbfc69779f4a7d300"],
      ["nativeSupport", 11, 16, "41d711a545ef30f6bc83a611b21baff363dca24396dcd1b5be1553894bb33f1e"],
      [
        "authorityStubs",
        18,
        19,
        "ce969481965bf5b5127d5ccd91313ef1469c39c8ae46fa95bda180a0db90bfa8",
      ],
      ["supportGrants", 28, 29, "f0ed01b2976d7d75802fa1f8c6cbc03dfa8358a5bd5034c291c294f328ad1121"],
    ],
  ],
  [
    "supabase/migrations/20260713081429_d9cdd366-04dd-4e51-939f-541106ff205e.sql",
    "30dfd8df0c3537efb5155a8891804e00444b180f55e674b56d522e473e2f4144",
    [["currentShop", 3, 6, "96d278351d5b335519711b97e89dd5b52052886929fbce820951414612cd7845"]],
  ],
  [
    "supabase/migrations/20260714032507_f944b167-9bbe-4f1b-a49b-48dec9a68a68.sql",
    "d79ac62b79830d5031c48f4e520f6fb205023fc821921f0347dc7f135f252eda",
    [
      ["expenseTables", 29, 74, "e439cb5a27a263dfe7e009a48197876acc39eeb964c8dad9af8e1623060826fd"],
      ["firstTouch", 77, 79, "7b294e21f1f5e4b6205898db47dec5701fee16203e6e08aee2732a0ce4e5c544"],
      ["expenseTouch", 82, 83, "56356a99fed9c123d59898837babd0600d54bd3235b09eac203987fba283b28f"],
      ["categoryTouch", 86, 87, "519822393dffc5692ebae88f6da8d5321f2993c10883f151e11de66dbd22e006"],
    ],
  ],
  [
    "supabase/migrations/20260714034131_1bed039d-569f-4b91-8f56-bf19451a7786.sql",
    "b19993ff90b57a5adb8272b141d7bdb765f1066dca4a554ec46ab4d8cfe821c9",
    [
      ["receiptUrl", 2, 2, "86836fbded212872e33bee87fbe33519016bc5941ed410f7c1b92e99b49315e6"],
      ["latestTouch", 47, 49, "76962694ca3ae60b6fa4e54753ada40065658711161ff3b6522117667a72684e"],
    ],
  ],
  [
    "supabase/migrations/20260714040242_e2995194-583b-4ca7-9f5e-a8456e9af42f.sql",
    "ac5c2febc12a0cf5fed7dfdca9e319f20eb35d7bd10f583f46baf3a9e3b8e13c",
    [["glTables", 49, 109, "802796ad1faa7897e555ba3c9a3938efb7dcaa7505d3078793d8e9686e2b68a6"]],
  ],
  [
    "supabase/migrations/20260715015208_d62496ef-e67e-4f61-a395-604bfd5749dc.sql",
    "49cafa7e5d7d24d6441b8aa7673eb839621c7e2ef095876a1b6275fbe1b20ddd",
    [
      ["journalSource", 2, 9, "8f9d8ebbe07188ac4c4f670bd1887b4e53cc9bfe77018d5b8dfe3204b154d13b"],
      ["getAccount", 12, 29, "4023903f476b618d5a2a0514145ff51ead91f0d2ffcb46b52106fd647043d69c"],
      ["postJournal", 53, 114, "e432b09cfba11dbe2f043d9566f25d9ad8fbfe3c0a1a2c07a0ab08eeb063b086"],
      ["expensePost", 252, 285, "7a0a9269ab214c7140718b627eae18162aa46ee6f684640f1bfd923703a699b1"],
      [
        "expensePostTrigger",
        288,
        289,
        "364c38c0b02fcbcf13db0b9da3800a664c875ee10648d1f5faaf8ae258843629",
      ],
    ],
  ],
  [
    "supabase/migrations/20261014043336_vehicle_receipts_shared_history.sql",
    "73de34ce2f20b6fb0b2bb9b343fd48cbed7e09091e0000f931fc7aa51637d21d",
    [
      ["privateSchema", 5, 7, "5ce7f1a7a6f3e69a2db765115e2b7b6a8749cdb5f548a6563ee3f5c156628286"],
      ["receiptTable", 26, 40, "11c72c16f5bfe5099bd83bf26968dcb38dd62836603d7bda19742ef811cff4d5"],
      ["shopAccess", 61, 71, "a20a9ae54e0c7bb745a705571f8e7bf477b4ea08b3bfd34ce181e8892c4faf36"],
      [
        "expenseLinksRecord",
        427,
        448,
        "76290adf73d2af951b6db6550cec400fbc5a44faa03c0e8bad15963c0b3b2a00",
      ],
      [
        "expenseGuard",
        522,
        530,
        "b74c66334df0be4bb4968e1096b2a1f7f31dca3d9ee964d225a340efa6afcf83",
      ],
    ],
  ],
];

// Selected spans have no final newline; whole-source pins include all LF bytes.
export const selectedSources = Object.freeze(
  specifications.flatMap(([path, wholeSha256, parts]) => {
    const source = fs.readFileSync(new URL(path, root), "utf8").replace(/\r\n/g, "\n");
    assert.equal(sha(source), wholeSha256, `${path}: whole source changed`);
    const lines = source.split("\n");
    return parts.map(([name, start, end, sha256]) => {
      const sql = lines.slice(start - 1, end).join("\n");
      assert.equal(sha(sql), sha256, `${name}: selected source changed`);
      assert.ok(sql.trim().endsWith(";"), `${name}: incomplete SQL selection`);
      return Object.freeze({ name, path, start, end, wholeSha256, sha256, sql });
    });
  }),
);
export const pins = Object.freeze(
  selectedSources.map(({ sql: _sql, ...metadata }) => Object.freeze(metadata)),
);
export const limitations = Object.freeze([
  "Synthetic auth.uid uses a test.user GUC, not JWT/Auth/session verification.",
  "Synthetic native shops/customers/vehicles/profiles/roles and module/manager stubs are not authority proof.",
  "Retained declarations/ACL/RLS are selected source only, not applied/current catalog or baseline parity.",
  "Original GL policies are loaded; the later generic August security-policy sweep is not replayed or claimed current here.",
  "Receipt client RLS, Storage, history/install and unrelated posting paths are not composed.",
  "The retained receipt_url rejection attaches to service records, NOT expenses; no expense URL guard is invented.",
  "No retained sm_fill_shop_id source was recovered; any current default/other attachment remains unverified.",
  "Known retained expense attachments are binding BEFORE INSERT/selected UPDATE, timestamp BEFORE UPDATE and posting AFTER INSERT; no reversal is invented.",
  "No durable request ledger, financial policy, native authority, API acceptance, independent sessions or production repair is established.",
]);

export const ids = Object.freeze({
  manager: "10000000-0000-4000-8000-000000000001",
  stranger: "10000000-0000-4000-8000-000000000002",
  shop: "20000000-0000-4000-8000-000000000001",
  otherShop: "20000000-0000-4000-8000-000000000002",
  customer: "30000000-0000-4000-8000-000000000001",
  vehicle: "40000000-0000-4000-8000-000000000001",
  receipt: "50000000-0000-4000-8000-000000000001",
  absent: "90000000-0000-4000-8000-000000000001",
});

export async function withExpensePostingFixture(
  run,
  {
    total = "250",
    purchasedOn = "2026-10-01",
    currency = "PHP",
    status = "confirmed",
    vendor = "Synthetic receipt",
  } = {},
) {
  const db = new PGlite(); // No dataDir, host, URL, connector or native process.
  try {
    for (const section of selectedSources) await db.exec(section.sql);
    await db.query("SELECT set_config('test.user','',false)");
    // Privileged synthetic setup; no production rows or bootstrap writers run.
    await db.query("INSERT INTO auth.users(id) VALUES ($1),($2)", [ids.manager, ids.stranger]);
    await db.query(
      "INSERT INTO shop_manager.shops(id,name) VALUES ($1,'Synthetic shop'),($2,'Other synthetic shop')",
      [ids.shop, ids.otherShop],
    );
    await db.query("INSERT INTO shop_manager.customers(id,shop_id) VALUES ($1,$2)", [
      ids.customer,
      ids.shop,
    ]);
    await db.query("INSERT INTO shop_manager.vehicles(id,customer_id) VALUES ($1,$2)", [
      ids.vehicle,
      ids.customer,
    ]);
    await db.query("INSERT INTO shop_manager.profiles(id,user_id,shop_id) VALUES ($1,$1,$2)", [
      ids.manager,
      ids.shop,
    ]);
    await db.query(
      "INSERT INTO public.vehicle_receipts(id,shop_vehicle_id,created_by,vendor,purchased_on,currency,total,status) VALUES ($1,$2,$3,$4,$5::date,$6,$7::numeric,$8)",
      [ids.receipt, ids.vehicle, ids.manager, vendor, purchasedOn, currency, total, status],
    );
    return await run(db);
  } finally {
    await db.close();
  }
}

// Role/subject are synthetic test admission, never tokens. Failed statements are
// rolled back before the caller inspects row counts or full snapshots.
export async function actor(db, role, subject, sql, args = []) {
  assert.ok(["authenticated", "anon", "service_role"].includes(role));
  await db.exec("BEGIN");
  try {
    await db.exec(`SET LOCAL ROLE ${role}`);
    await db.query("SELECT set_config('test.user',$1,true)", [subject ?? ""]);
    const result = await db.query(sql, args);
    await db.exec("COMMIT");
    return result;
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}

// NUMERIC is serialized explicitly as text, including unscaled values/NaN.
// Complete selected data/catalog snapshots also catch side effects of late faults.
export async function snapshot(db) {
  const data = {};
  for (const [table, overrides] of [
    ["public.vehicle_receipts", "jsonb_build_object('total',t.total::text)"],
    ["shop_manager.expense_categories", "'{}'::jsonb"],
    [
      "shop_manager.expenses",
      "jsonb_build_object('amount',t.amount::text,'tax_amount',t.tax_amount::text)",
    ],
    ["shop_manager.chart_of_accounts", "'{}'::jsonb"],
    ["shop_manager.journal_entries", "'{}'::jsonb"],
    [
      "shop_manager.journal_entry_lines",
      "jsonb_build_object('debit',t.debit::text,'credit',t.credit::text)",
    ],
    ["shop_manager.shops", "'{}'::jsonb"],
    ["shop_manager.customers", "'{}'::jsonb"],
    ["shop_manager.vehicles", "'{}'::jsonb"],
    ["shop_manager.profiles", "'{}'::jsonb"],
  ]) {
    data[table] = (
      await db.query(`SELECT to_jsonb(t) || ${overrides} AS row FROM ${table} t ORDER BY id`)
    ).rows.map(({ row }) => row);
  }
  const catalog = {};
  catalog.tables = (
    await db.query(`SELECT n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='shop_manager' AND c.relkind='r' ORDER BY c.relname`)
  ).rows;
  catalog.columns = (
    await db.query(`SELECT c.relname,a.attname,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull,
    pg_get_expr(d.adbin,d.adrelid) AS default_expression FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
    WHERE (n.nspname='shop_manager' OR(n.nspname='public' AND c.relname='vehicle_receipts'))
    AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped ORDER BY n.nspname,c.relname,a.attnum`)
  ).rows;
  catalog.constraints = (
    await db.query(`SELECT n.nspname,c.relname,k.conname,k.contype,k.convalidated,pg_get_constraintdef(k.oid) AS definition
    FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='shop_manager' OR(n.nspname='public' AND c.relname='vehicle_receipts') ORDER BY n.nspname,c.relname,k.conname`)
  ).rows;
  catalog.indexes = (
    await db.query(
      "SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='shop_manager' OR(schemaname='public' AND tablename='vehicle_receipts') ORDER BY schemaname,tablename,indexname",
    )
  ).rows;
  catalog.policies = (
    await db.query(
      "SELECT * FROM pg_policies WHERE schemaname='shop_manager' ORDER BY tablename,policyname",
    )
  ).rows;
  catalog.triggers = (
    await db.query(`SELECT n.nspname,c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) AS definition
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE NOT t.tgisinternal AND n.nspname='shop_manager' ORDER BY c.relname,t.tgname`)
  ).rows;
  catalog.functions = (
    await db.query(`SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS args,
    p.prosecdef,p.provolatile,p.proconfig,p.proacl::text,pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname IN('shop_manager','vehicle_receipts_private','auth') OR(n.nspname='public' AND p.proname='record_vehicle_receipt_expense')
    ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)`)
  ).rows;
  const settings = (
    await db.query(
      "SELECT current_user,current_setting('role') AS role,current_setting('search_path') AS search_path,current_setting('test.user',true) AS subject",
    )
  ).rows[0];
  return { data, catalog, settings };
}
