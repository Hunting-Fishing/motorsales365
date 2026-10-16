// UNAPPLIED, fixed-source SQL composition only. This builder executes no SQL,
// creates no process/client and supplies no migration or production installer.
// The actual commercial transition body is retained unchanged; its positive
// lookup authority remains the core fixture's synthetic owner/test.user helper.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { buildMixedReservationNativeSource } from "./mixed-reservation-native-source.mjs";

const root = new URL("../../", import.meta.url);
const sha = (value) => createHash("sha256").update(value).digest("hex");
const inventory = "supabase/migrations/20260616033348_a261b9e7-281d-4e16-bf61-1f3043a80d12.sql";
const lifecycle = "supabase/migrations/20260831041834_associate_parts_order_lifecycle.sql";
const wholePins = Object.freeze({
  [inventory]: "69afe9112531bd75d0bc68d4b31461d9e1c9aae41337ebdf79e6f40056447d62",
  [lifecycle]: "3fc2cdc241821d00fb37d7c75684062ba5c01d0519092e76e37d09b82380f654",
});
// Inclusive lines, CRLF -> LF only, and NO appended newline/trim. These are
// eight additional complete statements from two already-pinned core sources.
const spans = Object.freeze([
  [
    "orderEvents",
    lifecycle,
    111,
    121,
    "f9ae4391efe2dc6624dbb1722c6bfdf2e66328999aae42f12af5a8cf06d1a996",
  ],
  [
    "orderEventsIndex",
    lifecycle,
    138,
    139,
    "f5ce6e1441626c5b54f40cd3337f7cba5826fe7efa2c1bd849d52775be67a595",
  ],
  [
    "orderEventsRls",
    lifecycle,
    297,
    297,
    "cbcee8a432e743bc80ba9a7f8b60dc20fe6683e9aab6a0fb40e755e6afafaef1",
  ],
  [
    "updatedAt",
    inventory,
    210,
    212,
    "e34852e5d6c8cbfc6ec2fddb6940c2f9e09293400cb3d8353241237af7816881",
  ],
  [
    "inventoryTimestamp",
    inventory,
    223,
    224,
    "3bc077cb643aee05969cf05d0078d5468335672e75a5c689ec9c4b7668d2d0a4",
  ],
  [
    "orderTimestamp",
    lifecycle,
    404,
    406,
    "d337d2e0c13644b33c3fd69a99211ce58ef582778a2e13f6583e25214b28f4e4",
  ],
  [
    "orderLineTimestamp",
    lifecycle,
    407,
    409,
    "920d09abdb7a295d869a8af9d626d11727a09bc62270483bb6d7d4a5c705b9e6",
  ],
  [
    "transitionOrder",
    lifecycle,
    636,
    779,
    "b15c4c749ad6ef6813f72e889560f13d864e229c624c6e38a8bf0749f383c49d",
  ],
]);
export const ORDER_SIGNATURE = "public.transition_parts_network_order(uuid,text,text,integer)";

// Fixture-only denial, NOT a retained grant sweep/current ACL reproduction.
// The source's authenticated EXECUTE grant is deliberately not adopted here.
const fixtureLockdown = `REVOKE ALL ON FUNCTION ${ORDER_SIGNATURE}, public.set_updated_at()
  FROM PUBLIC,anon,authenticated,service_role;`;
function frozen(value) {
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) frozen(item);
    Object.freeze(value);
  }
  return value;
}
function readExtras() {
  const sources = new Map();
  for (const [path, expected] of Object.entries(wholePins)) {
    const url = new URL(path, root);
    const size = fs.statSync(url).size;
    assert.ok(size > 0 && size <= 512 * 1024, "fixed retained source byte bound");
    const sql = fs.readFileSync(url, "utf8").replace(/\r\n/g, "\n");
    assert.ok(Buffer.byteLength(sql) <= 512 * 1024);
    assert.equal(sha(sql), expected, `${path}: whole LF source pin`);
    sources.set(path, sql.split("\n"));
  }
  return spans.map(([name, path, start, end, expected]) => {
    const sql = sources
      .get(path)
      .slice(start - 1, end)
      .join("\n");
    assert.ok(sql.length > 0 && Buffer.byteLength(sql) <= 32 * 1024 && sql.endsWith(";"));
    assert.equal(sha(sql), expected, `${name}: exact selected LF statement`);
    return { name, path, start, end, wholeSha256: wholePins[path], sha256: expected, sql };
  });
}

export function buildMixedReservationOrderSource() {
  if (arguments.length !== 0) throw new Error("Fixed synthetic order source takes no options.");
  const base = buildMixedReservationNativeSource();
  assert.equal(base.selectedSources.length, 41);
  assert.equal(base.tables.length, 13);
  assert.equal(base.setupStatements.length, 66);
  const extras = readExtras();
  for (const extra of extras) {
    assert.ok(base.selectedSources.some((source) => source.path === extra.path));
    assert.ok(!base.selectedSources.some((source) => source.name === extra.name));
  }
  return frozen({
    ...base,
    setupStatements: [
      ...base.setupStatements,
      ...extras.map((source) => source.sql),
      fixtureLockdown,
    ],
    selectedSources: [...base.selectedSources, ...extras],
    extraSelectedSources: extras,
    tables: [...base.tables, ["public", "parts_order_events"]],
    transitionSignature: ORDER_SIGNATURE,
    transitionDefinition: extras.find((source) => source.name === "transitionOrder").sql,
    baseSourceMetadata: base.metadata,
    metadata: {
      ...base.metadata,
      spanCount: 49,
      tableCount: 14,
      setupStatementCount: 75,
      orderExtension: {
        mode: "unapplied-selected-order-writer-source-extension-v1",
        additionalWholeSources: 0,
        additionalSelectedStatements: 8,
        totalSelectedStatements: 49,
        additionalTables: 1,
        totalTables: 14,
        setupStatementCount: 75,
        fixtureOnlyAclStatements: 1,
        sourceAuthenticatedTransitionGrantAdopted: false,
        nativeIndependentSessionsVerified: false,
        realAuthorityVerified: false,
        currentCatalogParityVerified: false,
        releaseAcceptance: false,
      },
    },
    limitations: [
      ...base.limitations,
      "The eight extra spans retain an actual B2B transition, events and three timestamp attachments; owner/test.user/synthetic manager positives are NOT real RPC/Auth/native authority.",
      "Original transition authenticated grants and participant-read policies are NOT adopted; fixture-only EXECUTE denial is NOT current ACL parity.",
      "Order creation/receiving and untested shipment/transfer branches/downstream components, returns, warranties, commissions/payment/delivery, staff/native authority and remaining lifecycle attachments remain unverified; retaining the complete transition body is not branch coverage.",
      "Sequential acceptance/cancellation and inquiry interactions are NOT independent-session waits, global stock-writer/phantom/deadlock closure, durable replay/commit/recovery or release acceptance.",
    ],
  });
}
