// Offline local-source verification only. No engines, Auth stubs or SQL execution.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { buildStockWriterFrontier } from "./writer-frontier.mjs";

const read = (path) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const expectedPins = [
  ["publicApp", "67775ae059d2785cc43b9d454d0c2b8a5a8a70b12bb5e952ef033dee730faec6"],
  ["inquiryApp", "cdbcb8e3b8c0e293cc2f007c32783a0ec99dd4bb660fe176110b25f1e080b40a"],
  ["b2bApp", "ab13e2fa5581038f57c0935fda65f58c7203f1c5b3bf273e50e6fd6cdcb6b576"],
  ["publicInvoiceApp", "83da4dead41ebed3aaeb366c1d214264783bc4c2d08dcd91c20e4674cf13bfc6"],
  ["authorityApp", "3c16c38eda5e4213aaac23a16194722ca413ec454aa8006f4b48a7e586f51868"],
  ["schemaApp", "3ca5aa5a40b5393aa9cbe8c1a16ea7a1cf265ac19d3c5590e78b005d72ac41df"],
  ["publicUI", "5e1bc94bb4f6721f67d76716c5965e3f593ec86eee7b15f82df10c9c3db674a0"],
  ["b2bUI", "af06064d5bcd70ef2a556c43bb6b3b2ad79e2a26552a9a9ae22e427ae7439192"],
  ["nativeAdjustApp", "f57718a4327a98a9508bbbda07c281f9c26b35f3cfe57c8cc0556f1249e3cfba"],
  ["counterApp", "6c3a7e6db00eeed566eb8875c84dc24eb7dd82a625aec3827d4860a63146ca27"],
  ["nativePOApp", "4631f5aa24ea77e7cd8fffd75f588f399e9743e49447d77940bba32b5bcd064c"],
  ["base", "69afe9112531bd75d0bc68d4b31461d9e1c9aae41337ebdf79e6f40056447d62"],
  ["holds", "90fdbede35c8ac9f1e88f09b183ac7014ddee7455d029228b1121def6ee40726"],
  ["lifecycle", "3fc2cdc241821d00fb37d7c75684062ba5c01d0519092e76e37d09b82380f654"],
  ["publicInvoice", "50b8f806c0ba6be35dc2dfe2d460893d5623d860dfdf154f163e46b52ef1e11f"],
  ["canonicalLink", "1ac1aaed2fb7fe17bd10a73a1f62f9eab4764248bf257518b84b14db23752522"],
  ["nativeInvoice", "986072fe947cfd86be305f96379511fed826252d5e80af233c8482a7fb6559f5"],
  ["counterBase", "e2736908cc1e3343e4cb1a784c0f839ff198e0754c015f39b831fb3482f0327c"],
  ["counterCostPatch", "15e741d94f1fe43cd29ffcff6bb9afff8e1a9ba8be560ab7f4537c2b43483d06"],
  ["counterRolePatch", "787ea0c006653a37c515482fc8748cc792f4a8e140dba5dc8d1bb15b94400608"],
  ["demoSeed", "cee2458aa9175efd5a91650bbdf498c1fb500bb869a16a9bb39e858aca690061"],
  ["quarantine", "aee5a7fce98c9d4d6d6bcfa596092031f94e8e99ce8bd7f5fe95aa414a7e3cd5"],
];
const expectedIds = [
  "public-direct-stock",
  "inquiry-lifecycle",
  "parts-lifecycle",
  "public-invoice-stock",
  "native-manual-adjustment",
  "native-counter-sale",
  "native-purchase-order-receiving",
  "native-invoice-stock",
  "canonical-inventory-identity",
  "demo-reset-cascades",
];

test("exact source-span and writer-gap metadata cannot drift silently", () => {
  const result = buildStockWriterFrontier();
  const sources = result.sources
    .map(({ id, path, start, end, wholeSha256, spanSha256, lfBytes }) =>
      [id, path, start, end, wholeSha256, spanSha256, lfBytes].join("\t"),
    )
    .join("\n");
  const inventory = result.inventory
    .map(({ id, domains, writers, evidence, gap }) =>
      [
        id,
        domains.join(","),
        writers.join(","),
        evidence.map((source) => source.id).join(","),
        gap,
      ].join("\t"),
    )
    .join("\n");
  assert.equal(hash(sources), "6d1459c623f487884a86bd5f437f52af10a3000f3e85cfb6ec3fd9d7dda6281e");
  assert.equal(hash(inventory), "3fa793305c9f76ceaf789a531a248d98f30f86b85ea42584b4e5cc028b758675");
});

test("fixed frontier has exactly eleven app and eleven whole SQL pins", () => {
  const result = buildStockWriterFrontier();
  assert.deepEqual(
    result.sources.map(({ id, wholeSha256 }) => [id, wholeSha256]),
    expectedPins,
  );
  assert.equal(result.sources.filter(({ path }) => path.startsWith("src/")).length, 11);
  assert.equal(
    result.sources.filter(({ path }) => path.startsWith("supabase/migrations/")).length,
    11,
  );
  assert.equal(new Set(result.sources.map(({ path }) => path)).size, 22);
  for (const source of result.sources) {
    const text = read(source.path);
    assert.equal(hash(text), source.wholeSha256);
    assert.equal(Buffer.byteLength(text), source.lfBytes);
    assert.equal(
      hash(
        text
          .split("\n")
          .slice(source.start - 1, source.end)
          .join("\n"),
      ),
      source.spanSha256,
    );
    assert.notEqual(hash(`${text}\n// drift`), source.wholeSha256);
  }
});

