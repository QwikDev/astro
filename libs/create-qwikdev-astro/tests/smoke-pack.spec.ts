import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Assert } from "@japa/assert";
import { test } from "@japa/runner";

declare module "@japa/runner/core" {
  interface TestContext {
    assert: Assert;
  }
}

const root = "/tmp/qwik-astro-smoke-pack";
const pkgDir = join(import.meta.dirname!, "..");
const installDir = join(root, "install-test");
const pkgRoot = join(installDir, "node_modules", "@qwik.dev", "create-astro");
const cliPath = join(pkgRoot, "dist", "cli.mjs");

let tarball = "";

/**
 * Build, pack, and install the tarball once before all tests.
 * Runs eagerly at import time so the group.setup teardown is simple.
 */
function ensureBuiltPackage() {
  if (tarball) return;

  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });

  // Build
  execSync("npx tsdown", { cwd: pkgDir, stdio: "pipe" });

  // Pack — pnpm pack prints tarball contents then the path on the last line
  const packOutput = execSync("pnpm pack --pack-destination " + root, {
    cwd: pkgDir,
    encoding: "utf-8"
  }).trim();

  const lastLine = packOutput.split("\n").pop()!.trim();
  tarball = lastLine.startsWith("/") ? lastLine : join(root, lastLine);

  // Install tarball into a clean directory
  mkdirSync(installDir, { recursive: true });
  execSync("npm init -y", { cwd: installDir, stdio: "pipe" });
  execSync(`npm install "${tarball}"`, {
    cwd: installDir,
    stdio: "pipe",
    timeout: 60_000
  });
}

test.group("built-package smoke test", (group) => {
  group.setup(() => {
    ensureBuiltPackage();
    return () => rmSync(root, { recursive: true, force: true });
  });

  group.each.timeout(60_000);

  test("tarball was created", ({ assert }) => {
    assert.isTrue(existsSync(tarball), `tarball exists at ${tarball}`);
  });

  test("installed package has dist/ and stubs/", ({ assert }) => {
    assert.isTrue(existsSync(join(pkgRoot, "dist")), "dist/ exists");
    assert.isTrue(existsSync(join(pkgRoot, "stubs")), "stubs/ exists");
    assert.isTrue(existsSync(join(pkgRoot, "dist", "cli.mjs")), "dist/cli.mjs exists");
  });

  test("stubs/templates are present in installed package", ({ assert }) => {
    const stubsDir = join(pkgRoot, "stubs", "templates");
    assert.isTrue(existsSync(stubsDir), "stubs/templates/ exists");
    const templates = readdirSync(stubsDir);
    assert.isTrue(templates.length > 0, "at least one template exists");
  });

  test("Counter.tsx template is present in installed package", ({ assert }) => {
    const counterPath = join(
      pkgRoot,
      "stubs",
      "templates",
      "qwik-component",
      "Counter.tsx"
    );
    assert.isTrue(existsSync(counterPath), "Counter.tsx template exists");
  });

  test("CLI --help exits 0 from installed package", ({ assert }) => {
    const output = execSync(`node "${cliPath}" --help`, {
      encoding: "utf-8",
      timeout: 10_000
    });
    assert.isTrue(output.includes("create-astro"), "help mentions create-astro");
  });

  test("scaffoldQwikComponent from installed dist creates Counter.tsx with pragma", async ({
    assert
  }) => {
    // Discover the hashed scaffold chunk from the installed dist/
    const distDir = join(pkgRoot, "dist");
    const scaffoldChunk = readdirSync(distDir).find(
      (f) => f.startsWith("scaffold-") && f.endsWith(".mjs")
    );
    assert.isDefined(scaffoldChunk, "scaffold chunk found in dist/");

    // Dynamically import from the *installed* package — this exercises
    // the exact __dirname → ../stubs/templates/qwik-component/Counter.tsx
    // resolution path that previously broke due to a packaging regression.
    const scaffoldModule = await import(join(distDir, scaffoldChunk!));

    // Find the scaffoldQwikComponent export (minified name varies).
    // It's the only async function in the chunk (takes projectDir, strategy, dryRun).
    const scaffoldFn = Object.values(scaffoldModule).find(
      (v): v is (...args: any[]) => Promise<string> =>
        typeof v === "function" && v.constructor.name === "AsyncFunction"
    );
    assert.isDefined(scaffoldFn, "scaffoldQwikComponent function found in chunk");

    // Call with secondary strategy (includes pragma) on a temp dir
    const targetDir = join(root, "scaffold-test-project");
    mkdirSync(targetDir, { recursive: true });

    const strategy = {
      qwikIsPrimary: false,
      pragma: "/** @jsxImportSource @qwik.dev/core */",
      tsconfigSource: null
    };
    const counterPath = await scaffoldFn!(targetDir, strategy, false);

    // Assert Counter.tsx was created
    assert.isTrue(existsSync(counterPath), `Counter.tsx created at ${counterPath}`);

    // Assert content has pragma + template
    const content = readFileSync(counterPath, "utf-8");
    assert.isTrue(
      content.startsWith("/** @jsxImportSource @qwik.dev/core */"),
      "pragma is first line"
    );
    assert.isTrue(content.includes("component$"), "template content includes component$");
  });
});
