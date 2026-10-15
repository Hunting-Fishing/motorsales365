// Recorded-evidence consistency ONLY. No database, SQL execution, network, Git,
// credentials, environment input or live/current-state assertion is used here.
// Pins identify retained bytes and recorded commit/approval claims, not independent
// authenticity, human authority, transaction provenance or full release acceptance.
// Three observations are separate recorded snapshots, not one atomic global audit.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url));
const sha = (value) => createHash("sha256").update(value).digest("hex");
const lf = (raw) => raw.toString("utf8").replace(/\r\n/g, "\n");
const evidencePath = "docs/evidence/approved-helper-execution-2026-10-15.json";
const evidenceText = lf(read(evidencePath));
const evidence = JSON.parse(evidenceText);
const roles = ["anon", "authenticated", "postgres", "service_role"];
const helperNames = [
  "ensure_profile_for",
  "calculate_work_order_totals",
  "convert_work_order_to_invoice",
  "convert_quote_to_work_order",
];
const historyNames = [
  "contain_legacy_profile_bootstrap_execute",
  "contain_legacy_work_order_totals_execute",
  "contain_legacy_invoice_conversion_execute",
];
const observations = [
  evidence.preApplyObservation,
  evidence.afterProfileObservation,
  evidence.finalObservation,
];
const originalAcl = "{=X/postgres,postgres=X/postgres,service_role=X/postgres}";
const restrictedAcl = "{postgres=X/postgres,service_role=X/postgres}";
const originalNormalizedAcl = [
  "PUBLIC/postgres/EXECUTE/false",
  "postgres/postgres/EXECUTE/false",
  "service_role/postgres/EXECUTE/false",
];
const restrictedNormalizedAcl = originalNormalizedAcl.slice(1);
const sourceMappings = [
  {
    action: "profile_bootstrap",
    name: historyNames[0],
    remoteVersion: "20261015021118",
    originalFile: "supabase/migrations/20261014185003_contain_legacy_profile_bootstrap_execute.sql",
    originalSha: "53c9081e23d9a31846f39a730a5c7cb5bd589716f224d11a7ed9a76e73d00aba",
    originalBytes: 6295,
    envelopeFile: "docs/evidence/approved-helper-profile_bootstrap-execution.sql",
    envelopeSha: "3903780b9eab291b0481ec4aec83373925827eb64d78f492a5045e6da1c1ffd6",
    envelopeBytes: 6741,
    embeddedEnd: 6652,
  },
  {
    action: "work_order_totals",
    name: historyNames[1],
    remoteVersion: "20261015021145",
    originalFile: "supabase/migrations/20261014185052_contain_legacy_work_order_totals_execute.sql",
    originalSha: "f87c6852dce4cff8be7f33d97aeadceddd223c2e4a3f310185f149a60297baf7",
    originalBytes: 6307,
    envelopeFile: "docs/evidence/approved-helper-work_order_totals-execution.sql",
    envelopeSha: "34a1623d30fa59a1a9dbd9b596e1270101111f4e0b41cda596c488458ff01cb8",
    envelopeBytes: 6753,
    embeddedEnd: 6664,
  },
];
const outerDelimiter = "$approved_helper_execution_envelope$";
const functionKeys = [
  "acl",
  "all_argument_types",
  "argument_count",
  "argument_defaults_count",
  "argument_defaults_md5",
  "argument_modes",
  "argument_names",
  "argument_types",
  "body_md5_lf",
  "config_keys",
  "config_md5",
  "config_value_hashes",
  "cost",
  "definition_md5",
  "effective_acl",
  "found",
  "identity_arguments",
  "kind",
  "language",
  "leakproof",
  "name",
  "normalized_acl",
  "owner",
  "parallel",
  "requested_signature",
  "return_shape",
  "return_type",
  "returns_set",
  "rows",
  "schema",
  "security_definer",
  "selected_header_md5",
  "signature",
  "strict",
  "variadic_type",
  "volatility",
].sort();

function expectedHistoryRow(source) {
  return {
    name: source.name,
    version: source.remoteVersion,
    sql_sha256_lf: source.envelopeSha,
    source_bytes_lf: source.envelopeBytes,
    statement_count: 1,
    statement_metadata: [
      {
        is_null: false,
        position: 1,
        sql_sha256_lf: source.envelopeSha,
        source_bytes_lf: source.envelopeBytes,
      },
    ],
    statements_array_is_null: false,
  };
}

function withRestrictedTarget(functions, index) {
  return functions.map((fn, position) =>
    position !== index
      ? structuredClone(fn)
      : {
          ...structuredClone(fn),
          acl: restrictedAcl,
          normalized_acl: [...restrictedNormalizedAcl],
          effective_acl: fn.effective_acl.map((entry) => ({
            ...entry,
            execute:
              entry.role === "anon" || entry.role === "authenticated" ? false : entry.execute,
          })),
        },
  );
}

