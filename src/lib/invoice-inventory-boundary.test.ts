// Execute the actual InventoryForm mutation extracted from the route AST.
// SDK doubles prove caller ordering only, not React/RLS/SQL atomicity or stock posting.
import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, Script } from "node:vm";
import * as ts from "typescript";

const path = "src/routes/_authenticated/workspace.invoices.$id.tsx";
const source = readFileSync(resolve(path), "utf8");
const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const helpers = [
  "row",
  "recordId",
  "minorUnits",
  "rowsForInvoice",
  "childRead",
  "amountNumber",
  "receipt",
];
const declarations = helpers.map((name) => {
  const matches = ast.statements.filter(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === name,
  );
  assert.equal(matches.length, 1, `Expected one actual ${name} helper`);
  return matches[0].getText(ast);
});
const limits = ast.statements.flatMap((node) =>
  ts.isVariableStatement(node)
    ? node.declarationList.declarations.filter(
        (value) => value.name.getText(ast) === "DISPLAY_LIMIT",
      )
    : [],
);
assert.equal(limits.length, 1);
const classes = ast.statements.filter(
  (node) => ts.isClassDeclaration(node) && node.name?.text === "FinancialWriteUncertain",
);
assert.equal(classes.length, 1);
const forms = ast.statements.filter(
  (node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === "InventoryForm",
);
assert.equal(forms.length, 1);
const additions = forms[0].body!.statements.flatMap((node) =>
  ts.isVariableStatement(node)
    ? node.declarationList.declarations.filter((value) => value.name.getText(ast) === "add")
    : [],
);
assert.equal(additions.length, 1);
const initializer = additions[0].initializer!;
assert.ok(ts.isCallExpression(initializer));
assert.equal(initializer.expression.getText(ast), "useMutation");
const options = initializer.arguments[0];
assert.ok(ts.isObjectLiteralExpression(options));
const mutations = options.properties.filter(
  (node): node is ts.PropertyAssignment =>
    ts.isPropertyAssignment(node) && node.name.getText(ast) === "mutationFn",
);
assert.equal(mutations.length, 1);
const executable = [
  `const ${limits[0].getText(ast)};`,
  ...declarations,
  classes[0].getText(ast),
  `globalThis.runMutation = ${mutations[0].initializer.getText(ast)};`,
].join("\n");
const compiled = ts.transpileModule(executable, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length, 0);

type Reply = { data: unknown; error: unknown; count?: unknown };
type Write = { table: string; method: string; payload: Record<string, unknown> };
type Read = { table: string; filters: unknown[][]; limit?: number; count?: string };
const invoiceId = "invoice-a";
const customerId = "customer-a";
const selected = { id: "stock-a", name: "Brake pad", sku: "PAD", quantity: 20, cost_per_unit: 5 };
function lines(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `line-${index}`,
    invoice_id: invoiceId,
    total: 10,
  }));
}
function fixture(
  initial = 99,
  options: {
    preflight?: Reply;
    afterPreflight?: () => void;
    afterInsert?: (rows: Record<string, unknown>[]) => void;
    insertReply?: Reply;
  } = {},
) {
  const stored: Record<string, unknown>[] = lines(initial);
  const writes: Write[] = [];
  const reads: Read[] = [];
  let begun = 0;
  let current = true;
  let lineReads = 0;
  const context = createContext({
    selected,
    results: [selected],
    qty: "1",
    price: "10",
    invoiceId,
    customerId,
    invoiceStatus: "draft",
    searchValid: true,
    pickerQ: { isSuccess: true, isFetching: false },
    ack: {
      check: () => {
        if (!current) throw new Error("Scope changed");
      },
    },
    props: {
      beginWrite: () => {
        begun += 1;
      },
    },
    invoiceDb: {
      from: (table: string) => {
        let method = "read";
        let payload: Record<string, unknown> = {};
        const read: Read = { table, filters: [] };
        const execute = async (): Promise<Reply> => {
          if (method === "read") {
            reads.push(read);
            if (table === "invoice_items") {
              lineReads += 1;
              if (lineReads === 1) {
                options.afterPreflight?.();
                if (options.preflight) return options.preflight;
              }
              return { data: stored.slice(), error: null, count: stored.length };
            }
            return {
              data: { id: invoiceId, customer_id: customerId, status: "draft", tax: 5 },
              error: null,
            };
          }
          writes.push({ table, method, payload });
          if (method === "insert") {
            const added = { id: "line-added", ...payload };
            stored.push(added);
            options.afterInsert?.(stored);
            return options.insertReply ?? { data: added, error: null };
          }
          return {
            data: { id: invoiceId, customer_id: customerId, tax: 5, ...payload },
            error: null,
          };
        };
        const query = {
          select: (_fields: string, opts?: { count: string }) => {
            read.count = opts?.count;
            return query;
          },
          eq: (key: string, value: unknown) => {
            read.filters.push([key, value]);
            return query;
          },
          is: (key: string, value: unknown) => {
            read.filters.push([key, value]);
            return query;
          },
          order: () => query,
          limit: (value: number) => {
            read.limit = value;
            return query;
          },
          insert: (value: Record<string, unknown>) => {
            method = "insert";
            payload = value;
            return query;
          },
          update: (value: Record<string, unknown>) => {
            method = "update";
            payload = value;
            return query;
          },
          single: execute,
          maybeSingle: execute,
          then: (yes: (result: Reply) => unknown, no: (error: unknown) => unknown) =>
            execute().then(yes, no),
        };
        return query;
      },
    },
  });
  new Script(compiled.outputText).runInContext(context);
  return {
    writes,
    reads,
    stored,
    started: () => begun,
    invalidate: () => {
      current = false;
    },
    run: () => (context.runMutation as () => Promise<void>)(),
  };
}

