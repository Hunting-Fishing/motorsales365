// Offline artifact contracts, not a SQL sandbox or live parity/authorization proof.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";

const evidence = new URL("../../docs/evidence/", import.meta.url);
const pins = [
  [
    "native-chat-security-catalog-review.sql",
    4269,
    "2029a48ab7e540dbf10e2d8d2d54e2d0d6573f9c068ec0ced476296cccb8d441",
  ],
  [
    "native-incoming-attachments-catalog-review.sql",
    3660,
    "a5201e6c9376d2a2407b9afe08618d8a97a4534ea823c516b2d6948ebb779611",
  ],
  [
    "native-chat-security-catalog-2026-10-15.json",
    9231,
    "5ca3902814a8a607d04d67b5ae250768a4717338fa73f508504e621303065911",
  ],
  [
    "native-incoming-attachments-catalog-2026-10-15.json",
    21280,
    "37dc6a12548b43b992c12c41c1b4a0f558ac02188870469fd8dc82c0b5dc4c30",
  ],
];
function readPinned([name, bytes, digest]) {
  const value = fs.readFileSync(new URL(name, evidence), "utf8").replace(/\r\n/g, "\n");
  assert.equal(Buffer.byteLength(value), bytes, name);
  assert.equal(createHash("sha256").update(value).digest("hex"), digest, name);
  return value;
}
const loaded = pins.map(readPinned);
const chat = JSON.parse(loaded[2]);
const incoming = JSON.parse(loaded[3]);
const relation = (row) => `${row.schema}.${row.table}`;

test("dated catalog artifacts preserve canonical identity and distinct observations", () => {
  for (const item of [chat, incoming]) {
    assert.equal(item.projectRef, "wjxaajgvddtrxxtocxen");
    assert.equal(Object.hasOwn(item, "project"), false);
    assert.match(item.scope, /Separate observations, not a shared snapshot/);
    assert.match(item.scope, /does not enforce read-only transaction or timeouts/);
  }
  assert.equal(chat.observed_at_utc, "2026-10-14 23:14:53.057469");
  assert.equal(incoming.observed_at_utc, "2026-10-14 23:14:53.668961");
});

test("pinned review SQL retains catalog-only structure without application rows or writes", () => {
  for (const sql of loaded.slice(0, 2)) {
    // Deliberately only static checks of these exact hashed, manually reviewed files.
    // No general SQL safety validation or remote execution is provided here.
    const code = sql.replace(/--[^\n]*/g, "").replace(/'(?:''|[^'])*'/g, "''");
    assert.match(code.trimStart(), /^(?:SELECT|WITH)\b/);
    assert.equal((code.match(/;/g) || []).length, 1);
    assert.doesNotMatch(
      code,
      /\b(?:INSERT|UPDATE|DELETE|MERGE|CALL|DO|COPY|ALTER|CREATE|DROP|GRANT|REVOKE|SET|BEGIN|COMMIT)\b/i,
    );
    for (const match of code.matchAll(/\b(?:FROM|JOIN)\s+([\w.]+)/gi)) {
      assert.ok(
        match[1].startsWith("pg_catalog.") || ["targets", "attached"].includes(match[1]),
        match[1],
      );
    }
    assert.doesNotMatch(code, /\b(?:public|shop_manager|auth)\./);
  }
});

