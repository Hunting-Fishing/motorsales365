import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../../", import.meta.url));
const retiredPackage = "@lovable.dev/cloud-auth-js";
const retiredDirectory = path.resolve(root, "src/integrations/lovable");
const configPath = path.join(root, "tsconfig.json");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
assert.equal(config.error, undefined, "TypeScript path aliases must be readable");
const aliases = config.config.compilerOptions.paths;
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));

function aliasTargets(specifier, paths) {
  return Object.entries(paths).flatMap(([pattern, targets]) => {
    const star = pattern.indexOf("*");
    if (star === -1) return pattern === specifier ? targets : [];
    const prefix = pattern.slice(0, star);
    const suffix = pattern.slice(star + 1);
    if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) return [];
    const capture = specifier.slice(prefix.length, specifier.length - suffix.length);
    return targets.map((target) => target.replace("*", capture));
  });
}

function isRetiredReference(specifier, importer, paths = aliases) {
  // Vite query suffixes, Windows paths and extension/index spellings must not
  // bypass the same source-module retirement on a different CI operating system.
  const name = specifier.replaceAll("\\", "/").split(/[?#]/, 1)[0];
  if (name === retiredPackage || name.startsWith(`${retiredPackage}/`)) return true;
  const targets = aliasTargets(name, paths).map((target) => path.resolve(root, target));
  if (name.startsWith(".")) targets.push(path.resolve(path.dirname(importer), name));
  else if (path.isAbsolute(name)) targets.push(name);
  else targets.push(path.resolve(root, name));
  return targets.some((target) => {
    const normalized = target.replaceAll("\\", "/").toLowerCase();
    const retired = retiredDirectory.replaceAll("\\", "/").toLowerCase();
    return (
      normalized === retired ||
      normalized.startsWith(`${retired}/`) ||
      (normalized.startsWith(retired) &&
        /^\.(?:[cm]?[jt]sx?)$/.test(normalized.slice(retired.length)))
    );
  });
}

function moduleReferences(source, filename) {
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const bindings = new Map();
  function scopeFor(node) {
    for (let scope = node.parent; scope; scope = scope.parent) {
      if (
        ts.isSourceFile(scope) ||
        ts.isBlock(scope) ||
        ts.isCaseBlock(scope) ||
        ts.isFunctionLike(scope) ||
        ts.isForStatement(scope) ||
        ts.isForInStatement(scope) ||
        ts.isForOfStatement(scope) ||
        ts.isCatchClause(scope)
      )
        return scope;
    }
    return undefined;
  }
  function remember(node) {
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node)) && ts.isIdentifier(node.name)) {
      const scope = scopeFor(node);
      if (!bindings.has(scope)) bindings.set(scope, new Map());
      const isConstant =
        ts.isVariableDeclarationList(node.parent) && node.parent.flags & ts.NodeFlags.Const;
      bindings.get(scope).set(node.name.text, isConstant ? node.initializer : undefined);
    }
    ts.forEachChild(node, remember);
  }
  remember(ast);
  function stringValue(node, seen = new Set()) {
    if (!node) return undefined;
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node))
      return stringValue(node.expression, seen);
    if (ts.isIdentifier(node)) {
      for (let scope = scopeFor(node); scope; scope = scopeFor(scope)) {
        const names = bindings.get(scope);
        if (!names?.has(node.text)) continue;
        const initializer = names.get(node.text);
        if (!initializer || seen.has(initializer)) return undefined;
        return stringValue(initializer, new Set([...seen, initializer]));
      }
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = stringValue(node.left, seen);
      const right = stringValue(node.right, seen);
      if (left !== undefined && right !== undefined) return left + right;
    }
    if (ts.isTemplateExpression(node)) {
      let result = node.head.text;
      for (const span of node.templateSpans) {
        const value = stringValue(span.expression, seen);
        if (value === undefined) return undefined;
        result += value + span.literal.text;
      }
      return result;
    }
    return undefined;
  }
  const references = [];
  function visit(node) {
    let expression;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      expression = node.moduleSpecifier;
    } else if (ts.isImportEqualsDeclaration(node)) {
      if (ts.isExternalModuleReference(node.moduleReference))
        expression = node.moduleReference.expression;
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const isImport = callee.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(callee) && callee.text === "require";
      const isResolve =
        ts.isPropertyAccessExpression(callee) &&
        callee.name.text === "resolve" &&
        ((ts.isIdentifier(callee.expression) && callee.expression.text === "require") ||
          (ts.isMetaProperty(callee.expression) &&
            callee.expression.keywordToken === ts.SyntaxKind.ImportKeyword));
      if (isImport || isRequire || isResolve) expression = node.arguments[0];
    }
    const value = stringValue(expression);
    if (value !== undefined) references.push(value);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return references;
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(filename);
    if (entry.isFile() && /\.[cm]?[jt]sx?$/.test(entry.name)) return [filename];
    return [];
  });
}

