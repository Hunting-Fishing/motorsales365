// Pure fixed-file generator: no database client, executor, CLI, or approval token.
// The two original PR18 files remain exact raw bytes; the additional outer DO
// is a distinct reviewed statement, NOT the sole original migration statement.
// Its transaction-local trusted path is established before owner/type/operator
// checks and remains local until the caller's transaction ends. No assumptions
// are made about a preceding query sharing a connection with an apply tool.
import fs from "node:fs";
import { createHash } from "node:crypto";

const sources = Object.freeze({
  profile_bootstrap: Object.freeze({
    path: "supabase/migrations/20261014185003_contain_legacy_profile_bootstrap_execute.sql",
    bytes: 6295,
    sha256: "53c9081e23d9a31846f39a730a5c7cb5bd589716f224d11a7ed9a76e73d00aba",
  }),
  work_order_totals: Object.freeze({
    path: "supabase/migrations/20261014185052_contain_legacy_work_order_totals_execute.sql",
    bytes: 6307,
    sha256: "f87c6852dce4cff8be7f33d97aeadceddd223c2e4a3f310185f149a60297baf7",
  }),
});
const hash = (value) => createHash("sha256").update(value).digest("hex");

export function buildApprovedHelperExecutionEnvelope(action) {
  if (typeof action !== "string" || !Object.hasOwn(sources, action)) {
    throw new Error("Unknown approved helper action");
  }
  const source = sources[action];
  const raw = fs.readFileSync(new URL(`../../${source.path}`, import.meta.url));
  if (raw.length !== source.bytes || hash(raw) !== source.sha256) {
    throw new Error("Approved helper source bytes changed");
  }
  const innerSql = raw.toString("utf8");
  if (!Buffer.from(innerSql, "utf8").equals(raw)) {
    throw new Error("Approved helper source is not exact UTF-8");
  }
  const innerDelimiter = `$approved_${action}_${source.sha256.slice(0, 16)}$`;
  const outerDelimiter = "$approved_helper_execution_envelope$";
  if (innerSql.includes(innerDelimiter) || innerSql.includes(outerDelimiter)) {
    throw new Error("Approved helper delimiter collision");
  }
  const prefix = `DO ${outerDelimiter}
BEGIN
  PERFORM pg_catalog.set_config('search_path','pg_catalog,pg_temp',true);
  IF CURRENT_USER OPERATOR(pg_catalog.<>) 'postgres'::pg_catalog.name THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Approved helper envelope requires postgres';
  END IF;
  EXECUTE ${innerDelimiter}`;
  const suffix = `${innerDelimiter};
END
${outerDelimiter};
`;
  const sql = prefix + innerSql + suffix;
  const embeddedByteStart = Buffer.byteLength(prefix, "utf8");
  return Object.freeze({
    action,
    sourcePath: source.path,
    innerSql,
    innerSha256: source.sha256,
    innerBytes: raw.length,
    innerDelimiter,
    outerDelimiter,
    embeddedByteStart,
    embeddedByteEndExclusive: embeddedByteStart + raw.length,
    sql,
    envelopeSha256: hash(sql),
    envelopeBytes: Buffer.byteLength(sql, "utf8"),
  });
}