test("immutable release record pins its project, source commit, review and exact source-query/generator bytes", () => {
  assert.equal(Buffer.byteLength(evidenceText), 40370);
  assert.equal(
    sha(evidenceText),
    "8969efe0daa3680a979d01ad164c5d25d6c2fdcde74cbed649da9628c78f1135",
  );
  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.project_id, "wjxaajgvddtrxxtocxen");
  assert.equal(evidence.observedOn, "2026-10-15");
  assert.equal(evidence.source_commit, "9bad6b2f26b77fa92a78a191c7e9fcd5bff5821c");
  assert.equal(evidence.pull_request, "https://github.com/Hunting-Fishing/motorsales365/pull/42");
  assert.deepEqual(evidence.query, {
    file: "docs/evidence/approved-helpers-catalog-review.sql",
    sha256_utf8_lf: "cf43f4db6719fa9ecf1e787349710203c82cb80f6a75df2e702795186879bf7a",
    bytes: 10504,
  });
  const query = lf(read("docs/evidence/approved-helpers-catalog-review.sql"));
  assert.equal(Buffer.byteLength(query), evidence.query.bytes);
  assert.equal(sha(query), evidence.query.sha256_utf8_lf);
  const generator = lf(read("scripts/ci/approved-helper-execution-envelope.mjs"));
  assert.equal(Buffer.byteLength(generator), 2881);
  assert.equal(sha(generator), "a7198845fe250c15686bc0832474810c8c9f05b34db19ee4f7abdac29f3b7746");
  assert.equal(evidence.source_mappings.length, 2);
});

for (const [index, source] of sourceMappings.entries()) {
  test(`recorded ${source.action} envelope/hash and zero-based embedded original slice are exact`, () => {
    const mapping = evidence.source_mappings[index];
    const original = read(source.originalFile);
    const stored = read(source.envelopeFile);
    const originalText = original.toString("utf8");
    const storedText = stored.toString("utf8");
    const innerDelimiter = `$approved_${source.action}_${source.originalSha.slice(0, 16)}$`;
    assert.ok(Buffer.from(originalText, "utf8").equals(original));
    assert.ok(Buffer.from(storedText, "utf8").equals(stored));
    assert.equal(original.length, source.originalBytes);
    assert.equal(sha(original), source.originalSha);
    assert.equal(sha(lf(original)), source.originalSha);
    assert.equal(stored.length, source.envelopeBytes);
    assert.equal(sha(stored), source.envelopeSha);
    assert.equal(sha(lf(stored)), source.envelopeSha);
    assert.equal(mapping.stored_statement_file, source.envelopeFile);
    assert.equal(mapping.stored_statement_sha256_utf8_lf, source.envelopeSha);
    assert.equal(mapping.stored_statement_bytes, source.envelopeBytes);
    assert.equal(mapping.embedded_original_file, source.originalFile);
    assert.equal(mapping.embedded_original_sha256_raw_and_utf8_lf, source.originalSha);
    assert.equal(mapping.embedded_original_bytes, source.originalBytes);
    assert.equal(mapping.embedded_byte_start, 357);
    assert.equal(mapping.embedded_byte_end_exclusive, source.embeddedEnd);
    assert.equal(mapping.inner_delimiter, innerDelimiter);
    assert.equal(mapping.apply_tool_reported_success, true);
    assert.ok(stored.subarray(357, source.embeddedEnd).equals(original));
    assert.equal(source.embeddedEnd - 357, original.length);
    assert.ok(!originalText.includes(innerDelimiter));
    assert.ok(!originalText.includes(outerDelimiter));
    assert.equal(storedText.split(innerDelimiter).length - 1, 2);
    assert.equal(storedText.split(outerDelimiter).length - 1, 2);
    const prefix = `DO ${outerDelimiter}\nBEGIN\n  PERFORM pg_catalog.set_config('search_path','pg_catalog,pg_temp',true);\n  IF CURRENT_USER OPERATOR(pg_catalog.<>) 'postgres'::pg_catalog.name THEN\n    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Approved helper envelope requires postgres';\n  END IF;\n  EXECUTE ${innerDelimiter}`;
    const suffix = `${innerDelimiter};\nEND\n${outerDelimiter};\n`;
    assert.equal(Buffer.byteLength(prefix), mapping.embedded_byte_start);
    assert.equal(storedText, prefix + originalText + suffix);
    assert.ok(!stored.equals(original));
    assert.match(originalText, /UNAPPROVED exact-file candidate/);
    assert.match(mapping.relationship, /NOT the original migration file/);
    assert.match(mapping.relationship, /Generated remote version intentionally differs/);
    assert.notEqual(source.remoteVersion, source.originalFile.split("/").at(-1).slice(0, 14));
    assert.deepEqual(mapping.migration, expectedHistoryRow(source));
  });
}

