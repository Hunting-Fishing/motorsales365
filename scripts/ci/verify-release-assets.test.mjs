import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";
import { parsePublicTree, verifyReleaseAssets } from "./verify-release-assets.mjs";

const revision = "a".repeat(40);
const oid = "b".repeat(40);
const line = (name = "public/banner.webp", mode = "100644", hash = oid) =>
  `${mode} blob ${hash}\t${name}\0`;
const script = fileURLToPath(new URL("verify-release-assets.mjs", import.meta.url));
const repo = fileURLToPath(new URL("../../", import.meta.url));
const command = (root, args) =>
  execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 10000,
  });
function write(root, name, content) {
  const target = path.join(root, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "365-release-assets-"));
  t.after(() => {
    // Cleanup only the exact temporary directory created for this fixture.
    const resolved = path.resolve(root);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith("365-release-assets-"));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  command(root, ["init", "--quiet"]);
  command(root, ["config", "core.autocrlf", "false"]);
  write(root, "public/banner.webp", Buffer.from([0, 1, 2, 0xff]));
  write(root, "public/flashcards/data.json", '{"synthetic":true}\n');
  command(root, ["add", "--", "public"]);
  command(root, [
    "-c",
    `core.hooksPath=${path.join(root, "no-hooks")}`,
    "-c",
    "commit.gpgsign=false",
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "Synthetic public assets",
  ]);
  for (const name of ["banner.webp", "flashcards/data.json"])
    write(root, `.output/public/${name}`, fs.readFileSync(path.join(root, "public", name)));
  write(
    root,
    ".output/server/wrangler.json",
    JSON.stringify({
      name: "motorsales365",
      main: "index.mjs",
      assets: { directory: "../public" },
    }),
  );
  return root;
}

