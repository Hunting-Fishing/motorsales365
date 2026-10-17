// Local source-only adapter. No database, process, network or SQL execution.
// The native consumer must use ONLY additionalStatements on its already seeded
// expense cluster; setupStatements/setupSQL are for a fresh isolated parity DB.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import {
  buildExpenseNativeSource,
  ids,
  limitations as parentLimitations,
  metadata as parentMetadata,
  pins as parentPins,
  selectedSources as parentSelectedSources,
} from "./expense-native-source.mjs";

const root = new URL("../../", import.meta.url);
const sha = (value) => createHash("sha256").update(value).digest("hex");
export const sourcePins = Object.freeze({
  fixture: Object.freeze({
    path: "scripts/vehicle-receipts/draft-line-edit-fixture.mjs",
    sha256: "adff91f94089ceae158cad82df436127087d3581b9460a140d4c468e08bd7ad3",
  }),
  parentFixture: Object.freeze({
    path: parentMetadata.fixturePath,
    sha256: parentMetadata.fixtureSha256,
  }),
  receiptMigration: Object.freeze({
    path: "supabase/migrations/20261014043336_vehicle_receipts_shared_history.sql",
    sha256: "73de34ce2f20b6fb0b2bb9b343fd48cbed7e09091e0000f931fc7aa51637d21d",
  }),
  candidate: Object.freeze({
    path: "scripts/vehicle-receipts/draft-line-edit-candidate.sql",
    sha256: "78c9eff2bfc62c2897be0e22a510d9a552dc1fa48a19cfb0822d610be3ca609b",
  }),
});
function pinnedSource({ path, sha256 }) {
  const value = fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
  assert.ok(Buffer.byteLength(value) > 0 && Buffer.byteLength(value) < 128 * 1024);
  assert.equal(sha(value), sha256, path + ": unchanged LF source required");
  return value;
}
pinnedSource(sourcePins.fixture);
pinnedSource(sourcePins.parentFixture);
const receiptSource = pinnedSource(sourcePins.receiptMigration).split("\n");
// Exact same seven no-final-newline selections as the unchanged child fixture.
export const selectedSources = Object.freeze(
  [
    ["linkTable", 15, 21, "5a0425d0b38e4743c21d4f36e48f6ffc7ba19f752e64711d2b6b0c9c96729be3"],
    ["itemTable", 41, 52, "197388054c8bd25e0c8e935c6b156c532b26ebc56022dff7a939e53dbbf4be53"],
    ["ownsVehicle", 57, 60, "1e9e23b86ea82180b6134e0d2ccc3d879908bb409edf108db5cdbbf500eadce3"],
    ["receiptAccess", 72, 83, "7df9cd7084ce4bcea7983a6376b47cb1fcca3523d891d59f55ad6b10370725ce"],
    ["readRls", 84, 86, "09cd1d518767de66f3f350b15f328ce9c4ae53f13d86c3263cbdbcaa7c23c8c8"],
    ["readGrants", 89, 91, "eb6f2660c230b94f0757f9d0255c3c23eefbd7941edee99d454c545938aab5eb"],
    ["readPolicies", 92, 96, "5701ea4b97a6302d7ad311fe0932848e5f0ea0623a7b37ea5070e835ecdaa28f"],
  ].map(([name, start, end, sha256]) => {
    const sql = receiptSource.slice(start - 1, end).join("\n");
    assert.equal(sha(sql), sha256, name + ": unchanged selected source required");
    assert.ok(sql.trim().endsWith(";"), name + ": complete SQL selection required");
    return Object.freeze({
      name,
      path: sourcePins.receiptMigration.path,
      start,
      end,
      wholeSha256: sourcePins.receiptMigration.sha256,
      sha256,
      sql,
    });
  }),
);
export const pins = Object.freeze(
  selectedSources.map(({ sql: _sql, ...pin }) => Object.freeze(pin)),
);
export const additionalStatements = Object.freeze(selectedSources.map(({ sql }) => sql));
export const candidateSQL = pinnedSource(sourcePins.candidate);
export const candidateSha256 = sourcePins.candidate.sha256;
export const signature =
  "receipt_line_candidate.edit_draft_line(uuid,uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb)";
// These strings remain verbatim child-fixture limitations. Parent limitations
// remain separately exported, describing the unchanged parent in isolation.
export const limitations = Object.freeze([
  "The unchanged parentPins and parentLimitations are exported separately; this child does not supersede their source/authority limits.",
  "Only original receipt/item/link read RLS, table ACLs and two helper definitions are added; no direct authenticated mutation or candidate EXECUTE is granted.",
  "Source service-role table grants/default function EXECUTE are retained laboratory metadata, not positive service/client authority or current hosted ACL parity.",
  "The original owns_vehicle/receipt_access depend on the parent's synthetic auth.users/public.vehicles/native supports and module/manager helpers, not trusted JWT/session/human/shop membership.",
  "The exact original link table is a required receipt_access dependency, not an invented or simplified visibility branch.",
  "No save/replace-all, history synchronization, install/sharing, Storage, posting or candidate writer is executed by this child setup.",
  "The seeded receipt is draft and has no items; callbacks own item/reference seeds and any clearly labeled fault setup.",
  "Snapshots retain exact received SQL numeric text and selected structural state; they are not a whole production baseline, concurrent snapshot, durable recovery or release acceptance.",
]);
export const builderLimitations = Object.freeze([
  "This module returns local pinned SQL text only and never executes it; candidateSQL is separate from both setupStatements and additionalStatements.",
  "additionalStatements adds only seven retained child spans to an existing expense graph; it does not reset/reseed the parent's confirmed receipt, financial rows or operation ledger.",
  "Combined setupStatements/setupSQL are for a fresh private database only, with the unchanged parent status draft and no item seed; do not replay them into the native expense cluster.",
  "The parent expense candidate bytes are verified by the reused builder but are not included in this draft-line setup or candidateSQL.",
  "Owner/GUC/legacy helper rehearsal is not original-caller, strict session, fresh native authority, API/Auth/Storage, all-writer, durable retry, production recovery or release acceptance.",
]);
export const limits = Object.freeze([...parentLimitations, ...limitations, ...builderLimitations]);
export const metadata = Object.freeze({
  sourcePins,
  parentMetadata,
  parentSpanCount: parentMetadata.spanCount,
  additionalSpanCount: 7,
  combinedStatementCount: parentMetadata.spanCount + parentMetadata.seedStatementCount + 7,
  signature,
  limitations,
  builderLimitations,
  limits,
});

export function buildDraftLineNativeSource() {
  const parent = buildExpenseNativeSource({ status: "draft" });
  pinnedSource(sourcePins.fixture);
  pinnedSource(sourcePins.receiptMigration);
  const currentCandidate = pinnedSource(sourcePins.candidate);
  assert.equal(currentCandidate, candidateSQL, "Unapplied draft-line candidate changed");
  const setupStatements = Object.freeze([...parent.setupStatements, ...additionalStatements]);
  assert.equal(setupStatements.length, metadata.combinedStatementCount);
  assert.ok(setupStatements.every((statement) => statement.trimEnd().endsWith(";")));
  return Object.freeze({
    setupStatements,
    setupSQL: setupStatements.join("\n\n"),
    additionalStatements,
    candidateSQL: currentCandidate,
    candidateSha256,
    signature,
    ids,
    selectedSources,
    parentSelectedSources,
    metadata,
    limits,
  });
}

export { ids, parentPins, parentLimitations, parentSelectedSources };
