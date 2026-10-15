// Source-body correspondence only. No SQL execution, network or application data.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";

const root = new URL("../../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
const hash = (algorithm, raw) => createHash(algorithm).update(raw).digest("hex");
const source = read("supabase/migrations/20260501224406_1fde4d15-467c-4a50-a39e-089c25417e52.sql");
const marker = "CREATE OR REPLACE FUNCTION public.has_role(";
assert.equal(source.split(marker).length, 2, "unique retained helper declaration");
const start = source.indexOf(marker);
const bodyStart = source.indexOf("AS $$", start) + "AS $$".length;
const end = source.indexOf("$$;", bodyStart);
assert.ok(start >= 0 && bodyStart > start && end > bodyStart);
const section = source.slice(start, end + 3);
const body = source.slice(bodyStart, end);
const captures = [
  [
    "docs/evidence/native-ownership-claim-catalog-2026-10-15.json",
    "d5caade20f8218117fc41d139d581a7e61ab2ad501d1b077cc278bf5ca3dca3a",
  ],
  [
    "docs/evidence/native-owner-intent-catalog-2026-10-15.json",
    "a82598cdf7fd1f1d3310c23e09ecf1885ca9b30f82adefddaf9a8f7d9fb42dad",
  ],
];

test("retained public has_role body is mapped at exact source lines, correcting the earlier mismatch note", () => {
  assert.equal(
    hash("sha256", source),
    "53dd7b960d83bbda344e9a1bb266c13ac4885b627ec2ca96e6fc96d2ceaa0bc7",
  );
  assert.equal(source.slice(0, start).split("\n").length, 45);
  assert.equal(source.slice(0, end + 3).split("\n").length, 56);
  assert.equal(
    hash("sha256", section),
    "73ea4b933bcd47aabfd40efb0e383f6eac045d6da654410dc032b348da5fa2e4",
  );
  assert.equal(hash("md5", body), "dae5cfc5a8d92461a428f6702e4e65af");
});

test("both immutable dated observations match the actual retained body without adopting source history", () => {
  for (const [path, pin] of captures) {
    const raw = read(path);
    assert.equal(hash("sha256", raw), pin, path);
    const observed = JSON.parse(raw);
    assert.equal(observed.projectRef, "wjxaajgvddtrxxtocxen");
    const records = observed.functions.filter(
      (f) => f.signature === "public.has_role(uuid,public.app_role)",
    );
    assert.equal(records.length, 1);
    const f = records[0];
    assert.equal(f.bodyMd5Lf, hash("md5", body));
    assert.equal(f.definitionMd5, "0c2c78626ed8a4807e6cc1b7b54d641c");
    assert.equal(f.owner, "postgres");
    assert.equal(f.language, "sql");
    assert.equal(f.volatility, "s");
    assert.equal(f.securityDefiner, true);
    assert.deepEqual(f.config, ["search_path=public"]);
    assert.equal(
      f.acl,
      "{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres,anon=X/postgres}",
    );
    assert.equal(f.anonExecute, true);
    assert.equal(f.authenticatedExecute, true);
    assert.equal(f.serviceExecute, true);
    assert.equal(f.postgresExecute, true);
    if (f.definition) {
      assert.equal(hash("md5", f.definition), f.definitionMd5);
      assert.equal(
        f.definition.slice(
          f.definition.indexOf("AS $function$") + "AS $function$".length,
          f.definition.lastIndexOf("$function$"),
        ),
        body,
      );
    }
    for (const field of ["acceptedBaseline", "appliedHistory", "releaseReady", "rows"])
      assert.ok(!Object.hasOwn(observed, field));
  }
});

test("platform role lookup is not native role-assignment authority or a direct-write/policy proof", () => {
  assert.match(section, /_role public\.app_role/);
  assert.match(body, /FROM public\.user_roles/);
  assert.match(body, /WHERE user_id = _user_id AND role = _role/);
  assert.doesNotMatch(
    section,
    /shop_manager\.|auth\.uid\(|\b(?:INSERT|UPDATE|DELETE|GRANT|REVOKE)\b/i,
  );
  // No helper executes: correspondence does not close its policy, writer,
  // caller-subject, role-grant provenance, source ordering or migration history.
});
