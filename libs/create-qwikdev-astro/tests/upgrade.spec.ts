import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "@japa/runner";
import { emptyDirSync, ensureDirSync } from "fs-extra";
import pm from "panam";
import { ProgramTester } from "../src/tester.js";
import upgradeApp, { defaultUpgradeDefinition } from "../src/upgrade.js";
import { stripJsonComments } from "../src/utils.js";

process.env.NODE_ENV = "test";
process.env.CI = "1";

const root = "/tmp/qwik-astro-test-upgrade";
const upgradeProject = "upgrade-test";

const upgradeTester = new ProgramTester(upgradeApp);

/**
 * Scaffold a minimal old-style Qwik + Astro project for upgrade testing.
 * Uses old package names (@builder.io/qwik, @qwikdev/astro) so the
 * upgrade command has real work to do.
 */
function scaffoldOldProject(dir: string): void {
  ensureDirSync(dir);

  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: "upgrade-test-fixture",
        version: "0.0.1",
        dependencies: {
          astro: "^4.16.0",
          "@builder.io/qwik": "^1.19.0",
          "@qwikdev/astro": "^0.5.16"
        }
      },
      null,
      2
    )
  );

  writeFileSync(
    join(dir, "astro.config.mjs"),
    `import { defineConfig } from "astro/config";
import qwikdev from "@qwikdev/astro";

export default defineConfig({
  integrations: [qwikdev()],
});
`
  );

  // Use JSONC format (JSON with comments) to exercise the stripJsonComments path
  writeFileSync(
    join(dir, "tsconfig.json"),
    `{
  // This is a JSONC comment that must not break parsing
  "compilerOptions": {
    "jsxImportSource": "@builder.io/qwik",
    "strict": true
  }
}`
  );

  const srcDir = join(dir, "src", "components");
  mkdirSync(srcDir, { recursive: true });

  writeFileSync(
    join(srcDir, "counter.tsx"),
    `import { component$, useSignal } from "@builder.io/qwik";

export const Counter = component$(() => {
  const count = useSignal(0);
  return <button onClick$={() => count.value++}>{count.value}</button>;
});
`
  );

  writeFileSync(
    join(srcDir, "app.tsx"),
    `/** @jsxImportSource @builder.io/qwik */
import { component$ } from "@builder.io/qwik";
import { Counter } from "./counter";

export const App = component$(() => {
  return <Counter />;
});
`
  );

  const pagesDir = join(dir, "src", "pages");
  mkdirSync(pagesDir, { recursive: true });

  writeFileSync(
    join(pagesDir, "index.astro"),
    `---
import { Counter } from "../components/counter";
---
<html>
  <body>
    <Counter client:visible />
  </body>
</html>
`
  );
}

test.group("upgrade command parsing", () => {
  test("default definition", ({ assert }) => {
    const def = upgradeTester.parse([]);
    assert.isTrue(def.has("directory", "dryRun"));
    assert.isTrue(def.get("directory").isString());
    assert.isTrue(def.get("directory").equals("."));
    assert.isTrue(def.get("directory").equals(defaultUpgradeDefinition.directory));
  });

  test("directory argument", ({ assert }) => {
    const def = upgradeTester.parse(["./my-project"]);
    assert.isTrue(def.get("directory").equals("./my-project"));
  });

  test("--dry-run option", ({ assert }) => {
    const def = upgradeTester.parse(["--dry-run"]);
    assert.isTrue(def.get("dryRun").isBoolean());
    assert.isTrue(def.get("dryRun").isTrue());
  });

  test("--yes option", ({ assert }) => {
    const def = upgradeTester.parse(["--yes"]);
    assert.isTrue(def.get("yes").isTrue());
  });

  test("--no option", ({ assert }) => {
    const def = upgradeTester.parse(["--no"]);
    assert.isTrue(def.get("no").isTrue());
  });

  test("combined: directory + --dry-run + --yes", ({ assert }) => {
    const def = upgradeTester.parse(["./proj", "--dry-run", "--yes"]);
    assert.isTrue(def.get("directory").equals("./proj"));
    assert.isTrue(def.get("dryRun").isTrue());
    assert.isTrue(def.get("yes").isTrue());
  });
});

