// Isolated candidate overlay on ALL unchanged PR #65 tables/functions/attachments.
// No production credentials/client, migration history, data seed or persisted DB.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { withClaims, snapshot as publicSnapshot } from "./full-claim-evidence-fixture.mjs";
const root = new URL("../../../", import.meta.url);
const pins = {
  "scripts/ci/fixtures/full-claim-evidence-fixture.mjs":
    "28a7e0beba95e09667bbb55da18b6cc09914cc85979906a52320e1f339b667c2",
  "scripts/ci/full-claim-evidence-composition.test.mjs":
    "2269ff1f8097be9501499ced63b0dfbbfab1bcce03b4f2bd8e8860a911e95a17",
  "src/lib/claim-review-revision-contract.server.ts":
    "db0f666a431e8a2016e78bae68e5d8fadf6b574e7807e62f797182ddf8879c01",
  "src/lib/claim-review-revision-contract.server.test.ts":
    "608de6f317985a68408ab080605010a241525c34089e51f2cd9c65138a53dade",
  "scripts/ci/fixtures/claim-revision-invalidation-model.sql":
    "33728fe4bb63223f936dcdd43581f0edd1536366d2a40dca92fa91a99093c9b7",
};
for (const [path, hash] of Object.entries(pins)) {
  const text = fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
  assert.equal(createHash("sha256").update(text).digest("hex"), hash, path);
}
const sql = fs
  .readFileSync(new URL("./claim-revision-invalidation-model.sql", import.meta.url), "utf8")
  .replaceAll("\r\n", "\n");
assert.ok(Buffer.byteLength(sql) > 0 && Buffer.byteLength(sql) < 24 * 1024);
async function withRevisions(run, beforeInstall) {
  return withClaims(async (db, parentGuard) => {
    if (beforeInstall) await beforeInstall(db);
    await parentGuard();
    const before = await publicSnapshot(db);
    await db.exec("SAVEPOINT revision_overlay");
    try {
      await db.exec(sql);
      assert.equal(
        await publicSnapshot(db),
        before,
        "install does not seed or mutate public/Auth rows",
      );
      return await run(db);
    } finally {
      await db.exec("ROLLBACK TO SAVEPOINT revision_overlay;RELEASE SAVEPOINT revision_overlay");
      assert.equal(
        await publicSnapshot(db),
        before,
        "full public/Auth rows restore after candidate",
      );
      assert.equal(
        (await db.query("SELECT oid FROM pg_namespace WHERE nspname='claim_revision_lab'")).rows
          .length,
        0,
      );
      await parentGuard();
    }
  });
}
async function binding(db, claimId) {
  return (await db.query("SELECT claim_revision_lab.binding($1) b", [claimId])).rows[0].b;
}
async function snapshot(db) {
  const state = {};
  for (const name of ["claim_versions", "owner_versions"])
    // Preserve exact bigint decimal digits; JSON numeric parsing would round
    // large adjacent revisions before a rollback/equality assertion.
    state[name] = (
      await db.query(
        "SELECT to_jsonb(s)::text row FROM claim_revision_lab." +
          name +
          " s ORDER BY to_jsonb(s)::text",
      )
    ).rows;
  return JSON.stringify({ public: await publicSnapshot(db), state });
}
export { withRevisions, binding, snapshot, sql, pins };
