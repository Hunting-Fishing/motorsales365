// Memory-only PARTIAL SQL rehearsal; source/setup comes from the engine-free
// module shared with the explicit private PostgreSQL17 runner. Synthetic claims
// and legacy RLS are not original-human/fresh native authority or API proof.
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { IDs, SIGNATURE, readCandidate, setupStatements } from "./native-quote-create-source.mjs";
export {
  IDs,
  SIGNATURE,
  candidateUrl,
  readCandidate,
  setupStatements,
  nativeTables,
  nativeForeignKeys,
  legacyShopHelper,
  nativeNumberFunction,
  nativeNumberTrigger,
} from "./native-quote-create-source.mjs";

export async function installCandidate(db) {
  try {
    await db.exec(readCandidate());
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}
export async function withNativeQuoteFixture(run, { install = true } = {}) {
  const db = new PGlite(); // No URL/dataDir/credentials/env or real database.
  try {
    for (const statement of setupStatements) await db.exec(statement);
    if (install) await installCandidate(db);
    await run(db);
  } finally {
    await db.close();
  }
}
export async function grantFixtureOperator(db) {
  // EXPLICIT TEST-ONLY grant. Candidate bytes themselves stay locked/unapplied.
  await db.exec(`GRANT EXECUTE ON FUNCTION ${SIGNATURE} TO authenticated`);
}
export async function asActor(db, run, { actor = IDs.actorA, role = "authenticated" } = {}) {
  assert.ok(["anon", "authenticated", "service_role"].includes(role));
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [actor ?? ""]);
  try {
    await db.exec(`SET ROLE ${role}`);
    const context = (
      await db.query(`SELECT current_user,r.rolsuper,r.rolbypassrls,
      row_security_active('shop_manager.quotes'::regclass) AS rls_active
      FROM pg_roles r WHERE r.rolname=current_user`)
    ).rows[0];
    assert.deepEqual(context, {
      current_user: role,
      rolsuper: false,
      rolbypassrls: false,
      rls_active: true,
    });
    return await run();
  } finally {
    await db.exec("RESET ROLE");
    await db.query("SELECT set_config('request.jwt.claim.sub','',false)");
  }
}
export async function invoke(db, input, actorOptions) {
  return asActor(
    db,
    async () =>
      (
        await db.query(
          `SELECT shop_manager.create_quote_atomic_candidate(
    $1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::text,$7::date,$8::text,$9::text,$10::jsonb) AS result`,
          [
            input.expectedAccount,
            input.expectedShop ?? null,
            input.quoteId,
            input.customerId,
            input.vehicleId,
            input.taxRate,
            input.expiryDate,
            input.notes,
            input.terms,
            JSON.stringify(input.items),
          ],
        )
      ).rows[0].result,
    actorOptions,
  );
}