test("chat observation distinguishes helper execution from authenticated-only row policies", () => {
  assert.deepEqual(chat.tables.map(relation), [
    "public.chat_thread_members",
    "public.chat_threads",
  ]);
  assert.deepEqual(
    chat.functions.map((row) => row.signature),
    ["is_active_thread_member(uuid,uuid)", "is_thread_member(uuid,uuid)"],
  );
  for (const fn of chat.functions) {
    assert.equal(fn.owner, "postgres");
    assert.equal(fn.language, "sql");
    assert.equal(fn.security_definer, true);
    assert.equal(fn.volatility, "s");
    assert.deepEqual(fn.search_path, ["search_path=public"]);
    assert.equal(fn.anon_execute, true);
    assert.equal(fn.authenticated_execute, true);
    assert.equal(fn.service_execute, true);
    assert.match(fn.acl, /\{=X\/postgres,/);
  }
  for (const table of chat.tables) {
    assert.equal(table.owner, "postgres");
    assert.equal(table.rls, true);
    assert.equal(table.force_rls, false);
    assert.deepEqual(table.user_triggers, []);
    assert.equal(table.policies.length, 3);
    assert.deepEqual(table.policies.map((row) => row.command).sort(), ["a", "r", "w"]);
    for (const policy of table.policies) {
      assert.equal(policy.permissive, true);
      assert.deepEqual(policy.roles, ["authenticated"]);
    }
    assert.ok(table.columns.every((column) => column.acl === null));
    assert.ok(table.constraints.every((constraint) => constraint.validated));
    assert.ok(table.indexes.every((index) => index.ready && index.valid));
  }
});

test("incoming observation remains six relations, eleven attachments/functions and three selected index definitions", () => {
  assert.deepEqual(incoming.tables.map(relation), [
    "public.businesses",
    "shop_manager.cash_registers",
    "shop_manager.employee_shifts",
    "shop_manager.employee_work_locations",
    "shop_manager.register_sessions",
    "shop_manager.shops",
  ]);
  assert.deepEqual(
    incoming.tables.map((row) => row.user_triggers.length),
    [10, 0, 0, 0, 0, 1],
  );
  const triggers = incoming.tables.flatMap((row) => row.user_triggers);
  assert.equal(triggers.length, 11);
  assert.deepEqual(
    triggers.map((row) => row.function).sort(),
    incoming.functions.map((row) => row.signature).sort(),
  );
  for (const trigger of triggers) {
    assert.equal(trigger.enabled, "O");
    assert.equal(trigger.argument_count, 0);
    assert.equal(trigger.arguments_md5, "8ff36f0a5f717f7187ae41c6fe8874c3");
    assert.equal(trigger.when_md5, null);
    assert.equal(Object.hasOwn(trigger, "arguments"), false);
  }
  const definitions = incoming.tables
    .flatMap((row) => row.indexes)
    .filter((index) => index.selected_definition !== null);
  assert.deepEqual(definitions.map((index) => index.name).sort(), [
    "employee_shifts_one_open_per_user",
    "register_one_open",
    "shops_one_per_business",
  ]);
  for (const index of definitions) {
    assert.equal(index.unique && index.valid && index.ready, true);
    assert.equal(
      createHash("md5").update(index.selected_definition).digest("hex"),
      index.definition_md5,
    );
  }
  const defaultLocation = incoming.functions.find(
    (fn) => fn.signature === "shop_manager.create_default_employee_work_location()",
  );
  assert.equal(defaultLocation.anon_execute, true);
  assert.equal(defaultLocation.authenticated_execute, true);
  assert.match(defaultLocation.acl, /\{=X\/postgres,/);
  // Effective EXECUTE on a trigger-returning function is not normal RPC invocation.
  assert.ok(incoming.functions.every((fn) => !Object.hasOwn(fn, "body")));
});

test("incoming documentation's bounded retained source and section/body pins match saved metadata", () => {
  // These manual Markdown tables are a review map, not inferred SQL dependency
  // closure. Read only the known alias table and two exact section tables.
  const document = fs
    .readFileSync(new URL("NATIVE_INCOMING_ATTACHMENT_INVENTORY.md", evidence), "utf8")
    .replace(/\r\n/g, "\n");
  const rows = (start, end) =>
    document
      .slice(document.indexOf(start), document.indexOf(end))
      .split("\n")
      .filter((line) => /^\|/.test(line))
      .map((line) =>
        line
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim().replaceAll("`", "")),
      );
  const aliases = new Map();
  for (const [alias, filename, digest] of rows(
    "## Retained whole-source pins",
    "### Eleven exact selected function bodies",
  )) {
    if (!/^[a-f0-9]{64}$/.test(digest ?? "")) continue;
    assert.match(filename, /^\d{14}_[A-Za-z0-9_-]+\.sql$/);
    assert.equal(aliases.has(alias), false);
    const source = fs
      .readFileSync(new URL(`../../supabase/migrations/${filename}`, import.meta.url), "utf8")
      .replace(/\r\n/g, "\n");
    assert.equal(createHash("sha256").update(source).digest("hex"), digest, filename);
    aliases.set(alias, source);
  }
  assert.equal(aliases.size, 12);
  function section(location, digest) {
    const match = location.match(/^(\w+) (\d+)–(\d+)$/);
    assert.ok(match, location);
    const source = aliases.get(match[1]);
    assert.ok(source, match[1]);
    const selected = source
      .split("\n")
      .slice(Number(match[2]) - 1, Number(match[3]))
      .join("\n");
    assert.equal(createHash("sha256").update(selected).digest("hex"), digest, location);
    return selected;
  }
  const functions = [];
  for (const [identity, location, digest, bodyDigest] of rows(
    "### Eleven exact selected function bodies",
    "### Eleven retained attachment sections",
  )) {
    if (!/^[a-f0-9]{64}$/.test(digest ?? "")) continue;
    const selected = section(location, digest);
    const declaration = selected.match(/^CREATE OR REPLACE FUNCTION\s+([^\s(]+)\(/);
    assert.ok(declaration, identity);
    assert.equal(declaration[1] + "()", identity);
    const body = selected.match(/\bAS\s+(\$(?:[A-Za-z_]\w*)?\$)([\s\S]*?)\1;\s*$/i);
    assert.ok(body, identity);
    assert.equal(createHash("md5").update(body[2]).digest("hex"), bodyDigest, identity);
    const catalogIdentity = identity.startsWith("public.") ? identity.slice(7) : identity;
    assert.equal(
      incoming.functions.find((fn) => fn.signature === catalogIdentity)?.body_md5_lf,
      bodyDigest,
      identity,
    );
    functions.push(catalogIdentity);
  }
  assert.deepEqual(functions.sort(), incoming.functions.map((fn) => fn.signature).sort());
  const attachments = [];
  const observedNames = incoming.tables.flatMap((table) =>
    table.user_triggers.map((trigger) => trigger.name),
  );
  for (const [name, location, digest] of rows(
    "### Eleven retained attachment sections",
    "The retained source search additionally",
  )) {
    if (!/^[a-f0-9]{64}$/.test(digest ?? "")) continue;
    const selected = section(location, digest);
    const declaration = selected.match(/^CREATE TRIGGER\s+(\w+)\b/);
    assert.ok(declaration, name);
    assert.equal(declaration[1], name);
    assert.ok(observedNames.includes(name), name);
    attachments.push(name);
  }
  assert.deepEqual(attachments.sort(), observedNames.sort());
});
