#!/usr/bin/env node
// Read-only tracked-public-file gate. No build, fetch, upload, credentials or
// asset repair. Passing is not approval, full bundle provenance or live QA.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

function fail(reason) {
  throw new Error(`Release assets blocked: ${reason}. Do not upload this artifact.`);
}

function git(root, args) {
  try {
    return execFileSync("git", ["-c", "protocol.allow=never", "-C", root, ...args], {
      encoding: "utf8",
      timeout: 10000,
      maxBuffer: 4 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        GIT_NO_LAZY_FETCH: "1",
        GIT_TERMINAL_PROMPT: "0",
        GIT_OPTIONAL_LOCKS: "0",
      },
    });
  } catch {
    fail("local Git metadata is unavailable; use a complete checkout");
  }
}

function validPublicPath(name) {
  return (
    name.startsWith("public/") &&
    !/[\\\x00-\x1f\x7f:<>"|?*\ufffd]/.test(name) &&
    name
      .split("/")
      .every(
        (part) =>
          part &&
          part !== "." &&
          part !== ".." &&
          !/[. ]$/.test(part) &&
          !/^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/iu.test(part),
      )
  );
}

export function parsePublicTree(raw, revision) {
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(revision) || !raw.endsWith("\0"))
    fail("invalid local tree metadata");
  const seen = new Set();
  const entries = raw
    .slice(0, -1)
    .split("\0")
    .map((line) => {
      const match = /^(100644|100755) blob ([a-f0-9]{40}|[a-f0-9]{64})\t(.+)$/u.exec(line);
      if (!match || match[2].length !== revision.length || !validPublicPath(match[3]))
        fail("unsupported or unsafe tracked public entry");
      const name = match[3];
      // A Windows checkout must not alias two distinct Git paths.
      const portableName = name.normalize("NFC").toLowerCase();
      if (seen.has(portableName)) fail("duplicate or case-colliding public paths");
      seen.add(portableName);
      return { name, oid: match[2] };
    });
  if (!entries.length) fail("no tracked public files");
  return entries;
}

function regularBytes(root, relative, label) {
  try {
    let cursor = root;
    const parts = relative.split("/");
    for (let i = 0; i < parts.length; i++) {
      cursor = path.join(cursor, parts[i]);
      const stat = fs.lstatSync(cursor);
      if (stat.isSymbolicLink()) fail(`${label} contains a link`);
      if (i < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())
        fail(`${label} is not a regular file`);
      // This is a local resource bound, not a claimed provider limit.
      if (i === parts.length - 1 && stat.size > 64 * 1024 * 1024)
        fail(`${label} exceeds this verifier's resource bound`);
    }
    return fs.readFileSync(cursor);
  } catch {
    // Never print private file contents, absolute paths or underlying errors.
    fail(`${label} is missing, unreadable or unsafe`);
  }
}

function assertNoExclusion(root, relative) {
  try {
    fs.lstatSync(path.join(root, ...relative.split("/")));
  } catch (error) {
    if (error.code === "ENOENT") return;
    fail("asset-exclusion state is unreadable");
  }
  fail("an asset exclusion file requires separate review");
}

export function verifyReleaseAssets(directory = process.cwd()) {
  let root;
  try {
    root = fs.realpathSync(path.resolve(directory));
    if (fs.realpathSync(git(root, ["rev-parse", "--show-toplevel"]).trim()) !== root)
      fail("run from the repository root");
  } catch {
    fail("repository root is unavailable or mismatched");
  }
  if (
    git(root, ["config", "--bool", "--get", "--default", "false", "core.sparseCheckout"]).trim() !==
    "false"
  )
    fail("sparse checkout is not a release source; restore the complete checkout");
  const revision = git(root, ["rev-parse", "--verify", "HEAD^{commit}"]).trim();
  const entries = parsePublicTree(
    git(root, ["ls-tree", "-r", "-z", "--full-tree", revision, "--", "public"]),
    revision,
  );

  let config;
  try {
    config = JSON.parse(
      regularBytes(root, ".output/server/wrangler.json", "build configuration").toString("utf8"),
    );
  } catch {
    fail("build configuration is missing, malformed or unsafe");
  }
  const assetDirectory = config?.assets?.directory;
  if (
    typeof assetDirectory !== "string" ||
    /[\x00-\x1f\x7f:]/.test(assetDirectory) ||
    path.posix.isAbsolute(assetDirectory.replaceAll("\\", "/")) ||
    path.resolve(root, ".output/server", assetDirectory.replaceAll("\\", "/")) !==
      path.join(root, ".output/public")
  )
    fail("the configured asset root is not the expected build output");

  assertNoExclusion(root, "public/.assetsignore");
  assertNoExclusion(root, ".output/public/.assetsignore");
  for (const { name, oid } of entries) {
    const source = regularBytes(root, name, "tracked source asset");
    if (
      source
        .subarray(0, 100)
        .toString("utf8")
        .startsWith("version https://git-lfs.github.com/spec/v1")
    )
      fail("LFS-backed public files require a separate hydrated-file contract");
    const algorithm = oid.length === 40 ? "sha1" : "sha256";
    const actualOid = createHash(algorithm)
      .update(`blob ${source.length}\0`)
      .update(source)
      .digest("hex");
    if (actualOid !== oid) fail("a tracked source asset differs from HEAD");
    const output = regularBytes(root, `.output/${name}`, "copied build asset");
    if (!source.equals(output)) fail("a copied build asset differs from the tracked source");
  }
  if (git(root, ["rev-parse", "--verify", "HEAD^{commit}"]).trim() !== revision)
    fail("HEAD changed during verification");
  return { revision, trackedPublicFiles: entries.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 2) fail("no alternate-root or bypass arguments are supported");
    const result = verifyReleaseAssets();
    console.log(
      `Tracked release assets verified: ${result.trackedPublicFiles} files at ${result.revision}`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
