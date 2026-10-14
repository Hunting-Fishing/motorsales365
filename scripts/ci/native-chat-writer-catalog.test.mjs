// Exact reviewed artifacts only: not a SQL parser, remote executor or live parity proof.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";

function pinned(name, bytes, digest) {
  const raw = fs
    .readFileSync(new URL(`../../docs/evidence/${name}`, import.meta.url), "utf8")
    .replace(/\r\n/g, "\n");
  assert.equal(Buffer.byteLength(raw), bytes);
  assert.equal(createHash("sha256").update(raw).digest("hex"), digest);
  return raw;
}
const sql = pinned(
  "native-chat-writer-catalog-review.sql",
  8791,
  "7020c6b483dd2d1e08b3d482b3aa4f6ff5e885a11fef554ecf70a7d0656d8cbc",
);
const observed = JSON.parse(
  pinned(
    "native-chat-writer-catalog-2026-10-15.json",
    24965,
    "d30e32e7e678860c89252c31fae045ce7a7c574ed4683d47ca5c7414bba73c6f",
  ),
);
const writers = [
  "create_group_chat(text,uuid[])",
  "invite_to_thread(uuid,uuid[])",
  "leave_thread(uuid)",
  "mark_thread_read(uuid)",
  "mark_thread_unread(uuid)",
  "respond_to_thread_invite(uuid,boolean)",
];
const dependencies = [
  "notify_user(uuid,text,text,text,text,text,uuid,jsonb)",
  "tg_notify_chat_thread_message()",
  "tg_touch_chat_thread()",
  "trg_thread_message_notify()",
  "user_notifications_lock_columns()",
];

test("review artifacts retain canonical identity, dated bounded sets and explicit operational limits", () => {
  assert.equal(observed.projectRef, "wjxaajgvddtrxxtocxen");
  assert.equal(observed.observed_at_utc, "2026-10-14 23:34:25.907315");
  assert.match(observed.scope, /Separate observations, not a shared snapshot/);
  assert.match(observed.scope, /does not enforce READ ONLY transaction or timeouts/);
  assert.deepEqual(
    observed.tables.map((table) => `${table.schema}.${table.table}`),
    ["public.chat_thread_messages", "public.user_notifications"],
  );
  assert.deepEqual(
    observed.functions.map((fn) => fn.signature).sort(),
    [...writers, ...dependencies].sort(),
  );
  assert.deepEqual(
    observed.tables[0].user_triggers.map((trigger) => trigger.name),
    ["thread_message_notify", "trg_notify_chat_thread_message", "trg_touch_chat_thread_on_message"],
  );
  assert.deepEqual(
    observed.tables[1].user_triggers.map((trigger) => trigger.name),
    ["trg_user_notifications_lock_columns"],
  );
});

test("static checks protect only the exact hashed catalog SELECT, not arbitrary SQL safety", () => {
  const code = sql.replace(/--[^\n]*/g, "").replace(/'(?:''|[^'])*'/g, "''");
  assert.match(code.trimStart(), /^WITH\b/);
  assert.equal((code.match(/;/g) || []).length, 1);
  assert.doesNotMatch(
    code,
    /\b(?:INSERT|UPDATE|DELETE|MERGE|CALL|DO|COPY|ALTER|CREATE|DROP|GRANT|REVOKE|SET|BEGIN|COMMIT)\b/i,
  );
  for (const match of code.matchAll(/\b(?:FROM|JOIN)\s+([\w.]+)/gi)) {
    assert.ok(
      match[1].startsWith("pg_catalog.") ||
        ["targets", "attached", "selected_functions"].includes(match[1]),
      match[1],
    );
  }
  assert.doesNotMatch(code, /\b(?:public|auth|shop_manager)\./);
  assert.match(
    sql,
    /'argument_defaults_md5',pg_catalog\.md5\(pg_catalog\.pg_get_expr\(p\.proargdefaults,0\)\)/,
  );
});

test("selected writer EXECUTE differs from dependency/trigger execution and protected values remain hashed", () => {
  for (const fn of observed.functions) {
    assert.equal(fn.schema, "public");
    assert.equal(fn.owner, "postgres");
    assert.equal(fn.language, "plpgsql");
    assert.equal(fn.volatility, "v");
    assert.equal(fn.security_definer, fn.name !== "tg_touch_chat_thread");
    assert.equal(fn.returns_set, false);
    assert.equal(fn.anon_execute, false);
    assert.equal(fn.authenticated_execute, writers.includes(fn.signature));
    assert.equal(fn.service_execute, true);
    assert.deepEqual(fn.search_path, ["search_path=public"]);
    assert.deepEqual(fn.config_keys, ["search_path"]);
    assert.deepEqual(fn.config_value_hashes, [
      { key: "search_path", value_md5: "4c9184f37cff01bcdc32dc486ec36961" },
    ]);
    assert.equal(fn.config_md5, "dcd2abd514173991611a622e71d06e6f");
    assert.equal(Object.hasOwn(fn, "body"), false);
    assert.equal(Object.hasOwn(fn, "argument_defaults"), false);
    assert.equal(Object.hasOwn(fn, "config_values"), false);
    assert.equal(fn.argument_defaults_count, fn.name === "notify_user" ? 1 : 0);
    assert.equal(
      fn.argument_defaults_md5,
      fn.name === "notify_user" ? "f3db357cf4f4a03883484fa3281a056c" : null,
    );
  }
  for (const table of observed.tables) {
    assert.equal(table.owner, "postgres");
    assert.equal(table.rls, true);
    assert.equal(table.force_rls, false);
    assert.ok(table.columns.every((column) => column.acl === null));
    assert.ok(table.constraints.every((constraint) => constraint.validated));
    for (const trigger of table.user_triggers) {
      assert.equal(trigger.enabled, "O");
      assert.equal(trigger.level, "ROW");
      assert.equal(trigger.argument_count, 0);
      assert.equal(trigger.arguments_md5, "8ff36f0a5f717f7187ae41c6fe8874c3");
      assert.equal(Object.hasOwn(trigger, "arguments"), false);
      assert.equal(Object.hasOwn(trigger, "when"), false);
    }
  }
});