test("99 to 100 lines succeeds and recalculates the subtotal and total", async () => {
  const f = fixture();
  await f.run();
  assert.equal(f.stored.length, 100);
  assert.equal(f.started(), 1);
  assert.equal(f.writes.length, 2);
  assert.equal(f.writes[0].method, "insert");
  assert.equal(f.writes[1].table, "invoices");
  assert.equal(f.writes[1].payload.subtotal, 1000);
  assert.equal(f.writes[1].payload.total, 1005);
  assert.equal(f.reads[0].count, "exact");
  assert.equal(f.reads[0].limit, 101);
  assert.deepEqual(JSON.parse(JSON.stringify(f.reads[0].filters)), [["invoice_id", invoiceId]]);
});

for (const count of [100, 101]) {
  test(`${count} existing lines rejects before any write or write admission`, async () => {
    const f = fixture(count);
    await assert.rejects(() => f.run());
    assert.equal(f.writes.length, 0);
    assert.equal(f.started(), 0);
    assert.equal(f.stored.length, count);
  });
}
for (const count of [null, undefined, "99", 0, -1, 98, 100, NaN, Infinity]) {
  test(`uncertain count ${String(count)} rejects before writes`, async () => {
    const f = fixture(99, { preflight: { data: lines(99), count, error: null } });
    await assert.rejects(() => f.run());
    assert.equal(f.writes.length, 0);
    assert.equal(f.started(), 0);
  });
}
for (const data of [
  null,
  {},
  [{ id: "other", invoice_id: "invoice-b", total: 10 }],
  [lines(1)[0], lines(1)[0]],
]) {
  test(`invalid preflight lines reject: ${JSON.stringify(data)}`, async () => {
    const f = fixture(1, { preflight: { data, count: 1, error: null } });
    await assert.rejects(() => f.run());
    assert.equal(f.writes.length, 0);
  });
}

test("preflight SDK error rejects even with otherwise valid data", async () => {
  const f = fixture(99, {
    preflight: { data: lines(99), count: 99, error: { message: "Read failed" } },
  });
  await assert.rejects(() => f.run());
  assert.equal(f.writes.length, 0);
});

test("account or route loss after the read denies the insert", async () => {
  const f = fixture(99, { afterPreflight: () => f.invalidate() });
  await assert.rejects(() => f.run(), /Scope changed/);
  assert.equal(f.writes.length, 0);
  assert.equal(f.started(), 0);
});

test("malformed insert acknowledgment prevents a later header update", async () => {
  const f = fixture(99, { insertReply: { data: null, error: null } });
  await assert.rejects(() => f.run());
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].method, "insert");
});

test("concurrent growth remains uncertain, not atomic proof", async () => {
  const f = fixture(99, {
    afterInsert: (rows) => rows.push({ id: "concurrent", invoice_id: invoiceId, total: 10 }),
  });
  await assert.rejects(() => f.run());
  assert.equal(f.stored.length, 101);
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].method, "insert");
});