test("all twelve complete recorded function observations retain exact identities/headers and selected role context", () => {
  const fingerprints = [
    ["77cb775bfedfb78996b31fcbdd3ada4c", "ec9ce0a3dc3bcd576cef57c5ea347d58", "uuid"],
    ["1119dd7abe3e643d8d0c6979f19fc2a1", "d5e17459c7a69975b494a3be2e4cd560", "numeric"],
    ["e590e08f9f68cc5fdead8a853af670b9", "c3ef84a1dfa61850a0135fdc66eb9f40", "text"],
    ["1080a60b75ddd930e541297dda1e17dc", "4c02e0ec5af35136eaf483b7950ac1c4", "uuid"],
  ];
  assert.deepEqual(
    observations.map((snapshot) => snapshot.observed_at_utc),
    ["2026-10-15 02:11:11.50546", "2026-10-15 02:11:38.980018", "2026-10-15 02:11:58.84888"],
  );
  assert.equal(evidence.verifiedAtUtc, evidence.finalObservation.observed_at_utc);
  for (const snapshot of observations) {
    assert.equal(snapshot.project_ref, evidence.project_id);
    assert.deepEqual(
      snapshot.roles,
      roles.map((role) => ({ role, found: true })),
    );
    assert.deepEqual(snapshot.execution_context, evidence.preApplyObservation.execution_context);
    assert.equal(snapshot.execution_context.current_user, "postgres");
    assert.equal(snapshot.execution_context.session_user, "postgres");
    assert.equal(snapshot.execution_context.transaction_read_only, "on");
    assert.equal(snapshot.execution_context.search_path, "pg_catalog, pg_temp");
    assert.equal(snapshot.execution_context.statement_timeout, "15s");
    assert.equal(snapshot.execution_context.lock_timeout, "5s");
    assert.deepEqual(
      snapshot.functions.map((fn) => fn.name),
      helperNames,
    );
    for (const [index, fn] of snapshot.functions.entries()) {
      assert.deepEqual(Object.keys(fn).sort(), functionKeys);
      assert.equal(fn.found, true);
      assert.equal(fn.schema, "shop_manager");
      assert.equal(fn.signature, `shop_manager.${helperNames[index]}(uuid)`);
      assert.equal(fn.requested_signature, `shop_manager.${helperNames[index]}(pg_catalog.uuid)`);
      assert.equal(fn.owner, "postgres");
      assert.equal(fn.kind, "f");
      assert.equal(fn.language, "plpgsql");
      assert.equal(fn.security_definer, true);
      assert.deepEqual([fn.definition_md5, fn.body_md5_lf, fn.return_type], fingerprints[index]);
      assert.deepEqual(fn.argument_types, ["uuid"]);
      assert.equal(fn.argument_count, 1);
      assert.equal(fn.argument_defaults_count, 0);
      assert.equal(fn.argument_defaults_md5, null);
      assert.equal(fn.returns_set, false);
      assert.deepEqual(fn.config_keys, ["search_path"]);
      for (const key of ["config_md5", "selected_header_md5"])
        assert.match(fn[key], /^[0-9a-f]{32}$/);
      assert.equal(fn.config_value_hashes.length, 1);
      assert.deepEqual(Object.keys(fn.config_value_hashes[0]).sort(), ["key", "value_md5"]);
      assert.equal(fn.config_value_hashes[0].key, "search_path");
      assert.match(fn.config_value_hashes[0].value_md5, /^[0-9a-f]{32}$/);
      assert.deepEqual(
        fn.effective_acl.map((entry) => entry.role),
        roles,
      );
      for (const entry of fn.effective_acl) {
        assert.deepEqual(Object.keys(entry).sort(), [
          "execute",
          "role",
          "role_found",
          "schema_usage",
        ]);
        assert.equal(entry.role_found, true);
        assert.equal(entry.schema_usage, true);
      }
    }
  }
});

