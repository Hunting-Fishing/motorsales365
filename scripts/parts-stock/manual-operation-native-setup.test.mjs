// Tests the actual native runner's transport and actor setup. Child processes
// are mocked here; independent PostgreSQL sessions remain a separate CI job.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { Script, createContext } from "node:vm";
import { PGlite } from "@electric-sql/pglite";
import { buildMixedReservationOrderSource } from "./mixed-reservation-order-source.mjs";

const source = readFileSync(new URL("./manual-operation-native.mjs", import.meta.url), "utf8");
const first = source.indexOf("class Session {");
const last = source.indexOf("\nasync function run()", first);
assert.ok(first > 0 && last > first);
function fixture() {
  const child = new EventEmitter();
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = () => child.emit("close");
  let input = "";
  child.stdin.on("data", (bytes) => (input += bytes.toString()));
  child.stdin.on("finish", () => child.emit("close"));
  const context = createContext({
    assert,
    Buffer,
    spawn: () => child,
    bin: "/verified",
    port: "123",
    sessions: new Set(),
    interrupted: false,
    randomUUID: () => "fixed-id",
    setTimeout,
    clearTimeout,
  });
  new Script(`${source.slice(first, last)}\nglobalThis.Session = Session;`).runInContext(context);
  return { session: new context.Session("/socket", {}), child, input: () => input };
}
for (const sql of [
  "SELECT 1",
  "SELECT 1;",
  "SELECT 1 -- trailing comment",
  "BEGIN; SELECT 1; COMMIT;",
]) {
  test(`SQL executes before the marker: ${sql}`, async () => {
    const f = fixture();
    try {
      const pending = f.session.one(sql);
      assert.equal(f.input(), `${sql}\n;\n\\echo STOCK_DONE_fixedid\n`);
      f.child.stdout.write("1\nSTOCK_DONE_fi");
      f.child.stdout.write("xedid\n");
      assert.equal(await pending, 1);
    } finally {
      await f.session.close();
    }
  });
}
test("a native SQL error retains only its SQLSTATE", async () => {
  const f = fixture();
  const pending = f.session.one("SELECT 1");
  f.child.stderr.write("ERROR:  22023\n");
  f.child.emit("close");
  await assert.rejects(pending, (error) => error.code === "22023");
});
test("unexpected diagnostics cannot become a successful acknowledgment", async () => {
  const f = fixture();
  try {
    const pending = f.session.command("SELECT 1");
    f.child.stderr.write("unexpected diagnostic\n");
    f.child.stdout.write("1\nSTOCK_DONE_fixedid\n");
    await assert.rejects(pending, /diagnostics/);
  } finally {
    await f.session.close();
  }
});
test("actual native actor setup parses and is transaction-local", { timeout: 30000 }, async () => {
  const db = new PGlite();
  try {
    const fixture = buildMixedReservationOrderSource();
    for (const statement of fixture.setupStatements) await db.exec(statement);
    const begin = source.match(/async function begin\(s\) \{\s*await s.command\(`([^`]+)`\);\s*\}/);
    assert.ok(begin, "Expected one literal native actor initialization command");
    const statement = begin[1].replace("${ids.actor}", fixture.ids.actor);
    assert.ok(!statement.includes("${"));
    await db.exec(statement);
    assert.equal(
      (await db.query("SELECT auth.uid()::text actor")).rows[0].actor,
      fixture.ids.actor,
    );
    await db.exec("ROLLBACK");
    assert.equal((await db.query("SELECT auth.uid()::text actor")).rows[0].actor, null);
  } finally {
    await db.close();
  }
});
