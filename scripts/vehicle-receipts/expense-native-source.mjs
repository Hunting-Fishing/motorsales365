// Source-only native rehearsal builder. Node builtins/local immutable reads only:
// no PGlite dependency, process, connection, network or SQL execution. The exact
// seven source/22 span declarations, synthetic support, IDs and limitations below
// are copied unchanged from the frozen expense-posting fixture; not authority.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";

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

export const metadata = Object.freeze({
  fixturePath: "scripts/vehicle-receipts/expense-posting-fixture.mjs",
  fixtureSha256: "98db65cfe826651d234367e9fae9c3222a294010d99bbd8a6876fc880fc6d2d1",
  candidatePath: "scripts/vehicle-receipts/expense-operation-candidate.sql",
  candidateSha256: "eec735a6274708f21b87a05883f43ec420b20e9dd37b4487cf6977ecb6cce570",
  wholeSourceCount: 7,
  spanCount: 22,
  seedStatementCount: 7,
  signature: "receipt_expense_candidate.create_operation(jsonb,text)",
  limitations,
});
const defaults = Object.freeze({
  total: "250",
  purchasedOn: "2026-10-01",
  currency: "PHP",
  status: "confirmed",
  vendor: "Synthetic receipt",
});
function controlledOptions(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid synthetic seed options.");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    throw new Error("Invalid synthetic seed options.");
  const names = Reflect.ownKeys(value);
  if (
    names.length > 5 ||
    names.some((name) => typeof name !== "string" || !Object.hasOwn(defaults, name))
  )
    throw new Error("Invalid synthetic seed options.");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = { ...defaults };
  for (const name of names) {
    const descriptor = descriptors[name];
    if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable)
      throw new Error("Invalid synthetic seed options.");
    const item = descriptor.value;
    if (item !== null && (typeof item !== "string" || item.length > 4096))
      throw new Error("Invalid synthetic seed options.");
    if (typeof item === "string") {
      for (let index = 0; index < item.length; index++) {
        const code = item.charCodeAt(index);
        if (code === 0) throw new Error("Invalid synthetic seed options.");
        if (code >= 0xd800 && code <= 0xdbff) {
          const next = item.charCodeAt(++index);
          if (!(next >= 0xdc00 && next <= 0xdfff))
            throw new Error("Invalid synthetic seed options.");
        } else if (code >= 0xdc00 && code <= 0xdfff)
          throw new Error("Invalid synthetic seed options.");
      }
    }
    output[name] = item;
  }
  return Object.freeze(output);
}
// Hex contains only [0-9a-f], independent of standard_conforming_strings and
// quote/backslash/control content. This is literal DATA, never SQL/identifiers.
// The 4096 UTF16 option budget is not native receipt validation: retained native
// CHECK/NOT NULL/type constraints still decide whether a rendered seed is valid.
function literal(value) {
  return value === null
    ? "NULL"
    : "pg_catalog.convert_from(pg_catalog.decode('" +
        Buffer.from(value, "utf8").toString("hex") +
        "','hex'),'UTF8')";
}
export function setupStatements(options = {}) {
  const value = controlledOptions(options);
  return Object.freeze(
    [
      ...selectedSources.map((section) => section.sql),
      "SELECT set_config('test.user','',false)",
      "INSERT INTO auth.users(id) VALUES ('" + ids.manager + "'),('" + ids.stranger + "')",
      "INSERT INTO shop_manager.shops(id,name) VALUES ('" +
        ids.shop +
        "','Synthetic shop'),('" +
        ids.otherShop +
        "','Other synthetic shop')",
      "INSERT INTO shop_manager.customers(id,shop_id) VALUES ('" +
        ids.customer +
        "','" +
        ids.shop +
        "')",
      "INSERT INTO shop_manager.vehicles(id,customer_id) VALUES ('" +
        ids.vehicle +
        "','" +
        ids.customer +
        "')",
      "INSERT INTO shop_manager.profiles(id,user_id,shop_id) VALUES ('" +
        ids.manager +
        "','" +
        ids.manager +
        "','" +
        ids.shop +
        "')",
      "INSERT INTO public.vehicle_receipts(id,shop_vehicle_id,created_by,vendor,purchased_on,currency,total,status) VALUES ('" +
        ids.receipt +
        "','" +
        ids.vehicle +
        "','" +
        ids.manager +
        "'," +
        literal(value.vendor) +
        "," +
        literal(value.purchasedOn) +
        "::date," +
        literal(value.currency) +
        "," +
        literal(value.total) +
        "::numeric," +
        literal(value.status) +
        ")",
    ].map((statement) => (statement.trimEnd().endsWith(";") ? statement : statement + ";")),
  );
}
export function buildExpenseNativeSource(options = {}) {
  const fixture = fs
    .readFileSync(new URL(metadata.fixturePath, root), "utf8")
    .replace(/\r\n/g, "\n");
  assert.equal(sha(fixture), metadata.fixtureSha256, "Frozen fixture source changed");
  const candidateSQL = fs
    .readFileSync(new URL(metadata.candidatePath, root), "utf8")
    .replace(/\r\n/g, "\n");
  assert.equal(sha(candidateSQL), metadata.candidateSha256, "Unapplied candidate source changed");
  return Object.freeze({
    setupStatements: setupStatements(options),
    candidateSQL,
    candidateSha256: metadata.candidateSha256,
    ids,
    signature: metadata.signature,
    selectedSources,
    metadata,
  });
}