test("recorded stage deltas contain only each approved target ACL and anon/authenticated EXECUTE changes", () => {
  const before = evidence.preApplyObservation.functions;
  for (const [index, fn] of before.entries()) {
    const restricted = index === 2;
    assert.equal(fn.acl, restricted ? restrictedAcl : originalAcl);
    assert.deepEqual(
      fn.normalized_acl,
      restricted ? restrictedNormalizedAcl : originalNormalizedAcl,
    );
    assert.deepEqual(
      fn.effective_acl.map((entry) => entry.execute),
      restricted ? [false, false, true, true] : [true, true, true, true],
    );
  }
  const expectedProfilePost = withRestrictedTarget(before, 0);
  assert.deepEqual(evidence.afterProfileObservation.functions, expectedProfilePost);
  const expectedFinal = withRestrictedTarget(expectedProfilePost, 1);
  assert.deepEqual(evidence.finalObservation.functions, expectedFinal);
  for (const snapshot of observations) {
    assert.deepEqual(
      snapshot.functions[2],
      before[2],
      "previous invoice restriction stays byte-for-field identical",
    );
    assert.deepEqual(
      snapshot.functions[3],
      before[3],
      "quote remains unchanged, including direct public execution",
    );
  }
});

test("each recorded helper step adds exactly one selected history row/statement matching its stored envelope", () => {
  const before = evidence.preApplyObservation.migration_history;
  for (const snapshot of observations) {
    assert.deepEqual(
      snapshot.migration_history.map((group) => group.requested_name),
      historyNames,
    );
    for (const group of snapshot.migration_history)
      assert.equal(group.row_count, group.rows.length);
  }
  assert.deepEqual(
    before.slice(0, 2),
    historyNames.slice(0, 2).map((requested_name) => ({ requested_name, row_count: 0, rows: [] })),
  );
  const expectedProfilePost = structuredClone(before);
  expectedProfilePost[0] = {
    requested_name: historyNames[0],
    row_count: 1,
    rows: [expectedHistoryRow(sourceMappings[0])],
  };
  assert.deepEqual(evidence.afterProfileObservation.migration_history, expectedProfilePost);
  const expectedFinal = structuredClone(expectedProfilePost);
  expectedFinal[1] = {
    requested_name: historyNames[1],
    row_count: 1,
    rows: [expectedHistoryRow(sourceMappings[1])],
  };
  assert.deepEqual(evidence.finalObservation.migration_history, expectedFinal);
  assert.equal(before[2].row_count, 1);
  assert.equal(before[2].rows[0].version, "20261014180351");
  assert.equal(
    before[2].rows[0].sql_sha256_lf,
    "a0a4132c9f17eb4df1d49f0ff735a3da651728b8d1d4d81e979a4e5bc033c1f0",
  );
  for (const snapshot of observations) assert.deepEqual(snapshot.migration_history[2], before[2]);
});

test("recorded approval, exclusions and all global acceptance/recovery limits remain explicit", () => {
  assert.equal(evidence.authority.source, "Direct human reply in this chat");
  assert.equal(evidence.authority.answer, "Approve both helper restrictions");
  assert.match(evidence.authority.scope, /Temporary direct EXECUTE restrictions/);
  assert.match(
    evidence.authority.scope,
    /ensure_profile_for\(uuid\).*calculate_work_order_totals\(uuid\)/,
  );
  assert.match(evidence.authority.scope, /preserving postgres\/service access/);
  assert.match(
    evidence.authority.scope,
    /Quote conversion, native tables\/roles, unsafe recovery, application deployment and data\/history repairs excluded/,
  );
  assert.match(
    evidence.execution.method,
    /one distinct trusted-path postgres-only atomic outer DO per approved helper/,
  );
  assert.match(
    evidence.execution.raw_source_comment_status,
    /Historical UNAPPROVED comments retained unchanged/,
  );
  for (const key of [
    "recovery_executed",
    "business_functions_invoked",
    "business_rows_read",
    "application_deployed",
    "history_repaired",
  ])
    assert.equal(evidence.execution[key], false, key);
  assert.equal(
    evidence.acceptance.scope,
    "Exact two ACL actions and selected stored-source correspondence only",
  );
  for (const key of [
    "global_source_evidence_composer_updated",
    "baselineAccepted",
    "parityAccepted",
    "replayAccepted",
    "releaseAccepted",
    "quoteIndirectPathContained",
  ])
    assert.equal(evidence.acceptance[key], false, key);
  assert.match(evidence.acceptance.global_correspondence_retained, /^404\/423; 19 unclassified/);
  assert.match(
    evidence.acceptance.global_correspondence_retained,
    /do not adopt either original whole-file candidate/,
  );
  const forbiddenKeys = new Set([
    "body",
    "definition",
    "config",
    "config_values",
    "prosrc",
    "proconfig",
    "statements",
    "recovery_sql",
  ]);
  function checkKeys(value) {
    if (value === null || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.ok(!forbiddenKeys.has(key), key);
      checkKeys(child);
    }
  }
  checkKeys(evidence);
});