const importer = path.join(root, "src/routes/example.tsx");
for (const specifier of [
  retiredPackage,
  `${retiredPackage}/client`,
  "@/integrations/lovable",
  "@/integrations/lovable/index",
  "@/integrations/lovable/index.ts",
  "@/integrations/lovable/index.ts?raw",
  "../integrations/lovable",
  "../integrations/lovable/index.tsx",
  "../routes/../integrations/lovable/index.js",
  "..\\integrations\\lovable\\index.ts",
  "src/integrations/lovable/index.mjs",
  path.join(retiredDirectory, "index.ts"),
]) {
  test(`retirement detects module reference ${specifier}`, () => {
    assert.equal(isRetiredReference(specifier, importer), true);
  });
}

test("retirement follows TypeScript aliases rather than only the current @ spelling", () => {
  assert.equal(
    isRetiredReference("~auth/index", importer, {
      "~auth/*": ["./src/integrations/lovable/*"],
    }),
    true,
  );
});

for (const specifier of [
  "@/integrations/supabase/client",
  "@/integrations/supabase/previewAuthStorage",
  "@lovable.dev/email-js",
  "@lovable.dev/mcp-js/stacks/tanstack/vite",
  "../integrations/lovable-other",
  "../integrations/another.ts",
  "@/lib/google-oauth",
]) {
  test(`retirement leaves unrelated module ${specifier} alone`, () => {
    assert.equal(isRetiredReference(specifier, importer), false);
  });
}

for (const source of [
  'import { lovable } from "@/integrations/lovable";',
  'import "../integrations/lovable/index";',
  'export { lovable } from "@/integrations/lovable";',
  'export * from "@/integrations/lovable";',
  'import legacy = require("../integrations/lovable");',
  'const legacy = require("@lovable.dev/cloud-auth-js");',
  'require.resolve("@/integrations/lovable/index.ts");',
  'import.meta.resolve("@/integrations/lovable");',
  'await import("@/integrations/lovable");',
  'await import("@/integrations/" + "lovable");',
  'const name = "@/integrations/lovable"; await import(name);',
  'const name = "lovable"; await import(`@/integrations/${name}`);',
]) {
  test(`source parsing detects ${source}`, () => {
    assert.ok(
      moduleReferences(source, importer).some((name) => isRetiredReference(name, importer)),
    );
  });
}

test("comments and ordinary string data are not runtime import declarations", () => {
  assert.deepEqual(
    moduleReferences(
      '// import "@/integrations/lovable";\nconst note = "@lovable.dev/cloud-auth-js";',
      importer,
    ),
    [],
  );
});

test("constant import targets respect lexical shadowing and cycles", () => {
  assert.deepEqual(
    moduleReferences(
      `const name = "@/integrations/lovable";
       function other() { const name = "@/integrations/supabase/client"; import(name); }
       import(name);
       function dynamic(name) { import(name); }
       const cycle = cycle; import(cycle);`,
      importer,
    ),
    ["@/integrations/supabase/client", "@/integrations/lovable"],
  );
});

test("the retired source wrapper is absent", () => {
  assert.equal(fs.existsSync(path.join(retiredDirectory, "index.ts")), false);
});

test("runtime and build source has no retired package or wrapper imports", () => {
  const files = [
    ...sourceFiles(path.join(root, "src")),
    ...sourceFiles(path.join(root, "public")),
    ...["vite.config.ts", "playwright.config.ts", "vitest.config.ts", "eslint.config.js"]
      .map((name) => path.join(root, name))
      .filter((filename) => fs.existsSync(filename)),
  ];
  const violations = files.flatMap((filename) =>
    moduleReferences(fs.readFileSync(filename, "utf8"), filename)
      .filter((specifier) => isRetiredReference(specifier, filename))
      .map((specifier) => `${path.relative(root, filename)}: ${specifier}`),
  );
  assert.deepEqual(violations, []);
});

test("package and lock root dependency declarations remain consistent", () => {
  const manifest = readJson("package.json");
  const lock = readJson("package-lock.json");
  assert.equal(lock.lockfileVersion, 3);
  for (const section of ["dependencies", "devDependencies", "optionalDependencies"]) {
    assert.deepEqual(lock.packages[""][section], manifest[section]);
    for (const dependency of Object.keys(manifest[section] ?? {}))
      assert.ok(lock.packages[`node_modules/${dependency}`], `${dependency} must be locked`);
  }
});

test("no manifest or lock dependency still declares the retired package", () => {
  const manifest = readJson("package.json");
  const lock = readJson("package-lock.json");
  for (const [name, metadata] of Object.entries({ manifest, ...lock.packages })) {
    assert.ok(!name.split("node_modules/").includes(retiredPackage), name);
    for (const section of [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ]) {
      assert.equal(metadata[section]?.[retiredPackage], undefined, `${name}: ${section}`);
    }
  }
});

test("other Lovable provider and build dependencies are explicitly retained", () => {
  const manifest = readJson("package.json");
  const lock = readJson("package-lock.json");
  for (const [name, section] of [
    ["@lovable.dev/email-js", "dependencies"],
    ["@lovable.dev/mcp-js", "dependencies"],
    ["@lovable.dev/webhooks-js", "dependencies"],
    ["@lovable.dev/vite-tanstack-config", "devDependencies"],
  ]) {
    assert.equal(typeof manifest[section][name], "string", name);
    assert.equal(lock.packages[""][section][name], manifest[section][name], name);
    assert.ok(lock.packages[`node_modules/${name}`], name);
  }
});
