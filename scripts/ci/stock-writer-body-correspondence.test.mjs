// Exact six selected LF-body fingerprints only; NOT complete function/schema,
// ACL/trigger/all-writer provenance, native authority, adoption or release.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { buildStockWriterFrontier } from "../parts-stock/writer-frontier.mjs";

const root = new URL("../../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const snapshot = JSON.parse(read("docs/evidence/stock-writer-catalog-2026-10-17.json"));
const specs = [
  {
    sourceId: "holds",
    name: "public.reserve_network_inquiry",
    signature:
      "public.reserve_network_inquiry(_inquiry_id uuid, _business_id uuid, _quantity numeric, _hours integer, _note text)",
    bodySha256Lf: "0fcf5e86a79754ba02f07737d572ab879ad6cf6c9e4bc0de0ce4fd832531e294",
  },
  {
    sourceId: "lifecycle",
    name: "public.active_reservation_qty",
    signature: "public.active_reservation_qty(_item_id uuid)",
    bodySha256Lf: "6ddae59d0e51f67c534ea619c89c2db3a084f90c92a9f2e10fc60a8082a4e595",
  },
  {
    sourceId: "lifecycle",
    name: "public.transition_parts_network_order",
    signature:
      "public.transition_parts_network_order(_order_id uuid, _target_status text, _note text, _hold_hours integer)",
    bodySha256Lf: "eaf119d43864ad8ae189d676abba411570f4967a469345bec3d8d2924dfb0e3f",
  },
  {
    sourceId: "publicInvoice",
    name: "public.sync_invoice_item_inventory",
    signature: "public.sync_invoice_item_inventory()",
    bodySha256Lf: "0cbdf20fd685d8df0e015e149dd634f1081e6db86acf0ecae4cf7843a6916756",
  },
  {
    sourceId: "nativeInvoice",
    name: "shop_manager.sm_apply_invoice_line_stock",
    signature:
      "shop_manager.sm_apply_invoice_line_stock(p_invoice_id text, p_item_id uuid, p_direction text)",
    bodySha256Lf: "4534a9bc428e93ee7cd33ee4cf94fe8a1d931546464466593275fe08b0c197cb",
  },
  {
    sourceId: "nativeInvoice",
    name: "shop_manager.sm_apply_invoice_stock",
    signature: "shop_manager.sm_apply_invoice_stock(p_invoice_id text, p_direction text)",
    bodySha256Lf: "931eaaa32e5936a015a7f5beddddfc76a9769c25f13850d5aa10baf0643970a6",
  },
];
function selectedBody(sql, name) {
  const marker = "CREATE OR REPLACE FUNCTION " + name + "(";
  assert.equal(sql.split(marker).length, 2, "exact unique retained function marker");
  const tail = sql.slice(sql.indexOf(marker));
  const match = tail.match(/\bAS\s+(\$[A-Za-z0-9_]*\$)([\s\S]*?)\1\s*;/i);
  assert.ok(match, "complete dollar-quoted retained body");
  return match[2];
}

test("six selected captured LF bodies match the exact retained source, without promoting whole provenance", () => {
  const frontier = buildStockWriterFrontier();
  assert.equal(specs.length, 6);
  for (const item of specs) {
    const evidence = frontier.sources.find((source) => source.id === item.sourceId);
    assert.ok(evidence);
    const sql = read(evidence.path);
    assert.equal(hash(sql), evidence.wholeSha256);
    const body = selectedBody(sql, item.name);
    assert.equal(hash(body), item.bodySha256Lf);
    const captured = snapshot.functions.filter((row) => row.signature === item.signature);
    assert.equal(captured.length, 1);
    assert.equal(captured[0].bodySha256Lf, item.bodySha256Lf);
    assert.notEqual(hash(body + "\n-- body drift"), item.bodySha256Lf);
    assert.throws(() => selectedBody(sql + sql, item.name), /unique retained function marker/);
  }
  assert.deepEqual(snapshot.acceptance, {
    release: false,
    recovery: false,
    allWriters: false,
    nativeAuthority: false,
    sourceCorrespondence: false,
  });
  assert.ok(Object.values(frontier.flags).every((value) => value === false));
  assert.equal(snapshot.allRequestedObjectsPresent, false);
  assert.deepEqual(snapshot.missingFunctions, ["public.throttle_network_part_inquiry"]);
});