test.group("upgrade rewrite execution", (group) => {
  const projectDir = join(root, upgradeProject);

  group.each.setup(() => {
    ensureDirSync(root);
    scaffoldOldProject(projectDir);

    return () => emptyDirSync(projectDir);
  });

  test("rewrites astro.config imports", async ({ assert }) => {
    const { rewriteAstroConfig } = await import("../src/upgrade-rewrite.js");
    const absDir = projectDir;

    const result = rewriteAstroConfig(absDir, false);
    assert.isTrue(result.changed);
    assert.isDefined(result.filePath);

    const configContent = readFileSync(join(projectDir, "astro.config.mjs"), "utf-8");
    assert.isTrue(configContent.includes("@qwik.dev/astro"));
    assert.isFalse(configContent.includes("@qwikdev/astro"));
  });

  test("rewrites tsconfig jsxImportSource", async ({ assert }) => {
    const { rewriteTsconfig } = await import("../src/upgrade-rewrite.js");
    const absDir = projectDir;

    const result = rewriteTsconfig(absDir, false);
    assert.isTrue(result.changed);
    assert.equal(result.oldValue, "@builder.io/qwik");
    assert.equal(result.newValue, "@qwik.dev/core");

    const tsconfig = JSON.parse(readFileSync(join(projectDir, "tsconfig.json"), "utf-8"));
    assert.equal(tsconfig.compilerOptions.jsxImportSource, "@qwik.dev/core");
  });

  test("rewriteTsconfig handles JSONC comments in tsconfig", async ({ assert }) => {
    const { rewriteTsconfig } = await import("../src/upgrade-rewrite.js");
    const tmpDir = join(root, "jsonc-test");
    ensureDirSync(tmpDir);

    // Write a tsconfig with JSONC comments (not valid JSON)
    writeFileSync(
      join(tmpDir, "tsconfig.json"),
      `{
  // JSONC comment — must not cause JSON.parse failure
  "compilerOptions": {
    "jsxImportSource": "@builder.io/qwik"
  }
}`
    );

    const result = rewriteTsconfig(tmpDir, false);
    assert.isTrue(result.changed, "rewriteTsconfig should succeed on JSONC input");
    assert.equal(result.oldValue, "@builder.io/qwik");
    assert.equal(result.newValue, "@qwik.dev/core");

    const written = JSON.parse(readFileSync(join(tmpDir, "tsconfig.json"), "utf-8"));
    assert.equal(written.compilerOptions.jsxImportSource, "@qwik.dev/core");
  });

  test("rewrites source file imports", async ({ assert }) => {
    const { rewriteImports } = await import("../src/upgrade-rewrite.js");
    const absDir = projectDir;

    const result = rewriteImports(absDir, false);
    assert.isTrue(result.changedFiles.length >= 1);

    const counterContent = readFileSync(
      join(projectDir, "src", "components", "counter.tsx"),
      "utf-8"
    );
    assert.isFalse(counterContent.includes("@builder.io/qwik"));
    assert.isTrue(counterContent.includes("@qwik.dev/core"));
  });

  test("rewrites @jsxImportSource pragma comments", async ({ assert }) => {
    const { rewritePragmaComments } = await import("../src/upgrade-rewrite.js");
    const absDir = projectDir;

    const result = rewritePragmaComments(absDir, false);
    assert.isTrue(result.changedFiles.length >= 1);

    const appContent = readFileSync(
      join(projectDir, "src", "components", "app.tsx"),
      "utf-8"
    );
    assert.isFalse(appContent.includes("@jsxImportSource @builder.io/qwik"));
    assert.isTrue(appContent.includes("@jsxImportSource @qwik.dev/core"));
  });

  test("dry-run does not modify files", async ({ assert }) => {
    const { rewriteAstroConfig, rewriteTsconfig, rewriteImports, rewritePragmaComments } =
      await import("../src/upgrade-rewrite.js");
    const absDir = projectDir;

    rewriteAstroConfig(absDir, true);
    rewriteTsconfig(absDir, true);
    rewriteImports(absDir, true);
    rewritePragmaComments(absDir, true);

    const configContent = readFileSync(join(projectDir, "astro.config.mjs"), "utf-8");
    assert.isTrue(configContent.includes("@qwikdev/astro"));

    // The fixture uses JSONC (comments) — check the raw text to avoid JSON.parse failure
    const tsconfigContent = readFileSync(join(projectDir, "tsconfig.json"), "utf-8");
    assert.isTrue(tsconfigContent.includes('"@builder.io/qwik"'));

    const counterContent = readFileSync(
      join(projectDir, "src", "components", "counter.tsx"),
      "utf-8"
    );
    assert.isTrue(counterContent.includes("@builder.io/qwik"));
  });
});

test.group("upgrade full execution with package install", (group) => {
  const projectDir = join(root, upgradeProject);

  group.each.setup(() => {
    ensureDirSync(root);
    scaffoldOldProject(projectDir);

    return () => emptyDirSync(projectDir);
  });

  test("full upgrade swaps packages and rewrites files", async ({ assert }) => {
    const absDir = projectDir;

    // Install deps so pm.remove/pm.add have a real project to work with
    await pm.install({ cwd: absDir });

    const result = await upgradeTester.execute({
      directory: projectDir,
      absDir,
      dryRun: false,
      hasOldQwik: true,
      hasNewQwik: false
    } as any);

    assert.isTrue(
      result.isSuccess(),
      `Expected upgrade to succeed but got exit code: ${result.result}`
    );

    const configContent = readFileSync(join(projectDir, "astro.config.mjs"), "utf-8");
    assert.isTrue(configContent.includes("@qwik.dev/astro"));
    assert.isFalse(configContent.includes("@qwikdev/astro"));

    const tsconfig = JSON.parse(
      stripJsonComments(readFileSync(join(projectDir, "tsconfig.json"), "utf-8"))
    );
    assert.equal(tsconfig.compilerOptions.jsxImportSource, "@qwik.dev/core");

    const counterContent = readFileSync(
      join(projectDir, "src", "components", "counter.tsx"),
      "utf-8"
    );
    assert.isTrue(counterContent.includes("@qwik.dev/core"));
    assert.isFalse(counterContent.includes("@builder.io/qwik"));

    const pkgJson = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf-8"));
    const allDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
    assert.isFalse("@builder.io/qwik" in allDeps);
    assert.isFalse("@qwikdev/astro" in allDeps);
  }).disableTimeout();
});