test("inventory IDs are unique and evidence remains fixed, complete and detached", () => {
  const result = buildStockWriterFrontier();
  assert.deepEqual(
    result.inventory.map(({ id }) => id),
    expectedIds,
  );
  assert.equal(new Set(expectedIds).size, 10);
  const used = new Set();
  for (const row of result.inventory) {
    assert.ok(row.writers.length > 0 && row.evidence.length > 0 && row.gap.length > 100);
    assert.equal(new Set(row.evidence.map(({ id }) => id)).size, row.evidence.length);
    for (const evidence of row.evidence) {
      const source = result.sources.find(({ id }) => id === evidence.id);
      assert.deepEqual(evidence, source);
      assert.notEqual(evidence, source);
      used.add(evidence.id);
    }
  }
  assert.equal(used.size, 22);
});

test("gap witnesses preserve each newly exposed writer boundary", () => {
  const result = buildStockWriterFrontier();
  const expected = [
    [
      "Existing-item metadata edits exclude stock counters",
      "interlocked without writes",
      "getClaims",
    ],
    ["private mixed-hold candidate", "New UUID", "Auth-to-guest", "unknown-outcome"],
    ["shipping, receiving, transfers, returns, quarantine", "Global multi-item lock/phantom"],
    ["invoice-item triggers deduct/restore", "Combined hold admission"],
    ["Cached currentQty", "separate inventory_transactions", "public 14-table"],
    ["cost/role patches dynamically rewrite", "Applied body/patch correspondence"],
    ["received_quantity", "separate requests", "Inventory posting triggers"],
    ["integer quantity casts and GREATEST clamps", "journal implementation are not pinned"],
    ["current grants/body/native permission revocation", "claim/offboarding"],
    ["deletes/recreates marked stock in both domains", "not authorization to execute"],
  ];
  expected.forEach((phrases, index) =>
    phrases.forEach((phrase) => assert.ok(result.inventory[index].gap.includes(phrase))),
  );
  assert.ok(result.inventory[2].writers.includes("transition_parts_receiving_exception"));
  assert.ok(result.inventory[7].writers.includes("sm_void_journal_by_source"));
});

test("public and native domains remain separate and every acceptance flag stays false", () => {
  const result = buildStockWriterFrontier();
  assert.deepEqual(Object.keys(result.flags), [
    "currentCatalogParity",
    "allWritersCompatible",
    "nativeAuthorityVerified",
    "durableOutcomeReconciliation",
    "globalNoOversell",
    "appAdoptionReady",
    "releaseReady",
  ]);
  assert.ok(Object.values(result.flags).every((value) => value === false));
  assert.ok(result.domains.public.includes("network_part_inquiries"));
  assert.ok(result.domains.public.includes("parts_reservations"));
  assert.ok(result.domains.shop_manager.includes("counter_sale_lines"));
  assert.ok(!result.domains.shop_manager.includes("counter_sale_items"));
  assert.deepEqual(result.inventory[9].domains, ["public", "shop_manager"]);
  assert.match(result.coverage, /not all deployed, external or dynamic writers/);
});

test("no options accepted; nested results are frozen and fresh on each call", () => {
  for (const value of [undefined, null, {}, [], "sql", true]) {
    assert.throws(() => buildStockWriterFrontier(value), /accepts no arguments/);
  }
  const first = buildStockWriterFrontier();
  const second = buildStockWriterFrontier();
  function check(left, right) {
    if (left !== null && typeof left === "object") {
      assert.ok(Object.isFrozen(left));
      assert.notEqual(left, right);
      Object.keys(left).forEach((key) => check(left[key], right[key]));
    }
  }
  assert.deepEqual(first, second);
  check(first, second);
  assert.throws(() => {
    first.flags.releaseReady = true;
  }, TypeError);
  assert.throws(() => first.inventory[0].evidence.pop(), TypeError);
});

test("builder import is inert local Node evidence, without execution/client bindings", () => {
  const source = read("scripts/parts-stock/writer-frontier.mjs");
  const imports = [...source.matchAll(/^import .* from "([^"]+)";/gm)].map((match) => match[1]);
  assert.deepEqual(imports, ["node:fs", "node:crypto", "node:buffer"]);
  assert.doesNotMatch(
    source,
    /\b(process|fetch|eval|Function|PGlite)\b|node:(?:child_process|net|http|https)|@supabase|execute_sql/,
  );
  const beforeBuilder = source.slice(
    0,
    source.indexOf("export function buildStockWriterFrontier()"),
  );
  assert.doesNotMatch(beforeBuilder, /readFileSync\s*\(/);
  assert.equal((source.match(/readFileSync\s*\(/g) ?? []).length, 1);
  assert.match(source, /if \(arguments\.length !== 0\)/);
});
