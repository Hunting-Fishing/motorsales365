import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { appendQuoteWorkflowRelease } from "./build-quote-workflow-release.mjs";
const base = "-- Authorized multi-business shop selection.\nBEGIN;\nSELECT 1;\nCOMMIT;\n";
test("forward composition retains exactly one outer transaction", () => {
  const result = appendQuoteWorkflowRelease(base);
  assert.equal((result.match(/^BEGIN;$/gm) ?? []).length, 1);
  assert.equal((result.match(/^COMMIT;$/gm) ?? []).length, 1);
  assert.ok(result.startsWith(base.slice(0, -"COMMIT;\n".length)));
  assert.ok(result.includes("CREATE FUNCTION public.quote_workflow_change_v1"));
  assert.ok(result.endsWith("COMMIT;\n"));
});
for (const value of [
  null,
  "",
  base.replace("BEGIN;", ""),
  base + "COMMIT;\n",
  base.replace("Authorized multi-business shop selection.", "incomplete"),
])
  test(`incomplete staging package refused: ${String(value).slice(0, 60)}`, () =>
    assert.throws(() => appendQuoteWorkflowRelease(value)));
test("suspension revokes execution without deleting records or reopening legacy writes", () => {
  const text = fs.readFileSync(
    new URL("../../supabase/releases/quote-workflow-suspend-v1.sql", import.meta.url),
    "utf8",
  );
  assert.match(text, /REVOKE ALL ON FUNCTION public\.quote_workflow_change_v1/);
  assert.match(text, /quote_workflow_v1\.execute/);
  assert.doesNotMatch(text, /\b(?:DELETE|DROP|TRUNCATE|GRANT)\b/);
});