test("NUL-delimited tree keeps spaces/unicode and executable blobs without shell parsing", () => {
  assert.deepEqual(
    parsePublicTree(line("public/real image 車.webp") + line("public/sw.js", "100755"), revision),
    [
      { name: "public/real image 車.webp", oid },
      { name: "public/sw.js", oid },
    ],
  );
});
for (const raw of [
  "",
  line().slice(0, -1),
  line("public/../outside"),
  line("public//double"),
  line("public/./dot"),
  line("public/a\\b"),
  line("public/a\nb"),
  line("public/C:drive"),
  line("public/a."),
  line("public/a "),
  line("public/NUL.txt"),
  line("public/COM1.js"),
  line("public/a?.png"),
  line("public/é.png") + line("public/e\u0301.png"),
  line("private/banner.webp"),
  line("public/link", "120000"),
  line("public/module", "160000"),
  line() + line(),
  line("public/A.png") + line("public/a.png"),
  line("public/bad", "100644", "f".repeat(64)),
]) {
  test("reject malformed/path/mode/alias tree case " + JSON.stringify(raw), () => {
    assert.throws(() => parsePublicTree(raw, revision), /Release assets blocked/);
  });
}
test("reject nonliteral revision before accepting a tree", () => {
  assert.throws(() => parsePublicTree(line(), "HEAD"), /invalid local tree/);
});
test("complete committed source and exact copied output pass without credentials or remote", (t) => {
  const root = fixture(t);
  const result = verifyReleaseAssets(root);
  assert.equal(result.trackedPublicFiles, 2);
  assert.equal(result.revision, command(root, ["rev-parse", "HEAD"]).trim());
  assert.equal(command(root, ["remote"]).trim(), "");
  assert.equal(command(root, ["status", "--porcelain", "--untracked-files=no"]).trim(), "");
});
for (const configDirectory of ["..\\public", "../public/."]) {
  test("actual normalized platform output directory passes: " + configDirectory, (t) => {
    const root = fixture(t);
    write(
      root,
      ".output/server/wrangler.json",
      JSON.stringify({ assets: { directory: configDirectory } }),
    );
    assert.equal(verifyReleaseAssets(root).trackedPublicFiles, 2);
  });
}
for (const name of ["public/banner.webp", ".output/public/banner.webp"]) {
  test("missing source or copied asset rejects: " + name, (t) => {
    const root = fixture(t);
    fs.unlinkSync(path.join(root, name));
    assert.throws(() => verifyReleaseAssets(root), /missing, unreadable or unsafe/);
  });
  test("changed source or copied asset rejects: " + name, (t) => {
    const root = fixture(t);
    write(root, name, "synthetic-private-value-do-not-print");
    assert.throws(() => verifyReleaseAssets(root), /differs from/);
  });
}
test("matching changed source/output still rejects because neither matches committed HEAD", (t) => {
  const root = fixture(t);
  for (const name of ["public/banner.webp", ".output/public/banner.webp"]) write(root, name, "new");
  assert.throws(() => verifyReleaseAssets(root), /differs from HEAD/);
});
for (const value of [
  undefined,
  "../server",
  "../../../private",
  "/tmp/public",
  "C:\\private",
  "..\n/public",
  1,
]) {
  test("missing/escaped/wrong output directory rejects: " + JSON.stringify(value), (t) => {
    const root = fixture(t);
    write(root, ".output/server/wrangler.json", JSON.stringify({ assets: { directory: value } }));
    assert.throws(() => verifyReleaseAssets(root), /expected build output/);
  });
}
test("malformed build JSON rejects without echoing its contents", (t) => {
  const root = fixture(t);
  write(root, ".output/server/wrangler.json", "synthetic-private-value-do-not-print");
  assert.throws(
    () => verifyReleaseAssets(root),
    /^Error: Release assets blocked: build configuration/,
  );
});
for (const name of ["public/.assetsignore", ".output/public/.assetsignore"]) {
  test("asset exclusions require explicit review: " + name, (t) => {
    const root = fixture(t);
    write(root, name, "*.webp\n");
    assert.throws(() => verifyReleaseAssets(root), /exclusion file requires separate review/);
  });
}
test("sparse configuration rejects even when every fixture public file is present", (t) => {
  const root = fixture(t);
  command(root, ["config", "core.sparseCheckout", "true"]);
  assert.throws(() => verifyReleaseAssets(root), /sparse checkout is not a release source/);
});
test("physical source directory links/junctions are rejected", (t) => {
  const root = fixture(t);
  fs.renameSync(path.join(root, "public/flashcards"), path.join(root, "held-flashcards"));
  fs.symlinkSync(
    path.join(root, "held-flashcards"),
    path.join(root, "public/flashcards"),
    process.platform === "win32" ? "junction" : "dir",
  );
  assert.throws(
    () => verifyReleaseAssets(root),
    /tracked source asset is missing, unreadable or unsafe/,
  );
});
test("physical copied output directory links/junctions are rejected", (t) => {
  const root = fixture(t);
  fs.renameSync(path.join(root, ".output/public"), path.join(root, "held-output"));
  fs.symlinkSync(
    path.join(root, "held-output"),
    path.join(root, ".output/public"),
    process.platform === "win32" ? "junction" : "dir",
  );
  assert.throws(
    () => verifyReleaseAssets(root),
    /copied build asset is missing, unreadable or unsafe/,
  );
});
test("an LFS pointer is not mistaken for a deployable image even when committed", (t) => {
  const root = fixture(t);
  const pointer =
    "version https://git-lfs.github.com/spec/v1\noid sha256:" + "f".repeat(64) + "\nsize 100\n";
  write(root, "public/banner.webp", pointer);
  write(root, ".output/public/banner.webp", pointer);
  command(root, ["add", "--", "public"]);
  command(root, [
    "-c",
    `core.hooksPath=${path.join(root, "no-hooks")}`,
    "-c",
    "commit.gpgsign=false",
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "Synthetic pointer",
  ]);
  assert.throws(() => verifyReleaseAssets(root), /LFS-backed public files/);
});
test("non-repository and nested working directory reject without leaking local paths", (t) => {
  const root = fixture(t);
  assert.throws(
    () => verifyReleaseAssets(path.join(root, "public")),
    /repository root is unavailable or mismatched/,
  );
  assert.throws(
    () => verifyReleaseAssets(path.join(root, "no-directory")),
    /repository root is unavailable or mismatched/,
  );
});
test("nonregular tracked paths reject before reading their contents", (t) => {
  const root = fixture(t);
  fs.unlinkSync(path.join(root, "public/banner.webp"));
  fs.mkdirSync(path.join(root, "public/banner.webp"));
  assert.throws(
    () => verifyReleaseAssets(root),
    /tracked source asset is missing, unreadable or unsafe/,
  );
});
test("local per-file resource bound rejects without reading a large file", (t) => {
  const root = fixture(t);
  fs.truncateSync(path.join(root, "public/banner.webp"), 64 * 1024 * 1024 + 1);
  assert.throws(
    () => verifyReleaseAssets(root),
    /tracked source asset is missing, unreadable or unsafe/,
  );
});
test("a real HEAD change during verification rejects the result", (t) => {
  const root = fixture(t);
  const originalRead = fs.readFileSync;
  let changed = false;
  fs.readFileSync = function (target, ...args) {
    const bytes = originalRead.call(this, target, ...args);
    if (target === path.join(root, ".output/public/flashcards/data.json") && !changed) {
      changed = true;
      command(root, [
        "-c",
        `core.hooksPath=${path.join(root, "no-hooks")}`,
        "-c",
        "commit.gpgsign=false",
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.invalid",
        "commit",
        "--quiet",
        "--allow-empty",
        "-m",
        "Synthetic concurrent HEAD change",
      ]);
    }
    return bytes;
  };
  try {
    assert.throws(() => verifyReleaseAssets(root), /HEAD changed during verification/);
    assert.equal(changed, true);
  } finally {
    fs.readFileSync = originalRead;
  }
});
test("CLI has no sparse/bypass switch and does not expose private error/file contents", (t) => {
  const root = fixture(t);
  write(root, "public/banner.webp", "synthetic-private-value-do-not-print");
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ALLOW_SPARSE_RELEASE: "true" },
    timeout: 10000,
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Release assets blocked/);
  assert.ok(!result.stderr.includes(root));
  assert.doesNotMatch(result.stderr, /synthetic-private-value-do-not-print/);
  const bypass = spawnSync(process.execPath, [script, "--allow-sparse"], {
    cwd: root,
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(bypass.status, 1);
  assert.match(bypass.stderr, /no alternate-root or bypass/);
});
test("CI and both uploads run this guard before any Wrangler upload without weakening release controls", () => {
  const ci = load(fs.readFileSync(path.join(repo, ".github/workflows/ci.yml"), "utf8"));
  const deploy = load(fs.readFileSync(path.join(repo, ".github/workflows/deploy.yml"), "utf8"));
  assert.ok(
    ci.jobs.test.steps.some((s) =>
      s.run?.includes("node --test scripts/ci/verify-release-assets.test.mjs"),
    ),
  );
  const build = ci.jobs.build.steps;
  const guard = build.findIndex((s) =>
    s.run?.includes("node scripts/ci/verify-release-assets.mjs"),
  );
  assert.ok(guard > build.findIndex((s) => s.run === "npm run build"));
  assert.ok(guard < build.findIndex((s) => s.run?.includes("npx wrangler deploy --dry-run")));
  for (const job of [deploy.jobs.production, deploy.jobs.preview]) {
    const upload = job.steps.findIndex((s) => s.uses === "cloudflare/wrangler-action@v3");
    const verify = job.steps.findIndex((s) =>
      s.run?.includes("node scripts/ci/verify-release-assets.mjs"),
    );
    assert.ok(verify > job.steps.findIndex((s) => s.run === "npm run build"));
    assert.ok(verify < upload);
    assert.equal(job.steps[verify].if, "steps.cfg.outputs.ready == 'true'");
    assert.notEqual(job.steps[verify]["continue-on-error"], true);
    assert.ok(job.steps[verify].run.includes("node scripts/ci/verify-worker-bundle.mjs"));
  }
  assert.equal(deploy.jobs.production.environment.name, "production");
  assert.ok(deploy.jobs.production.needs.includes("migrations"));
});
